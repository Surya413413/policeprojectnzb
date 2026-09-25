import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

import app from "../firebase/config";

/* =========================================================
   POLICESETU AI
   Gemini Case Analysis Service
   ========================================================= */

const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});

const model = getGenerativeModel(ai, {
  model: "gemini-3.6-flash",
});

/* =========================================================
   DATA URL HELPERS
   ========================================================= */

/**
 * Converts:
 *
 * data:audio/webm;codecs=opus;base64,AAAA....
 *
 * into:
 *
 * AAAA....
 */
const removeDataUrlPrefix = (data) => {
  if (!data || typeof data !== "string") {
    return "";
  }

  // If it is already raw Base64
  if (!data.startsWith("data:")) {
    return data.trim();
  }

  const commaIndex = data.indexOf(",");

  if (commaIndex === -1) {
    return data.trim();
  }

  return data.substring(commaIndex + 1).trim();
};

/**
 * Get MIME type from a Data URL.
 */
const getMimeType = (data, fallback = "application/octet-stream") => {
  if (!data || typeof data !== "string") {
    return fallback;
  }

  if (!data.startsWith("data:")) {
    return fallback;
  }

  const match = data.match(/^data:([^;,]+)/);

  return match?.[1] || fallback;
};

/**
 * Clean Base64 before sending to Gemini.
 *
 * Removes:
 * - data URL prefix
 * - whitespace
 * - accidental quotes
 */
const cleanBase64 = (data) => {
  if (!data || typeof data !== "string") {
    return "";
  }

  let cleaned = removeDataUrlPrefix(data);

  cleaned = cleaned
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .replace(/\s/g, "");

  return cleaned;
};

/* =========================================================
   ANALYSIS TEXT PARSER
   ========================================================= */

const extractSection = (text, heading, nextHeadings = []) => {
  if (!text) return "";

  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let nextPattern = "";

  if (nextHeadings.length > 0) {
    const escapedNext = nextHeadings.map((item) =>
      item.replace(/[.*+?^${}()|[\]\\]/g, "\\$"),
    );

    nextPattern = `(?=${escapedNext.join("|")}|$)`;
  } else {
    nextPattern = "$";
  }

  const regex = new RegExp(
    `${escapedHeading}\\s*:?\\s*([\\s\\S]*?)${nextPattern}`,
    "i",
  );

  const match = text.match(regex);

  return match?.[1]?.trim() || "";
};

const parseAnalysis = (text) => {
  const headings = [
    "TRANSCRIPT",
    "DOCUMENT TEXT",
    "PROBLEM SUMMARY",
    "EVIDENCE SUMMARY",
    "POTENTIALLY RELEVANT LEGAL PROVISIONS",
    "SUGGESTED POLICE ACTIONS",
    "CONFIDENCE",
    "LIMITATIONS",
  ];

  return {
    transcript: extractSection(text, "TRANSCRIPT", headings.slice(1)),

    documentText: extractSection(text, "DOCUMENT TEXT", headings.slice(2)),

    problemSummary: extractSection(text, "PROBLEM SUMMARY", headings.slice(3)),

    evidenceSummary: extractSection(
      text,
      "EVIDENCE SUMMARY",
      headings.slice(4),
    ),

    legalReferences: extractSection(
      text,
      "POTENTIALLY RELEVANT LEGAL PROVISIONS",
      headings.slice(5),
    ),

    suggestedActions: extractSection(
      text,
      "SUGGESTED POLICE ACTIONS",
      headings.slice(6),
    ),

    confidence: extractSection(text, "CONFIDENCE", headings.slice(7)),

    limitations: extractSection(text, "LIMITATIONS", []),

    rawText: text || "",
  };
};

/* =========================================================
   MAIN AI ANALYSIS
   ========================================================= */

export const analyzePoliceCase = async ({
  visitor,
  visit,
  voiceData,
  documentData,
  documentName,
  documentType,
}) => {
  try {
    console.log("========================================");
    console.log("POLICESETU AI CASE ANALYSIS");
    console.log("========================================");

    console.log("Visitor:", visitor);
    console.log("Visit:", visit);
    console.log("Voice available:", Boolean(voiceData));
    console.log("Document available:", Boolean(documentData));

    if (!voiceData && !documentData) {
      return {
        success: false,
        error: "No voice recording or supporting document found.",
      };
    }

    /* =====================================================
       CLEAN AUDIO
       ===================================================== */

    let audioBase64 = "";
    let audioMimeType = "";

    if (voiceData) {
      audioBase64 = cleanBase64(voiceData);

      audioMimeType = getMimeType(voiceData, "audio/webm");

      console.log("Audio MIME type:", audioMimeType);

      console.log("Audio Base64 length:", audioBase64.length);

      console.log("Audio starts with:", audioBase64.substring(0, 30));

      /*
       * IMPORTANT
       *
       * Gemini must receive ONLY the Base64 data here.
       *
       * NOT:
       * data:audio/webm;base64,AAAA...
       *
       * YES:
       * AAAA...
       */
      if (audioBase64.startsWith("data:")) {
        throw new Error("Audio Base64 still contains a Data URL prefix.");
      }
    }

    /* =====================================================
       CLEAN DOCUMENT
       ===================================================== */

    let documentBase64 = "";
    let documentMimeType = "";

    if (documentData) {
      documentBase64 = cleanBase64(documentData);

      documentMimeType = getMimeType(
        documentData,
        documentType || "application/octet-stream",
      );

      console.log("Document MIME type:", documentMimeType);

      console.log("Document Base64 length:", documentBase64.length);

      if (documentBase64.startsWith("data:")) {
        throw new Error("Document Base64 still contains a Data URL prefix.");
      }
    }

    /* =====================================================
       CASE INFORMATION
       ===================================================== */

    const visitorName = visitor?.fullName || visitor?.name || "Unknown";

    const mobile = visitor?.mobileNumber || visitor?.mobile || "Not provided";

    const address = visitor?.address || "Not provided";

    const purpose = visit?.purpose || "Not provided";

    const visitCode = visit?.visitCode || "Not provided";

    const visitorCode =
      visitor?.visitorCode || visit?.visitorCode || "Not provided";

    /* =====================================================
       AI PROMPT
       ===================================================== */

    const prompt = `
You are PoliceSetu AI, an AI assistant for a police officer.

Analyze the visitor's recorded statement and any supporting document.

Your job is to help the police officer understand the reported problem and organize the available evidence.

IMPORTANT RULES:

1. Do not invent facts.
2. Do not assume facts that are not present.
3. Clearly distinguish what the visitor said from what the document shows.
4. Do not make a final determination that a crime or offence occurred.
5. Do not make a final legal determination.
6. Do not decide whether an FIR should be registered.
7. Do not decide whether someone should be arrested.
8. Legal provisions must be described only as potentially relevant provisions for officer verification.
9. The investigating officer must independently verify all legal provisions and facts.
10. If evidence is unclear, explicitly say so.
11. If the recording cannot be understood, mention that.
12. If the document cannot be read, mention that.
13. Do not fabricate a transcript.
14. Do not fabricate document text.

VISITOR INFORMATION:

Name: ${visitorName}
Mobile: ${mobile}
Address: ${address}
Visitor Code: ${visitorCode}

VISIT INFORMATION:

Visit Code: ${visitCode}
Purpose: ${purpose}

DOCUMENT:

File Name: ${documentName || "Not provided"}
File Type: ${documentMimeType || "Not provided"}

Analyze the provided voice recording and document.

Return the result using EXACTLY these headings:

TRANSCRIPT

DOCUMENT TEXT

PROBLEM SUMMARY

EVIDENCE SUMMARY

POTENTIALLY RELEVANT LEGAL PROVISIONS

SUGGESTED POLICE ACTIONS

CONFIDENCE

LIMITATIONS

For SUGGESTED POLICE ACTIONS, provide practical investigation or administrative next steps such as:

- verify identity
- verify dates and locations
- collect additional statements
- obtain relevant records
- preserve evidence
- contact relevant persons
- cross-check documents
- refer the matter to the appropriate officer/unit

Do not present these actions as mandatory legal instructions.

For legal provisions, mention only provisions that appear potentially relevant based on the available information and explicitly state that the officer must verify applicability.

Keep the analysis factual and evidence-based.
`;

    /* =====================================================
       GEMINI CONTENT PARTS
       ===================================================== */

    const parts = [
      {
        text: prompt,
      },
    ];

    /* =====================================================
       ADD AUDIO
       ===================================================== */

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType || "audio/webm",
          data: audioBase64,
        },
      });

      console.log("Audio added to Gemini request.");
    }

    /* =====================================================
       ADD DOCUMENT
       ===================================================== */

    if (documentBase64) {
      parts.push({
        inlineData: {
          mimeType: documentMimeType || "application/octet-stream",
          data: documentBase64,
        },
      });

      console.log("Document added to Gemini request.");
    }

    console.log(
      "Gemini parts:",
      parts.map((part) => ({
        type: part.text ? "text" : part.inlineData?.mimeType || "unknown",
        base64Length: part.inlineData?.data?.length || 0,
      })),
    );

    /* =====================================================
       GEMINI REQUEST
       ===================================================== */

    const result = await model.generateContent(parts);

    const response = result.response;

    const text = response.text();

    console.log("POLICESETU AI response received.");

    console.log(text);

    /* =====================================================
       PARSE RESULT
       ===================================================== */

    const parsedAnalysis = parseAnalysis(text);

    return {
      success: true,
      analysis: parsedAnalysis,
    };
  } catch (error) {
    console.error("POLICESETU AI Case Analysis Error:", error);

    return {
      success: false,
      error: error?.message || "AI case analysis failed.",
    };
  }
};

import React, { useEffect, useRef, useState } from "react";

import { updateVisit } from "../../services/visitorService";
import { analyzePoliceCase } from "../../services/aiCaseService";
import PoliceCaseAction from "./PoliceCaseAction";

import "../../styles/PoliceCaseEvidence.css";

const MAX_FILE_SIZE = 600 * 1024;
const MAX_TOTAL_EVIDENCE_SIZE = 900 * 1024;

const createEvidenceId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));

    reader.readAsDataURL(file);
  });

const dataUrlSize = (value = "") => {
  if (!value || typeof value !== "string") return 0;

  const commaIndex = value.indexOf(",");
  const base64 = commaIndex >= 0 ? value.slice(commaIndex + 1) : value;

  return Math.ceil((base64.length * 3) / 4);
};

const normalizeVoiceEvidence = (visit) => {
  if (Array.isArray(visit?.voiceEvidence)) {
    return visit.voiceEvidence;
  }

  // Backward compatibility with the old single voiceData field.
  if (visit?.voiceData) {
    return [
      {
        id: "legacy-voice",
        name: "Previous voice statement",
        data: visit.voiceData,
        type: "audio/webm",
        duration: 0,
      },
    ];
  }

  return [];
};

const normalizeDocumentEvidence = (visit) => {
  if (Array.isArray(visit?.documentEvidence)) {
    return visit.documentEvidence;
  }

  // Backward compatibility with the old single documentData field.
  if (visit?.documentData) {
    return [
      {
        id: "legacy-document",
        name: visit.documentName || "Supporting document",
        data: visit.documentData,
        type: visit.documentType || "application/octet-stream",
        source: "upload",
      },
    ];
  }

  return [];
};

const PoliceCaseEvidence = ({ visit, onUpdated }) => {
  const documentInputRef = useRef(null);
  const scanInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const [voiceEvidence, setVoiceEvidence] = useState(() =>
    normalizeVoiceEvidence(visit),
  );

  const [documentEvidence, setDocumentEvidence] = useState(() =>
    normalizeDocumentEvidence(visit),
  );

  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [analysis, setAnalysis] = useState({
    status: visit?.aiStatus || "",
    transcript: visit?.aiTranscript || "",
    documentText: visit?.aiDocumentText || "",
    problemSummary: visit?.aiProblemSummary || "",
    evidenceSummary: visit?.aiEvidenceSummary || "",
    legalReferences: visit?.aiLegalReferences || "",
    suggestedActions: visit?.aiSuggestedActions || "",
    confidence: visit?.aiConfidence || "",
    analyzedAt: visit?.aiAnalyzedAt || null,
  });

  // =========================================================
  // SYNC WHEN A DIFFERENT VISIT IS OPENED
  // =========================================================

  useEffect(() => {
    setVoiceEvidence(normalizeVoiceEvidence(visit));
    setDocumentEvidence(normalizeDocumentEvidence(visit));

    setAnalysis({
      status: visit?.aiStatus || "",
      transcript: visit?.aiTranscript || "",
      documentText: visit?.aiDocumentText || "",
      problemSummary: visit?.aiProblemSummary || "",
      evidenceSummary: visit?.aiEvidenceSummary || "",
      legalReferences: visit?.aiLegalReferences || "",
      suggestedActions: visit?.aiSuggestedActions || "",
      confidence: visit?.aiConfidence || "",
      analyzedAt: visit?.aiAnalyzedAt || null,
    });
  }, [visit?.id]);

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // =========================================================
  // TOTAL EVIDENCE SIZE
  // =========================================================

  const totalEvidenceSize = [...voiceEvidence, ...documentEvidence].reduce(
    (total, item) => total + dataUrlSize(item.data),
    0,
  );

  const hasEvidence = voiceEvidence.length > 0 || documentEvidence.length > 0;

  // =========================================================
  // RECORDING TIME
  // =========================================================

  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  // =========================================================
  // START RECORDING
  // =========================================================

  const startRecording = async () => {
    setError("");
    setSuccess("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Voice recording is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      let recorder;

      try {
        recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("An error occurred while recording voice.");
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioBlob.size > MAX_FILE_SIZE) {
          setError(
            "This voice recording is larger than 600 KB. Please record a shorter statement.",
          );

          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const reader = new FileReader();

        reader.onloadend = () => {
          const data = reader.result;

          const newItem = {
            id: createEvidenceId(),
            name: `Voice Statement ${voiceEvidence.length + 1}`,
            data,
            type: recorder.mimeType || "audio/webm",
            duration: recordingSeconds,
            createdAt: new Date().toISOString(),
          };

          const newTotal = totalEvidenceSize + dataUrlSize(data);

          if (newTotal > MAX_TOTAL_EVIDENCE_SIZE) {
            setError(
              "Total evidence is approaching the Firestore document limit. Please remove some evidence or move file storage to Firebase Storage.",
            );
            return;
          }

          setVoiceEvidence((previous) => [...previous, newItem]);
          setSuccess("Voice statement added.");
        };

        reader.onerror = () => {
          setError("Unable to process the voice recording.");
        };

        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();

      setRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch (err) {
      console.error("Voice recording error:", err);

      setError(
        "Unable to access microphone. Please allow microphone permission.",
      );
    }
  };

  // =========================================================
  // STOP RECORDING
  // =========================================================

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // =========================================================
  // REMOVE VOICE
  // =========================================================

  const removeVoice = (id) => {
    setVoiceEvidence((previous) => previous.filter((item) => item.id !== id));
  };

  // =========================================================
  // UPLOAD MULTIPLE DOCUMENTS
  // =========================================================

  const addDocumentFiles = async (files) => {
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length) return;

    setError("");
    setSuccess("");

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    const newDocuments = [];

    try {
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `${file.name} is larger than 600 KB. Please select a smaller file.`,
          );
        }

        if (!allowedTypes.includes(file.type)) {
          throw new Error(
            `${file.name}: only PDF, JPG and PNG files are supported.`,
          );
        }

        const data = await fileToDataUrl(file);

        newDocuments.push({
          id: createEvidenceId(),
          name: file.name,
          data,
          type: file.type,
          source: "upload",
          createdAt: new Date().toISOString(),
        });
      }

      const newTotal =
        totalEvidenceSize +
        newDocuments.reduce((total, item) => total + dataUrlSize(item.data), 0);

      if (newTotal > MAX_TOTAL_EVIDENCE_SIZE) {
        throw new Error(
          "Total evidence is too large for the temporary Firestore Base64 approach. Use Firebase Storage for multiple large files.",
        );
      }

      setDocumentEvidence((previous) => [...previous, ...newDocuments]);
      setSuccess(`${newDocuments.length} document(s) added.`);
    } catch (err) {
      console.error("Document upload error:", err);
      setError(err?.message || "Unable to upload document.");
    }
  };

  const handleDocumentChange = async (event) => {
    await addDocumentFiles(event.target.files);
    event.target.value = "";
  };

  // =========================================================
  // MOBILE DOCUMENT SCANNER
  // =========================================================

  const handleScanDocument = async (event) => {
    setScanning(true);
    setError("");
    setSuccess("");

    try {
      const file = event.target.files?.[0];

      if (!file) {
        setScanning(false);
        return;
      }

      if (!file.type.startsWith("image/")) {
        throw new Error("Document scanner accepts an image from the camera.");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          "Scanned document is larger than 600 KB. Please capture a clearer but smaller image.",
        );
      }

      const data = await fileToDataUrl(file);

      const newDocument = {
        id: createEvidenceId(),
        name: `Scanned Document ${documentEvidence.length + 1}.jpg`,
        data,
        type: file.type || "image/jpeg",
        source: "scanner",
        createdAt: new Date().toISOString(),
      };

      const newTotal = totalEvidenceSize + dataUrlSize(newDocument.data);

      if (newTotal > MAX_TOTAL_EVIDENCE_SIZE) {
        throw new Error(
          "Total evidence is too large for temporary Firestore storage. Use Firebase Storage for multiple scanned pages.",
        );
      }

      setDocumentEvidence((previous) => [...previous, newDocument]);
      setSuccess("Scanned document page added.");
    } catch (err) {
      console.error("Document scan error:", err);
      setError(err?.message || "Unable to scan document.");
    } finally {
      setScanning(false);
      event.target.value = "";
    }
  };

  // =========================================================
  // REMOVE DOCUMENT
  // =========================================================

  const removeDocument = (id) => {
    setDocumentEvidence((previous) =>
      previous.filter((item) => item.id !== id),
    );
  };

  // =========================================================
  // OPEN DOCUMENT
  // =========================================================

  const openDocument = (item) => {
    if (!item?.data) return;

    const newWindow = window.open("", "_blank");

    if (!newWindow) {
      setError("Please allow pop-ups to open the document.");
      return;
    }

    if (item.type?.startsWith("image/")) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${item.name || "Scanned Document"}</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #f4f7fb;
              }
              img {
                max-width: 96vw;
                max-height: 96vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${item.data}" alt="Supporting document" />
          </body>
        </html>
      `);

      newWindow.document.close();
    } else {
      newWindow.location.href = item.data;
    }
  };

  // =========================================================
  // DOWNLOAD DOCUMENT
  // =========================================================

  const downloadDocument = (item) => {
    if (!item?.data) return;

    const link = document.createElement("a");

    link.href = item.data;
    link.download = item.name || "supporting-document";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================
  // SAVE EVIDENCE
  // =========================================================

  const handleSaveEvidence = async () => {
    setError("");
    setSuccess("");

    if (!visit?.id) {
      setError("Visit information is missing.");
      return;
    }

    if (!hasEvidence) {
      setError("Please add at least one voice recording or document.");
      return;
    }

    if (totalEvidenceSize > MAX_TOTAL_EVIDENCE_SIZE) {
      setError(
        "Evidence is too large for Firestore Base64 storage. Please use Firebase Storage.",
      );
      return;
    }

    try {
      setSaving(true);

      await updateVisit(visit.id, {
        // New multiple-evidence fields
        voiceEvidence,
        documentEvidence,

        // Keep old fields for backward compatibility
        voiceData: voiceEvidence[0]?.data || "",
        documentData: documentEvidence[0]?.data || "",
        documentName: documentEvidence[0]?.name || "",
        documentType: documentEvidence[0]?.type || "",
      });

      const updatedVisit = {
        ...visit,
        voiceEvidence,
        documentEvidence,
        voiceData: voiceEvidence[0]?.data || "",
        documentData: documentEvidence[0]?.data || "",
        documentName: documentEvidence[0]?.name || "",
        documentType: documentEvidence[0]?.type || "",
      };

      setSuccess("All evidence saved successfully.");

      if (onUpdated) {
        onUpdated(updatedVisit);
      }
    } catch (err) {
      console.error("Save evidence error:", err);
      setError(err?.message || "Unable to save evidence.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // AI ANALYSIS
  // =========================================================

  const handleAnalyzeWithAI = async () => {
    setError("");
    setSuccess("");

    if (!visit?.id) {
      setError("Visit information is missing.");
      return;
    }

    if (!hasEvidence) {
      setError("Please add voice or document evidence first.");
      return;
    }

    try {
      setAnalyzing(true);

      const result = await analyzePoliceCase({
        visit: {
          ...visit,
          voiceEvidence,
          documentEvidence,
          voiceData: voiceEvidence[0]?.data || "",
          documentData: documentEvidence[0]?.data || "",
        },

        // New multi-file payload
        voiceEvidence,
        documentEvidence,

        // Backward-compatible first items
        voiceData: voiceEvidence[0]?.data || "",
        documentData: documentEvidence[0]?.data || "",
        documentName: documentEvidence[0]?.name || "",
        documentType: documentEvidence[0]?.type || "",
      });

      console.log("FULL AI RESULT:", result);

      if (!result?.success) {
        throw new Error(result?.error || "AI case analysis failed.");
      }

      const aiAnalysis = {
        status: "ANALYZED",
        transcript: result.analysis?.transcript || "",
        documentText: result.analysis?.documentText || "",
        problemSummary: result.analysis?.problemSummary || "",
        evidenceSummary: result.analysis?.evidenceSummary || "",
        legalReferences: result.analysis?.legalReferences || "",
        suggestedActions: result.analysis?.suggestedActions || "",
        confidence: result.analysis?.confidence || "",
        analyzedAt: new Date(),
      };

      setAnalysis(aiAnalysis);

      await updateVisit(visit.id, {
        aiStatus: aiAnalysis.status,
        aiTranscript: aiAnalysis.transcript,
        aiDocumentText: aiAnalysis.documentText,
        aiProblemSummary: aiAnalysis.problemSummary,
        aiEvidenceSummary: aiAnalysis.evidenceSummary,
        aiLegalReferences: aiAnalysis.legalReferences,
        aiSuggestedActions: aiAnalysis.suggestedActions,
        aiConfidence: aiAnalysis.confidence,
        aiAnalyzedAt: aiAnalysis.analyzedAt,

        voiceEvidence,
        documentEvidence,
        voiceData: voiceEvidence[0]?.data || "",
        documentData: documentEvidence[0]?.data || "",
        documentName: documentEvidence[0]?.name || "",
        documentType: documentEvidence[0]?.type || "",
      });

      setSuccess("AI case analysis completed successfully.");

      // Parent receives the complete current visit, including AI result.
      if (onUpdated) {
        onUpdated({
          ...visit,
          voiceEvidence,
          documentEvidence,
          voiceData: voiceEvidence[0]?.data || "",
          documentData: documentEvidence[0]?.data || "",
          documentName: documentEvidence[0]?.name || "",
          documentType: documentEvidence[0]?.type || "",
          aiStatus: aiAnalysis.status,
          aiTranscript: aiAnalysis.transcript,
          aiDocumentText: aiAnalysis.documentText,
          aiProblemSummary: aiAnalysis.problemSummary,
          aiEvidenceSummary: aiAnalysis.evidenceSummary,
          aiLegalReferences: aiAnalysis.legalReferences,
          aiSuggestedActions: aiAnalysis.suggestedActions,
          aiConfidence: aiAnalysis.confidence,
          aiAnalyzedAt: aiAnalysis.analyzedAt,
        });
      }
    } catch (err) {
      console.error("POLICESETU AI ERROR:", err);
      setError(err?.message || "Unable to complete AI case analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================================
  // FORMAT ANALYSIS DATE
  // =========================================================

  const formatAnalysisDate = (timestamp) => {
    if (!timestamp) return "";

    try {
      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().toLocaleString("en-IN");
      }

      return new Date(timestamp).toLocaleString("en-IN");
    } catch {
      return "";
    }
  };

  const hasAnalysis = Boolean(
    analysis.status ||
    analysis.transcript ||
    analysis.documentText ||
    analysis.problemSummary ||
    analysis.evidenceSummary ||
    analysis.legalReferences ||
    analysis.suggestedActions ||
    analysis.confidence,
  );

  return (
    <div className="police-case-evidence">
      {/* HEADER */}
      <div className="case-evidence-header">
        <div className="case-evidence-heading">
          <div className="case-evidence-number">03</div>

          <div>
            <h2>Case Evidence</h2>
            <p>
              Add multiple voice statements, supporting documents and scanned
              document pages.
            </p>
          </div>
        </div>

        <div className="evidence-security">Police Officer</div>
      </div>

      {/* VISIT INFORMATION */}
      <div className="case-visit-reference">
        <div>
          <span>Visit</span>
          <strong>{visit?.visitCode || "Current Visit"}</strong>
        </div>

        <div>
          <span>Purpose</span>
          <strong>{visit?.purpose || "--"}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong
            className={
              visit?.status === "INSIDE"
                ? "case-status-inside"
                : "case-status-exited"
            }
          >
            {visit?.status || "--"}
          </strong>
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="case-evidence-error">
          <span>!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="case-evidence-success">
          <span>✓</span>
          {success}
        </div>
      )}

      {/* =====================================================
          MULTIPLE VOICE RECORDINGS
      ===================================================== */}
      <div className="evidence-box">
        <div className="evidence-box-header">
          <div className="evidence-heading-left">
            <span className="evidence-icon">🎙</span>

            <div>
              <h3>Voice Statements</h3>
              <p>
                Record multiple statements, interviews or follow-up recordings.
              </p>
            </div>
          </div>

          {!recording && (
            <button
              type="button"
              className="start-record-button"
              onClick={startRecording}
            >
              ● Add Recording
            </button>
          )}
        </div>

        {recording && (
          <div className="recording-panel">
            <div className="recording-indicator">
              <span></span>
              Recording
            </div>

            <div className="recording-timer">
              {formatRecordingTime(recordingSeconds)}
            </div>

            <button
              type="button"
              className="stop-record-button"
              onClick={stopRecording}
            >
              ■ Stop Recording
            </button>
          </div>
        )}

        {voiceEvidence.length === 0 && !recording && (
          <div className="document-upload-area">
            <span>🎙</span>
            <strong>No voice statements added</strong>
            <small>Click Add Recording to record a statement.</small>
          </div>
        )}

        {voiceEvidence.map((item, index) => (
          <div className="saved-voice" key={item.id}>
            <div className="saved-voice-title">
              <strong>
                {index + 1}. {item.name}
              </strong>

              <button
                type="button"
                className="remove-evidence-button"
                onClick={() => removeVoice(item.id)}
              >
                Remove
              </button>
            </div>

            <audio controls src={item.data} className="evidence-audio" />
          </div>
        ))}
      </div>

      {/* =====================================================
          MULTIPLE DOCUMENTS + SCANNER
      ===================================================== */}
      <div className="evidence-box">
        <div className="evidence-box-header">
          <div className="evidence-heading-left">
            <span className="evidence-icon">📄</span>

            <div>
              <h3>Supporting Documents</h3>
              <p>
                Upload multiple documents or scan pages directly using the
                device camera.
              </p>
            </div>
          </div>

          <div className="evidence-multi-actions">
            <button
              type="button"
              className="upload-document-button"
              onClick={() => documentInputRef.current?.click()}
            >
              + Upload Documents
            </button>

            <button
              type="button"
              className="upload-document-button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? "Scanning..." : "📷 Scan Document"}
            </button>
          </div>
        </div>

        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          multiple
          onChange={handleDocumentChange}
          hidden
        />

        {/* Camera scanner input.
            On mobile browsers this opens the rear camera when supported. */}
        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleScanDocument}
          hidden
        />

        {documentEvidence.length === 0 && (
          <div className="document-upload-area">
            <span>📎</span>
            <strong>Upload or Scan Documents</strong>
            <small>PDF, JPG and PNG • Up to 600 KB per file</small>
          </div>
        )}

        {documentEvidence.map((item, index) => (
          <div className="saved-document" key={item.id}>
            <div className="document-file-icon">
              {item.type?.includes("pdf") ? "PDF" : "IMG"}
            </div>

            <div className="document-file-info">
              <strong>
                {index + 1}. {item.name}
              </strong>

              <span>
                {item.source === "scanner" ? "Scanned page" : item.type}
              </span>
            </div>

            <div className="document-file-actions">
              <button type="button" onClick={() => openDocument(item)}>
                Open
              </button>

              <button type="button" onClick={() => downloadDocument(item)}>
                Download
              </button>

              <button
                type="button"
                className="remove-document-button"
                onClick={() => removeDocument(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EVIDENCE SUMMARY */}
      <div className="evidence-footer">
        <div>
          <strong>Evidence:</strong>
          <span>
            {voiceEvidence.length} voice recording(s) •{" "}
            {documentEvidence.length} document(s)
          </span>
        </div>

        <button
          type="button"
          className="save-evidence-button"
          onClick={handleSaveEvidence}
          disabled={saving || recording || !hasEvidence}
        >
          {saving ? "Saving..." : "Save All Evidence"}
        </button>
      </div>

      {/* =====================================================
          AI ANALYSIS
      ===================================================== */}
      <div className="ai-analysis-card">
        <div className="ai-analysis-header">
          <div className="ai-analysis-title">
            <div className="ai-coming-icon">✦</div>

            <div>
              <span>POLICESETU AI</span>
              <h3>AI Case Analysis</h3>
            </div>
          </div>

          <span className="ai-analysis-badge">Officer Review</span>
        </div>

        <p className="ai-analysis-description">
          AI analyzes the submitted voice recordings and documents to help the
          officer review the reported problem and evidence.
        </p>

        <div className="ai-analysis-actions">
          <button
            type="button"
            className="analyze-ai-button"
            disabled={analyzing || saving || !hasEvidence}
            onClick={handleAnalyzeWithAI}
          >
            {analyzing ? "Analyzing Evidence..." : "✦ Analyze All Evidence"}
          </button>

          {!hasEvidence && <span>Add voice or document evidence first.</span>}
        </div>

        {hasAnalysis && (
          <div className="ai-analysis-result">
            <div className="ai-result-header">
              <div>
                <span>AI ANALYSIS RESULT</span>
                <h4>PoliceSetu AI Case Review</h4>
              </div>

              <span className="ai-result-status">
                {analysis.status || "ANALYZED"}
              </span>
            </div>

            {analysis.analyzedAt && (
              <div className="ai-analyzed-time">
                Analyzed: {formatAnalysisDate(analysis.analyzedAt)}
              </div>
            )}

            <div className="ai-result-block">
              <span>🎙 VOICE TRANSCRIPT</span>
              <div className="ai-result-content">
                {analysis.transcript || "No voice transcript available."}
              </div>
            </div>

            <div className="ai-result-block">
              <span>📄 DOCUMENT TEXT</span>
              <div className="ai-result-content">
                {analysis.documentText || "No document text available."}
              </div>
            </div>

            <div className="ai-result-block ai-important-block">
              <span>⚠ REPORTED PROBLEM</span>
              <div className="ai-result-content">
                {analysis.problemSummary ||
                  "No clear problem was identified from the submitted evidence."}
              </div>
            </div>

            <div className="ai-result-block">
              <span>🔎 EVIDENCE SUMMARY</span>
              <div className="ai-result-content">
                {analysis.evidenceSummary || "No evidence summary available."}
              </div>
            </div>

            <div className="ai-result-block">
              <span>⚖ POTENTIALLY RELEVANT LEGAL PROVISIONS</span>
              <div className="ai-result-content">
                {analysis.legalReferences ||
                  "No potentially relevant legal provisions were identified."}
              </div>
            </div>

            <div className="ai-result-block">
              <span>👮 SUGGESTED POLICE ACTIONS</span>
              <div className="ai-result-content">
                {analysis.suggestedActions || "No suggested actions available."}
              </div>
            </div>

            <div className="ai-confidence">
              <span>AI Confidence</span>
              <strong>{analysis.confidence || "Not specified"}</strong>
            </div>

            <div className="ai-disclaimer">
              <strong>Officer Verification Required</strong>
              <p>
                AI output is an assistance tool for police officers. Facts,
                evidence, legal provisions and suggested actions must be
                independently verified by the investigating officer.
              </p>
            </div>
          </div>
        )}
      </div>

      <PoliceCaseAction visit={visit} onUpdated={onUpdated} />
    </div>
  );
};

export default PoliceCaseEvidence;

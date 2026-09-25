import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/config";

/* =========================================================
   FIND VISITOR BY MOBILE
========================================================= */

export const findVisitorByMobile = async (mobileNumber) => {
  try {
    const q = query(
      collection(db, "visitors"),
      where("mobileNumber", "==", mobileNumber.trim()),
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const visitorDoc = snapshot.docs[0];

    return {
      id: visitorDoc.id,
      ...visitorDoc.data(),
    };
  } catch (error) {
    console.error("Find visitor error:", error);
    throw error;
  }
};

/* =========================================================
   COMPRESS VISITOR PHOTO
   Firebase Storage is NOT used.
   Photo is stored as compressed Base64 in Firestore.
========================================================= */

const compressVisitorPhoto = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const image = new Image();

      image.onload = () => {
        const MAX_SIZE = 600;

        let width = image.width;
        let height = image.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > width && height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        if (width > MAX_SIZE || height > MAX_SIZE) {
          const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);

          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Unable to process visitor photo."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.65);

        resolve(compressedDataUrl);
      };

      image.onerror = () => {
        reject(new Error("Unable to read visitor photo."));
      };

      image.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("Unable to process visitor photo."));
    };

    reader.readAsDataURL(file);
  });
};

/* =========================================================
   GENERATE VISITOR CODE
   Example: VIS-2026-0001
========================================================= */

const generateVisitorCode = async () => {
  const counterRef = doc(db, "counters", "visitors");

  return await runTransaction(db, async (transaction) => {
    const counterSnapshot = await transaction.get(counterRef);

    let nextNumber = 1;

    if (counterSnapshot.exists()) {
      nextNumber = (counterSnapshot.data().lastNumber || 0) + 1;
    }

    transaction.set(
      counterRef,
      {
        lastNumber: nextNumber,
        updatedAt: serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    const year = new Date().getFullYear();

    return `VIS-${year}-${String(nextNumber).padStart(4, "0")}`;
  });
};

/* =========================================================
   GENERATE VISIT CODE
========================================================= */

const generateVisitCode = () => {
  const year = new Date().getFullYear();

  return `VISIT-${year}-${Date.now()}`;
};

/* =========================================================
   CREATE NEW VISITOR
========================================================= */

export const createVisitor = async ({
  fullName,
  mobileNumber,
  address,
  photoFile,
  purpose,
  registeredBy,

  // Legacy single evidence
  voiceData = "",
  documentData = "",
  documentName = "",
  documentType = "",

  // Multiple evidence
  voiceEvidence = [],
  documentEvidence = [],
}) => {
  try {
    if (!fullName?.trim()) {
      throw new Error("Visitor name is required.");
    }

    if (!mobileNumber?.trim()) {
      throw new Error("Mobile number is required.");
    }

    if (!purpose) {
      throw new Error("Visit purpose is required.");
    }

    if (!registeredBy) {
      throw new Error("Registered user is required.");
    }

    /* -----------------------------------------
       NORMALIZE MULTIPLE EVIDENCE
    ----------------------------------------- */

    const safeVoiceEvidence = Array.isArray(voiceEvidence) ? voiceEvidence : [];

    const safeDocumentEvidence = Array.isArray(documentEvidence)
      ? documentEvidence
      : [];

    /* -----------------------------------------
       CREATE VISITOR DOCUMENT
    ----------------------------------------- */

    const visitorRef = doc(collection(db, "visitors"));

    const visitorCode = await generateVisitorCode();

    /* -----------------------------------------
       COMPRESS PHOTO
    ----------------------------------------- */

    let photoData = "";

    if (photoFile) {
      photoData = await compressVisitorPhoto(photoFile);
    }

    /* -----------------------------------------
       SAVE VISITOR
    ----------------------------------------- */

    await setDoc(visitorRef, {
      visitorCode,

      fullName: fullName.trim(),

      mobileNumber: mobileNumber.trim(),

      address: address?.trim() || "",

      photoData,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    });

    /* -----------------------------------------
       CREATE FIRST VISIT
    ----------------------------------------- */

    const visitRef = doc(collection(db, "visits"));

    const visitCode = generateVisitCode();

    await setDoc(visitRef, {
      visitCode,

      visitorId: visitorRef.id,

      visitorCode,

      purpose,

      entryTime: serverTimestamp(),

      exitTime: null,

      status: "INSIDE",

      registeredBy,

      /* -------------------------------------
         MULTIPLE VOICE RECORDINGS
      ------------------------------------- */

      voiceEvidence: safeVoiceEvidence,

      /* -------------------------------------
         LEGACY VOICE FIELD
         Keep first recording for compatibility
      ------------------------------------- */

      voiceData: voiceData || safeVoiceEvidence[0]?.data || "",

      /* -------------------------------------
         MULTIPLE SUPPORTING DOCUMENTS
      ------------------------------------- */

      documentEvidence: safeDocumentEvidence,

      /* -------------------------------------
         LEGACY DOCUMENT FIELDS
         Keep first document for compatibility
      ------------------------------------- */

      documentData: documentData || safeDocumentEvidence[0]?.data || "",

      documentName: documentName || safeDocumentEvidence[0]?.name || "",

      documentType: documentType || safeDocumentEvidence[0]?.type || "",

      createdAt: serverTimestamp(),
    });

    return {
      success: true,

      visitorId: visitorRef.id,

      visitorCode,

      visitId: visitRef.id,

      visitCode,
    };
  } catch (error) {
    console.error("Create visitor error:", error);

    throw error;
  }
};

/* =========================================================
   CREATE VISIT FOR EXISTING VISITOR
========================================================= */

export const createVisitForExistingVisitor = async ({
  visitor,
  purpose,
  registeredBy,

  // Legacy single evidence
  voiceData = "",
  documentData = "",
  documentName = "",
  documentType = "",

  // Multiple evidence
  voiceEvidence = [],
  documentEvidence = [],
}) => {
  if (!visitor?.id) {
    throw new Error("Visitor information is required.");
  }

  if (!purpose) {
    throw new Error("Visit purpose is required.");
  }

  if (!registeredBy) {
    throw new Error("Registered user is required.");
  }

  try {
    /* -----------------------------------------
       NORMALIZE MULTIPLE EVIDENCE
    ----------------------------------------- */

    const safeVoiceEvidence = Array.isArray(voiceEvidence) ? voiceEvidence : [];

    const safeDocumentEvidence = Array.isArray(documentEvidence)
      ? documentEvidence
      : [];

    /* -----------------------------------------
       CHECK IF VISITOR IS ALREADY INSIDE
    ----------------------------------------- */

    const activeVisitQuery = query(
      collection(db, "visits"),
      where("visitorId", "==", visitor.id),
      where("status", "==", "INSIDE"),
    );

    const activeVisitSnapshot = await getDocs(activeVisitQuery);

    if (!activeVisitSnapshot.empty) {
      throw new Error(
        "This visitor is already inside. Please checkout the current visit first.",
      );
    }

    /* -----------------------------------------
       GENERATE VISIT CODE
    ----------------------------------------- */

    const visitCode = generateVisitCode();

    /* -----------------------------------------
       CREATE VISIT
    ----------------------------------------- */

    const visitRef = await addDoc(collection(db, "visits"), {
      visitorId: visitor.id,

      visitorCode: visitor.visitorCode,

      visitCode,

      purpose,

      entryTime: serverTimestamp(),

      exitTime: null,

      status: "INSIDE",

      registeredBy,

      /* -------------------------------------
         MULTIPLE VOICE RECORDINGS
      ------------------------------------- */

      voiceEvidence: safeVoiceEvidence,

      /* -------------------------------------
         LEGACY VOICE FIELD
      ------------------------------------- */

      voiceData: voiceData || safeVoiceEvidence[0]?.data || "",

      /* -------------------------------------
         MULTIPLE SUPPORTING DOCUMENTS
      ------------------------------------- */

      documentEvidence: safeDocumentEvidence,

      /* -------------------------------------
         LEGACY DOCUMENT FIELDS
      ------------------------------------- */

      documentData: documentData || safeDocumentEvidence[0]?.data || "",

      documentName: documentName || safeDocumentEvidence[0]?.name || "",

      documentType: documentType || safeDocumentEvidence[0]?.type || "",

      createdAt: serverTimestamp(),
    });

    return {
      success: true,

      visitId: visitRef.id,

      visitorId: visitor.id,

      visitorCode: visitor.visitorCode,

      visitCode,
    };
  } catch (error) {
    console.error("Create visit for existing visitor error:", error);

    throw error;
  }
};

/* =========================================================
   GET ALL VISITS FOR A VISITOR
========================================================= */

export const getVisitorVisitHistory = async (visitorId) => {
  if (!visitorId) {
    throw new Error("Visitor ID is required.");
  }

  try {
    const q = query(
      collection(db, "visits"),
      where("visitorId", "==", visitorId),
    );

    const snapshot = await getDocs(q);

    const visits = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    /* -----------------------------------------
       LATEST VISIT FIRST
    ----------------------------------------- */

    visits.sort((a, b) => {
      const aTime = a.entryTime?.toMillis?.() || 0;

      const bTime = b.entryTime?.toMillis?.() || 0;

      return bTime - aTime;
    });

    return visits;
  } catch (error) {
    console.error("Get visitor history error:", error);

    throw error;
  }
};

/* =========================================================
   UPDATE VISITOR
========================================================= */

export const updateVisitor = async (visitorId, data) => {
  if (!visitorId) {
    throw new Error("Visitor ID is required.");
  }

  const visitorRef = doc(db, "visitors", visitorId);

  await updateDoc(visitorRef, {
    fullName: data.fullName?.trim() || "",

    mobileNumber: data.mobileNumber?.trim() || "",

    address: data.address?.trim() || "",

    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    visitorId,
  };
};

/* =========================================================
   DELETE VISITOR + ALL RELATED VISITS
========================================================= */

export const deleteVisitor = async (visitorId) => {
  if (!visitorId) {
    throw new Error("Visitor ID is required.");
  }

  try {
    /* -----------------------------------------
       FIND ALL VISITS
    ----------------------------------------- */

    const visitsQuery = query(
      collection(db, "visits"),
      where("visitorId", "==", visitorId),
    );

    const visitsSnapshot = await getDocs(visitsQuery);

    /* -----------------------------------------
       DELETE VISITS
    ----------------------------------------- */

    for (const visitDocument of visitsSnapshot.docs) {
      await deleteDoc(doc(db, "visits", visitDocument.id));
    }

    /* -----------------------------------------
       DELETE VISITOR
    ----------------------------------------- */

    await deleteDoc(doc(db, "visitors", visitorId));

    return {
      success: true,

      visitorId,

      deletedVisits: visitsSnapshot.size,
    };
  } catch (error) {
    console.error("Delete visitor error:", error);

    throw error;
  }
};

/* =========================================================
   UPDATE VISIT
========================================================= */

export const updateVisit = async (visitId, data) => {
  if (!visitId) {
    throw new Error("Visit ID is required.");
  }

  const visitRef = doc(db, "visits", visitId);

  const updateData = {
    updatedAt: serverTimestamp(),
  };

  /* -----------------------------------------
     VISIT INFORMATION
  ----------------------------------------- */

  if (data.purpose !== undefined) {
    updateData.purpose = data.purpose;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.entryTime !== undefined) {
    updateData.entryTime = data.entryTime;
  }

  if (data.exitTime !== undefined) {
    updateData.exitTime = data.exitTime;
  }

  /* -----------------------------------------
     LEGACY POLICE EVIDENCE
  ----------------------------------------- */

  if (data.voiceData !== undefined) {
    updateData.voiceData = data.voiceData;
  }

  if (data.documentData !== undefined) {
    updateData.documentData = data.documentData;
  }

  if (data.documentName !== undefined) {
    updateData.documentName = data.documentName;
  }

  if (data.documentType !== undefined) {
    updateData.documentType = data.documentType;
  }

  /* -----------------------------------------
     MULTIPLE POLICE EVIDENCE
  ----------------------------------------- */

  if (data.voiceEvidence !== undefined) {
    updateData.voiceEvidence = Array.isArray(data.voiceEvidence)
      ? data.voiceEvidence
      : [];
  }

  if (data.documentEvidence !== undefined) {
    updateData.documentEvidence = Array.isArray(data.documentEvidence)
      ? data.documentEvidence
      : [];
  }

  /* -----------------------------------------
     POLICESETU AI ANALYSIS
  ----------------------------------------- */

  if (data.aiStatus !== undefined) {
    updateData.aiStatus = data.aiStatus;
  }

  if (data.aiTranscript !== undefined) {
    updateData.aiTranscript = data.aiTranscript;
  }

  if (data.aiDocumentText !== undefined) {
    updateData.aiDocumentText = data.aiDocumentText;
  }

  if (data.aiProblemSummary !== undefined) {
    updateData.aiProblemSummary = data.aiProblemSummary;
  }

  if (data.aiEvidenceSummary !== undefined) {
    updateData.aiEvidenceSummary = data.aiEvidenceSummary;
  }

  if (data.aiLegalReferences !== undefined) {
    updateData.aiLegalReferences = data.aiLegalReferences;
  }

  if (data.aiSuggestedActions !== undefined) {
    updateData.aiSuggestedActions = data.aiSuggestedActions;
  }

  if (data.aiConfidence !== undefined) {
    updateData.aiConfidence = data.aiConfidence;
  }

  if (data.aiAnalyzedAt !== undefined) {
    updateData.aiAnalyzedAt = data.aiAnalyzedAt;
  }

  /* -----------------------------------------
     SAVE TO FIRESTORE
  ----------------------------------------- */

  await updateDoc(visitRef, updateData);

  console.log("Visit updated successfully:", visitId);

  return {
    success: true,
    visitId,
  };
};

/* =========================================================
   DELETE VISIT
========================================================= */

export const deleteVisit = async (visitId) => {
  if (!visitId) {
    throw new Error("Visit ID is required.");
  }

  await deleteDoc(doc(db, "visits", visitId));

  return {
    success: true,
    visitId,
  };
};

/* =========================================================
   SAVE CASE ACTION
========================================================= */

export const saveCaseAction = async (visitId, data) => {
  if (!visitId) {
    throw new Error("Visit ID is required.");
  }

  const visitRef = doc(db, "visits", visitId);

  const caseAction = {
    actionType: data.actionType || "",
    officerRemarks: data.officerRemarks || "",
    assignedOfficer: data.assignedOfficer || "",
    priority: data.priority || "",
    nextActionDate: data.nextActionDate || "",
    status: data.status || "New",
    officerId: data.officerId || "",
    officerName: data.officerName || "",
    createdAt: serverTimestamp(),
  };

  await updateDoc(doc(db, "visits", visitId), {
    caseAction,
    caseStatus: caseAction.status,
    casePriority: caseAction.priority,
    updatedAt: serverTimestamp(),
  });

  /* -----------------------------------------
     PERMANENT ACTION HISTORY
  ----------------------------------------- */

  const historyRef = collection(db, "visits", visitId, "caseActions");

  const historyDoc = await addDoc(historyRef, {
    ...caseAction,
    createdAt: serverTimestamp(),
  });

  return {
    success: true,

    actionId: historyDoc.id,

    action: {
      ...caseAction,
      id: historyDoc.id,
    },
  };
};

/* =========================================================
   GET CASE ACTIONS
========================================================= */

export const getCaseActions = async (visitId) => {
  if (!visitId) {
    return [];
  }

  const historyRef = collection(db, "visits", visitId, "caseActions");

  const q = query(historyRef, orderBy("createdAt", "desc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
};

/* =========================================================
   REAL-TIME CASE ACTIONS
========================================================= */

export const subscribeToCaseActions = (visitId, onData, onError) => {
  if (!visitId) {
    if (typeof onData === "function") {
      onData([]);
    }

    return () => {};
  }

  const historyRef = collection(db, "visits", visitId, "caseActions");

  const q = query(historyRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const actions = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      if (typeof onData === "function") {
        onData(actions);
      }
    },
    (error) => {
      console.error("Real-time case action listener error:", error);

      if (typeof onError === "function") {
        onError(error);
      }
    },
  );

  return unsubscribe;
};

/* =========================================================
   UPDATE CASE ACTION
========================================================= */

export const updateCaseAction = async (visitId, actionId, data) => {
  if (!visitId) {
    throw new Error("Visit ID is required.");
  }

  if (!actionId) {
    throw new Error("Action ID is required.");
  }

  const actionRef = doc(db, "visits", visitId, "caseActions", actionId);

  const updateData = {
    actionType: data.actionType || "",

    officerRemarks: data.officerRemarks || "",

    assignedOfficer: data.assignedOfficer || "",

    priority: data.priority || "Medium",

    nextActionDate: data.nextActionDate || "",

    status: data.status || "Under Verification",

    officerId: data.officerId || "",

    officerName: data.officerName || "",

    updatedAt: serverTimestamp(),
  };

  /* -----------------------------------------
     UPDATE HISTORY RECORD
  ----------------------------------------- */

  await updateDoc(actionRef, updateData);

  /* -----------------------------------------
     UPDATE CURRENT VISIT ACTION
  ----------------------------------------- */

  const visitRef = doc(db, "visits", visitId);

  await updateDoc(visitRef, {
    caseAction: {
      ...updateData,
      updatedAt: new Date().toISOString(),
    },

    caseStatus: updateData.status,

    casePriority: updateData.priority,

    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    actionId,
  };
};

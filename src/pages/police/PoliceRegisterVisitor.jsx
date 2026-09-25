import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import {
  findVisitorByMobile,
  createVisitor,
  createVisitForExistingVisitor,
} from "../../services/visitorService";

import { auth } from "../../firebase/config";
import { getCurrentUserRole } from "../../services/authService";

import "../../styles/PoliceRegisterVisitor.css";

function PoliceRegisterVisitor() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const documentScanInputRef = useRef(null);
  const documentCameraVideoRef = useRef(null);
  const documentCameraCanvasRef = useRef(null);
  const documentCameraStreamRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [form, setForm] = useState({
    fullName: "",
    mobileNumber: "",
    address: "",
    purpose: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [documentFiles, setDocumentFiles] = useState([]);
  const [documentEvidence, setDocumentEvidence] = useState([]);

  const [voiceRecordings, setVoiceRecordings] = useState([]);

  const [isRecording, setIsRecording] = useState(false);

  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recordingTimerRef = useRef(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [documentCameraOpen, setDocumentCameraOpen] = useState(false);

  const [existingVisitor, setExistingVisitor] = useState(null);

  const [checkingMobile, setCheckingMobile] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [registeredBy, setRegisteredBy] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // GET CURRENT POLICE USER
  // ==========================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return;
      }

      try {
        const userData = await getCurrentUserRole();

        if (userData?.role === "POLICE") {
          setRegisteredBy(
            userData.name || userData.email || user.email || "Police Officer",
          );
        }
      } catch (error) {
        console.error("Get police user error:", error);

        setRegisteredBy(user.email || "Police Officer");
      }
    });

    return () => unsubscribe();
  }, []);

  // ==========================================
  // CLEANUP
  // ==========================================

  useEffect(() => {
    return () => {
      stopCamera();

      if (documentCameraStreamRef.current) {
        documentCameraStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
        documentCameraStreamRef.current = null;
      }

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");

    if (name === "mobileNumber") {
      setExistingVisitor(null);
    }
  };

  // ==========================================
  // CHECK EXISTING VISITOR
  // ==========================================

  useEffect(() => {
    const mobile = form.mobileNumber.trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setExistingVisitor(null);
      return;
    }

    let cancelled = false;

    const checkVisitor = async () => {
      try {
        setCheckingMobile(true);

        const visitor = await findVisitorByMobile(mobile);

        if (!cancelled) {
          setExistingVisitor(visitor || null);
        }
      } catch (error) {
        console.error("Check visitor error:", error);
      } finally {
        if (!cancelled) {
          setCheckingMobile(false);
        }
      }
    };

    checkVisitor();

    return () => {
      cancelled = true;
    };
  }, [form.mobileNumber]);

  // ==========================================
  // PHOTO UPLOAD
  // ==========================================

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be smaller than 5 MB.");
      return;
    }

    setPhotoFile(file);

    const previewUrl = URL.createObjectURL(file);

    setPhotoPreview(previewUrl);

    setError("");
  };

  // ==========================================
  // CAMERA
  // ==========================================

  const openCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera error:", error);

      setError("Unable to access camera. Please allow camera permission.");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const width = video.videoWidth || 640;

    const height = video.videoHeight || 480;

    canvas.width = width;

    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture photo.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to create photo.");
          return;
        }

        const file = new File([blob], `visitor-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        setPhotoFile(file);

        const previewUrl = URL.createObjectURL(blob);

        setPhotoPreview(previewUrl);

        stopCamera();

        setError("");
      },
      "image/jpeg",
      0.8,
    );
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());

      mediaStreamRef.current = null;
    }

    setCameraOpen(false);
  };

  // ==========================================
  // REMOVE PHOTO
  // ==========================================

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // MULTIPLE DOCUMENTS / SCANNER / CAMERA
  // ==========================================

  const addDocumentFiles = (files, source = "upload") => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxFileSize = 600 * 1024;
    const valid = [];
    const errors = [];

    selectedFiles.forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: only PDF, JPG and PNG are supported.`);
        return;
      }

      if (file.size > maxFileSize) {
        errors.push(`${file.name}: document must be smaller than 600 KB.`);
        return;
      }

      valid.push(file);
    });

    if (errors.length) setError(errors.join(" "));
    else setError("");

    if (!valid.length) return;

    const items = valid.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      source,
      previewUrl: URL.createObjectURL(file),
    }));

    setDocumentFiles((previous) => [...previous, ...valid]);
    setDocumentEvidence((previous) => [...previous, ...items]);
  };

  const handleDocumentChange = (event) => {
    addDocumentFiles(event.target.files, "upload");
    event.target.value = "";
  };

  const handleDocumentScan = (event) => {
    addDocumentFiles(event.target.files, "scanner");
    event.target.value = "";
  };

  const openDocumentScanner = () => {
    documentScanInputRef.current?.click();
  };

  const openDocumentCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Document camera is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      documentCameraStreamRef.current = stream;
      setDocumentCameraOpen(true);

      setTimeout(() => {
        if (documentCameraVideoRef.current) {
          documentCameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (cameraError) {
      console.error("Document camera error:", cameraError);
      setError(
        "Unable to access document camera. Please allow camera permission.",
      );
    }
  };

  const stopDocumentCamera = () => {
    if (documentCameraStreamRef.current) {
      documentCameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
      documentCameraStreamRef.current = null;
    }
    setDocumentCameraOpen(false);
  };

  const captureDocumentPhoto = () => {
    const video = documentCameraVideoRef.current;
    const canvas = documentCameraCanvasRef.current;

    if (!video || !canvas) {
      setError("Unable to capture document photo.");
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture document photo.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to create document photo.");
          return;
        }

        const file = new File([blob], `document-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        addDocumentFiles([file], "camera");
        stopDocumentCamera();
      },
      "image/jpeg",
      0.8,
    );
  };

  const removeDocument = (index) => {
    setDocumentEvidence((previous) => {
      const item = previous[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
    setDocumentFiles((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const clearDocuments = () => {
    documentEvidence.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setDocumentEvidence([]);
    setDocumentFiles([]);
    stopDocumentCamera();
    if (documentInputRef.current) documentInputRef.current.value = "";
    if (documentScanInputRef.current) documentScanInputRef.current.value = "";
  };

  // ==========================================
  // MULTIPLE VOICE RECORDINGS
  // ==========================================

  const startRecording = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Voice recording is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        if (blob.size > 600 * 1024) {
          setError(
            "Voice recording is too large. Please record a shorter statement.",
          );
          return;
        }

        const previewUrl = URL.createObjectURL(blob);
        setVoiceRecordings((previous) => [
          ...previous,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            blob,
            name: `Voice Statement ${previous.length + 1}`,
            size: blob.size,
            type: mimeType,
            previewUrl,
            duration: recordingSeconds,
          },
        ]);
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => previous + 1);
      }, 1000);
    } catch (recordingError) {
      console.error("Voice recording error:", recordingError);
      setError(
        "Unable to access microphone. Please allow microphone permission.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }

    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const removeVoiceRecording = (index) => {
    setVoiceRecordings((previous) => {
      const item = previous[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const clearVoiceRecordings = () => {
    voiceRecordings.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setVoiceRecordings([]);
    audioChunksRef.current = [];
  };

  const formatRecordingTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  // ==========================================
  // FILE TO DATA URL
  // ==========================================

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      reader.onerror = () => reject(new Error("Unable to read file."));

      reader.readAsDataURL(file);
    });
  };

  // ==========================================
  // RESET
  // ==========================================

  const handleReset = () => {
    stopCamera();

    if (isRecording) {
      stopRecording();
    }

    setForm({
      fullName: "",
      mobileNumber: "",
      address: "",
      purpose: "",
    });

    setExistingVisitor(null);

    setPhotoFile(null);
    setPhotoPreview("");

    clearDocuments();
    clearVoiceRecordings();

    setRecordingSeconds(0);

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
    if (documentScanInputRef.current) {
      documentScanInputRef.current.value = "";
    }
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (isRecording) {
      setError("Please stop the voice recording before submitting.");
      return;
    }

    const fullName = form.fullName.trim();

    const mobileNumber = form.mobileNumber.trim();

    const address = form.address.trim();

    const purpose = form.purpose.trim();

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (!purpose) {
      setError("Please select a purpose.");
      return;
    }

    if (!registeredBy) {
      setError("Unable to identify the police officer. Please login again.");
      return;
    }

    try {
      setSubmitting(true);

      const voiceEvidence = await Promise.all(
        voiceRecordings.map(async (item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          data: await fileToDataUrl(item.blob),
        })),
      );

      const savedDocumentEvidence = await Promise.all(
        documentEvidence.map(async (item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          source: item.source,
          data: await fileToDataUrl(item.file),
        })),
      );

      const voiceData = voiceEvidence[0]?.data || "";
      const documentData = savedDocumentEvidence[0]?.data || "";
      const documentName = savedDocumentEvidence[0]?.name || "";
      const documentType = savedDocumentEvidence[0]?.type || "";

      // ========================================
      // EXISTING VISITOR
      // ========================================

      if (existingVisitor) {
        const result = await createVisitForExistingVisitor({
          visitor: existingVisitor,
          purpose,
          registeredBy,
          voiceData,
          documentData,
          documentName,
          documentType,
          voiceEvidence,
          documentEvidence: savedDocumentEvidence,
        });

        setSuccess(
          `New visit created successfully. Visit ID: ${result.visitCode}`,
        );

        setTimeout(() => {
          navigate(`/police/visitors/${existingVisitor.id}`);
        }, 700);

        return;
      }

      // ========================================
      // NEW VISITOR
      // ========================================

      if (!fullName) {
        setError("Full name is required.");
        setSubmitting(false);
        return;
      }

      if (!address) {
        setError("Address is required.");
        setSubmitting(false);
        return;
      }

      const result = await createVisitor({
        fullName,
        mobileNumber,
        address,
        photoFile,
        purpose,
        registeredBy,
        voiceData,
        documentData,
        documentName,
        documentType,
        voiceEvidence,
        documentEvidence: savedDocumentEvidence,
      });

      setSuccess(
        `Visitor registered successfully. Visitor ID: ${result.visitorCode}`,
      );

      setTimeout(() => {
        navigate(`/police/visitors/${result.visitorId}`);
      }, 700);
    } catch (error) {
      console.error("Police registration error:", error);

      setError(
        error?.message || "Unable to register visitor. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="police-register-page">
      {/* =====================================
          HEADER
      ====================================== */}

      <div className="police-register-header">
        <button
          type="button"
          className="police-register-back"
          onClick={() => navigate("/police/visitors")}
        >
          ← All Visitors
        </button>

        <div>
          <div className="police-register-eyebrow">
            POLICE VISITOR MANAGEMENT
          </div>

          <h1>Register Visitor</h1>

          <p>Capture visitor details, statement and supporting documents.</p>
        </div>
      </div>

      {/* =====================================
          ALERTS
      ====================================== */}

      {error && <div className="police-register-alert error">{error}</div>}

      {success && (
        <div className="police-register-alert success">{success}</div>
      )}

      <form className="police-register-card" onSubmit={handleSubmit}>
        {/* ===================================
            VISITOR PHOTO
        ==================================== */}

        <section className="police-register-section">
          <div className="section-heading">
            <div className="section-icon">01</div>

            <div>
              <h2>Visitor Photo</h2>

              <p>Capture or upload a clear visitor photograph.</p>
            </div>
          </div>

          <div className="photo-capture-layout">
            <div className="photo-preview-large">
              {photoPreview ? (
                <img src={photoPreview} alt="Visitor" />
              ) : (
                <div className="photo-empty">
                  <span>👤</span>
                  <small>No photo</small>
                </div>
              )}
            </div>

            <div className="photo-actions">
              <button
                type="button"
                className="capture-camera-button"
                onClick={openCamera}
                disabled={!!existingVisitor}
              >
                📷 Capture with Camera
              </button>

              <label
                className={`upload-photo-button ${
                  existingVisitor ? "disabled" : ""
                }`}
              >
                📁 Upload Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={!!existingVisitor}
                  hidden
                />
              </label>

              {photoFile && (
                <button
                  type="button"
                  className="remove-photo-button"
                  onClick={handleRemovePhoto}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          {/* CAMERA */}

          {cameraOpen && (
            <div className="camera-panel">
              <div className="camera-preview">
                <video ref={videoRef} autoPlay playsInline muted />
              </div>

              <canvas ref={canvasRef} hidden />

              <div className="camera-actions">
                <button
                  type="button"
                  className="capture-button"
                  onClick={capturePhoto}
                >
                  ● Capture Photo
                </button>

                <button
                  type="button"
                  className="camera-close-button"
                  onClick={stopCamera}
                >
                  Close Camera
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================================
            BASIC DETAILS
        ==================================== */}

        <section className="police-register-section">
          <div className="section-heading">
            <div className="section-icon">02</div>

            <div>
              <h2>Visitor Information</h2>

              <p>Enter the visitor's personal information.</p>
            </div>
          </div>

          <div className="police-form-grid">
            <div className="police-form-field">
              <label>
                Mobile Number
                <span>*</span>
              </label>

              <input
                type="tel"
                name="mobileNumber"
                value={form.mobileNumber}
                onChange={handleChange}
                maxLength="10"
                placeholder="10-digit mobile number"
              />

              {checkingMobile && <small>Checking existing visitor...</small>}
            </div>

            <div className="police-form-field">
              <label>
                Full Name
                <span>*</span>
              </label>

              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
                disabled={!!existingVisitor}
              />
            </div>

            <div className="police-form-field full">
              <label>
                Address
                <span>*</span>
              </label>

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows="4"
                placeholder="Enter complete address"
                disabled={!!existingVisitor}
              />
            </div>
          </div>

          {existingVisitor && (
            <div className="existing-visitor-box">
              <div className="existing-avatar">
                {existingVisitor.fullName?.charAt(0)?.toUpperCase() || "V"}
              </div>

              <div className="existing-info">
                <span>EXISTING VISITOR</span>

                <strong>{existingVisitor.fullName}</strong>

                <small>{existingVisitor.visitorCode}</small>
              </div>

              <div className="existing-badge">Existing</div>
            </div>
          )}
        </section>

        {/* ===================================
            VISIT PURPOSE
        ==================================== */}

        <section className="police-register-section">
          <div className="section-heading">
            <div className="section-icon">03</div>

            <div>
              <h2>Visit Information</h2>

              <p>Record the reason for today's visit.</p>
            </div>
          </div>

          <div className="police-form-grid">
            <div className="police-form-field full">
              <label>
                Purpose
                <span>*</span>
              </label>

              <select
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
              >
                <option value="">Select visit purpose</option>

                <option value="Petition / Complaint">
                  Petition / Complaint
                </option>

                <option value="Meeting">Meeting</option>

                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* ===================================
            MULTIPLE VOICE STATEMENTS
        ==================================== */}

        <section className="police-register-section">
          <div className="section-heading">
            <div className="section-icon">04</div>
            <div>
              <h2>Voice Statements</h2>
              <p>Record multiple statements or explanations.</p>
            </div>
          </div>

          <div className="voice-recorder-card">
            <div className="voice-recorder-icon">🎙️</div>
            <div className="voice-recorder-content">
              <strong>Add Voice Statement</strong>
              <span>Maximum recording size: 600 KB per recording</span>
              {isRecording ? (
                <div className="recording-status">
                  <span className="recording-dot" />
                  Recording{" "}
                  <strong>{formatRecordingTime(recordingSeconds)}</strong>
                </div>
              ) : (
                <span className="voice-hint">
                  {voiceRecordings.length
                    ? `${voiceRecordings.length} recording(s) added`
                    : "No voice recordings added"}
                </span>
              )}
            </div>
            <div className="voice-actions">
              {!isRecording ? (
                <button
                  type="button"
                  className="start-recording-button"
                  onClick={startRecording}
                >
                  🎙 Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  className="stop-recording-button"
                  onClick={stopRecording}
                >
                  ■ Stop Recording
                </button>
              )}
            </div>
          </div>

          {voiceRecordings.length > 0 && (
            <div className="evidence-list">
              {voiceRecordings.map((item, index) => (
                <div className="selected-document" key={item.id}>
                  <div className="document-file-icon">🎙️</div>
                  <div className="document-file-info">
                    <strong>{item.name}</strong>
                    <span>{(item.size / 1024).toFixed(1)} KB</span>
                    <audio
                      className="voice-player"
                      controls
                      src={item.previewUrl}
                    />
                  </div>
                  <button
                    type="button"
                    className="remove-document-button"
                    onClick={() => removeVoiceRecording(index)}
                    disabled={isRecording || submitting}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="remove-recording-button"
                onClick={clearVoiceRecordings}
                disabled={isRecording || submitting}
              >
                Remove All Recordings
              </button>
            </div>
          )}
        </section>

        {/* ===================================
            MULTIPLE SUPPORTING DOCUMENTS
        ==================================== */}

        <section className="police-register-section">
          <div className="section-heading">
            <div className="section-icon">05</div>
            <div>
              <h2>Supporting Documents</h2>
              <p>Browse, scan, or take a camera picture of documents.</p>
            </div>
          </div>

          <div className="document-action-grid">
            <label className="document-upload-box document-action-button">
              <div className="document-upload-icon">📁</div>
              <div>
                <strong>Browse Documents</strong>
                <span>Multiple PDF, JPG or PNG files</span>
              </div>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                multiple
                onChange={handleDocumentChange}
                hidden
              />
              <div className="document-browse">Browse</div>
            </label>

            <button
              type="button"
              className="document-upload-box document-action-button"
              onClick={openDocumentScanner}
              disabled={submitting}
            >
              <div className="document-upload-icon">📄</div>
              <div>
                <strong>Scan Document</strong>
                <span>Use device camera scanner</span>
              </div>
              <div className="document-browse">Scan</div>
            </button>

            <input
              ref={documentScanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleDocumentScan}
              hidden
            />

            <button
              type="button"
              className="document-upload-box document-action-button"
              onClick={openDocumentCamera}
              disabled={submitting}
            >
              <div className="document-upload-icon">📷</div>
              <div>
                <strong>Take Camera Picture</strong>
                <span>Open camera and capture document</span>
              </div>
              <div className="document-browse">Camera</div>
            </button>
          </div>

          {documentCameraOpen && (
            <div className="document-camera-panel">
              <div className="document-camera-preview">
                <video
                  ref={documentCameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
              <canvas ref={documentCameraCanvasRef} hidden />
              <div className="camera-actions">
                <button
                  type="button"
                  className="capture-button"
                  onClick={captureDocumentPhoto}
                >
                  📷 Capture Document
                </button>
                <button
                  type="button"
                  className="camera-close-button"
                  onClick={stopDocumentCamera}
                >
                  Close Camera
                </button>
              </div>
            </div>
          )}

          {documentEvidence.length > 0 && (
            <div className="evidence-list">
              <div className="document-count">
                {documentEvidence.length} document(s) selected
              </div>

              {documentEvidence.map((item, index) => (
                <div className="selected-document" key={item.id}>
                  <div className="document-file-icon">
                    {item.type === "application/pdf" ? "📕" : "🖼️"}
                  </div>
                  <div className="document-file-info">
                    <strong>{item.name}</strong>
                    <span>
                      {(item.size / 1024).toFixed(1)} KB • {item.type}
                    </span>
                    <small>
                      {item.source === "scanner"
                        ? "Scanned document"
                        : item.source === "camera"
                          ? "Camera picture"
                          : "Uploaded document"}
                    </small>
                    {item.type.startsWith("image/") && (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        style={{
                          width: "90px",
                          height: "70px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          marginTop: "8px",
                        }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="remove-document-button"
                    onClick={() => removeDocument(index)}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="remove-recording-button"
                onClick={clearDocuments}
                disabled={submitting}
              >
                Remove All Documents
              </button>
            </div>
          )}
        </section>

        {/* ===================================
            SUBMIT
        ==================================== */}

        <div className="police-register-footer">
          <div className="footer-security-note">
            <span>🔒</span>

            <div>
              <strong>Secure Registration</strong>

              <small>Recorded by {registeredBy || "Police Officer"}</small>
            </div>
          </div>

          <div className="police-register-actions">
            <button
              type="button"
              className="police-register-cancel"
              onClick={() => navigate("/police/visitors")}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="police-register-reset"
              onClick={handleReset}
              disabled={submitting}
            >
              Reset
            </button>

            <button
              type="submit"
              className="police-register-submit"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : existingVisitor
                  ? "Create New Visit"
                  : "Register Visitor"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default PoliceRegisterVisitor;

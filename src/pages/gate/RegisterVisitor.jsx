import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { auth } from "../../firebase/config";

import {
  findVisitorByMobile,
  createVisitor,
  createVisitForExistingVisitor,
} from "../../services/visitorService";

import "../../styles/RegisterVisitor.css";

function RegisterVisitor() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const [checkingMobile, setCheckingMobile] = useState(false);
  const [existingVisitor, setExistingVisitor] = useState(null);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [successData, setSuccessData] = useState(null);

  // Camera
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const mobileNumber = watch("mobileNumber");

  // =========================================================
  // CHECK EXISTING VISITOR
  // =========================================================

  const handleCheckMobile = async () => {
    setError("");
    setExistingVisitor(null);

    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    try {
      setCheckingMobile(true);

      const visitor = await findVisitorByMobile(mobileNumber);

      if (visitor) {
        setExistingVisitor(visitor);

        setValue("fullName", visitor.fullName || "");
        setValue("address", visitor.address || "");

        setError("");
      } else {
        setExistingVisitor(null);
        setValue("fullName", "");
        setValue("address", "");
      }
    } catch (err) {
      console.error("Check visitor error:", err);
      setError("Unable to check visitor details.");
    } finally {
      setCheckingMobile(false);
    }
  };

  // =========================================================
  // IMAGE COMPRESSION
  // =========================================================

  const compressImageUnder1MB = (file) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please select a valid image."));
        return;
      }

      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const MAX_SIZE = 1024 * 1024 - 10 * 1024;

        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        let width = image.width;
        let height = image.height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Unable to process image."));
          return;
        }

        let quality = 0.82;
        let currentWidth = width;
        let currentHeight = height;

        const tryCompress = () => {
          canvas.width = currentWidth;
          canvas.height = currentHeight;

          ctx.clearRect(0, 0, currentWidth, currentHeight);

          ctx.drawImage(image, 0, 0, currentWidth, currentHeight);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Unable to compress image."));
                return;
              }

              if (blob.size <= MAX_SIZE) {
                const compressedFile = new File([blob], "visitor-photo.jpg", {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });

                resolve({
                  file: compressedFile,
                  preview: URL.createObjectURL(blob),
                  size: blob.size,
                });

                return;
              }

              if (quality > 0.4) {
                quality -= 0.08;
                tryCompress();
                return;
              }

              if (currentWidth > 700 || currentHeight > 700) {
                currentWidth = Math.round(currentWidth * 0.85);
                currentHeight = Math.round(currentHeight * 0.85);

                quality = 0.7;

                tryCompress();
                return;
              }

              reject(new Error("Unable to compress this image below 1 MB."));
            },
            "image/jpeg",
            quality,
          );
        };

        tryCompress();
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read the selected image."));
      };

      image.src = objectUrl;
    });
  };

  // =========================================================
  // DEVICE PHOTO
  // =========================================================

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    try {
      const result = await compressImageUnder1MB(file);

      setPhotoFile(result.file);
      setPhotoPreview(result.preview);

      setValue("photo", result.file);
    } catch (err) {
      console.error("Image compression error:", err);

      setPhotoFile(null);
      setPhotoPreview("");

      setError(err?.message || "Unable to process the selected image.");
    }

    event.target.value = "";
  };

  // =========================================================
  // OPEN CAMERA
  // =========================================================

  const openCamera = async () => {
    setCameraError("");
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by this browser.");

        setCameraOpen(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Camera error:", err);

      setCameraError(
        "Unable to access camera. Please allow camera permission and try again.",
      );

      setCameraOpen(true);
    }
  };

  // =========================================================
  // CAPTURE PHOTO
  // =========================================================

  const capturePhoto = async () => {
    try {
      if (!videoRef.current) {
        setCameraError("Camera is not ready.");
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video.videoWidth || !video.videoHeight) {
        setCameraError("Camera is still loading. Try again.");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        setCameraError("Unable to capture camera image.");
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        setCameraError("Unable to capture photo.");
        return;
      }

      const cameraFile = new File([blob], "camera-photo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      const compressed = await compressImageUnder1MB(cameraFile);

      setPhotoFile(compressed.file);
      setPhotoPreview(compressed.preview);

      setValue("photo", compressed.file);

      closeCamera();
    } catch (err) {
      console.error("Capture error:", err);

      setCameraError(err?.message || "Unable to capture and compress photo.");
    }
  };

  // =========================================================
  // CLOSE CAMERA
  // =========================================================

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraError("");
  };

  // =========================================================
  // CLEAN CAMERA ON PAGE EXIT
  // =========================================================

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, []);

  // =========================================================
  // REMOVE PHOTO
  // =========================================================

  const removePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(null);
    setPhotoPreview("");

    setValue("photo", "");
  };

  // =========================================================
  // FORMAT FILE SIZE
  // =========================================================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 KB";
    }

    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const onSubmit = async (data) => {
    setError("");

    if (!data.purpose) {
      setError("Please select the purpose of visit.");
      return;
    }

    // New visitor requires photo
    if (!existingVisitor && !photoFile) {
      setError("Visitor photo is required.");
      return;
    }

    if (!existingVisitor && photoFile && photoFile.size >= 1024 * 1024) {
      setError("Photo must be compressed below 1 MB.");
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Your session has expired. Please login again.");

      navigate("/login");
      return;
    }

    try {
      setSubmitting(true);

      let result;

      // =====================================================
      // EXISTING VISITOR
      // =====================================================

      if (existingVisitor) {
        result = await createVisitForExistingVisitor({
          visitor: existingVisitor,
          purpose: data.purpose,
          registeredBy: currentUser.uid,
        });
      }

      // =====================================================
      // NEW VISITOR
      // =====================================================
      else {
        result = await createVisitor({
          fullName: data.fullName.trim(),
          mobileNumber: data.mobileNumber.trim(),
          address: data.address?.trim() || "",
          photoFile,
          purpose: data.purpose,
          registeredBy: currentUser.uid,
        });
      }

      setSuccessData({
        visitorCode: result.visitorCode || existingVisitor?.visitorCode || "--",

        visitCode: result.visitCode || "--",

        visitId: result.visitId || "--",
      });
    } catch (err) {
      console.error("Visitor registration failed:", err);

      setError(err?.message || "Unable to register visitor. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // REGISTER ANOTHER
  // =========================================================

  const handleRegisterAnother = () => {
    removePhoto();

    reset();

    setExistingVisitor(null);
    setSuccessData(null);
    setError("");
  };

  // =========================================================
  // SUCCESS SCREEN
  // =========================================================

  if (successData) {
    return (
      <div className="register-page">
        <div className="success-card">
          <div className="success-icon">✓</div>

          <span className="success-label">REGISTRATION SUCCESSFUL</span>

          <h1>Visitor Registered</h1>

          <p>The visitor has been successfully registered at the gate.</p>

          <div className="success-details">
            <div className="success-detail">
              <span>Visitor ID</span>
              <strong>{successData.visitorCode}</strong>
            </div>

            <div className="success-detail">
              <span>Visit ID</span>
              <strong>{successData.visitCode}</strong>
            </div>

            <div className="success-detail">
              <span>Status</span>
              <strong className="inside-status">INSIDE</strong>
            </div>
          </div>

          <div className="success-actions">
            <button
              type="button"
              onClick={() => navigate(`/gate/pass/${successData.visitId}`)}
            >
              View Gate Pass
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/gate")}
            >
              Back to Dashboard
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={handleRegisterAnother}
            >
              Register Another Visitor
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="register-page">
      <div className="register-container">
        {/* HEADER */}

        <div className="register-header">
          <div>
            <span className="register-label">GATE PORTAL</span>

            <h1>Register Visitor</h1>

            <p>Register a visitor entering the police station.</p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/gate")}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="register-error">
            <span>!</span>
            {error}
          </div>
        )}

        {/* FORM */}

        <form className="visitor-form" onSubmit={handleSubmit(onSubmit)}>
          {/* =================================================
              01 IDENTIFY VISITOR
          ================================================= */}

          <section className="form-section">
            <div className="section-heading">
              <div className="section-number">01</div>

              <div>
                <h2>Identify Visitor</h2>

                <p>Check whether this person has visited before.</p>
              </div>
            </div>

            <div className="mobile-check-row">
              <div className="form-field mobile-field">
                <label>
                  Mobile Number <span>*</span>
                </label>

                <input
                  type="tel"
                  maxLength="10"
                  placeholder="Enter 10-digit mobile number"
                  {...register("mobileNumber", {
                    required: "Mobile number is required.",
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: "Enter a valid 10-digit Indian mobile number.",
                    },
                  })}
                />

                {errors.mobileNumber && (
                  <small className="field-error">
                    {errors.mobileNumber.message}
                  </small>
                )}
              </div>

              <button
                type="button"
                className="check-button"
                onClick={handleCheckMobile}
                disabled={checkingMobile}
              >
                {checkingMobile ? "Checking..." : "Check Visitor"}
              </button>
            </div>

            {existingVisitor && (
              <div className="existing-visitor-card">
                <div className="existing-photo">
                  {existingVisitor.photoData ? (
                    <img
                      src={existingVisitor.photoData}
                      alt={existingVisitor.fullName}
                    />
                  ) : (
                    <span>
                      {existingVisitor.fullName?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="existing-info">
                  <span className="existing-label">EXISTING VISITOR</span>

                  <h3>{existingVisitor.fullName}</h3>

                  <p>{existingVisitor.mobileNumber}</p>

                  <strong>{existingVisitor.visitorCode}</strong>
                </div>

                <div className="existing-badge">Found</div>
              </div>
            )}
          </section>

          {/* =================================================
              02 VISITOR DETAILS
          ================================================= */}

          <section className="form-section">
            <div className="section-heading">
              <div className="section-number">02</div>

              <div>
                <h2>Visitor Details</h2>

                <p>Enter the visitor's basic information.</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>
                  Full Name <span>*</span>
                </label>

                <input
                  type="text"
                  placeholder="Enter full name"
                  disabled={!!existingVisitor}
                  {...register("fullName", {
                    required: "Full name is required.",
                  })}
                />

                {errors.fullName && (
                  <small className="field-error">
                    {errors.fullName.message}
                  </small>
                )}
              </div>

              <div className="form-field">
                <label>Mobile Number</label>

                <input type="text" value={mobileNumber || ""} disabled />
              </div>

              <div className="form-field full-width">
                <label>Address</label>

                <textarea
                  rows="3"
                  placeholder="Enter visitor address"
                  disabled={!!existingVisitor}
                  {...register("address")}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              03 PHOTO
          ================================================= */}

          {!existingVisitor && (
            <section className="form-section">
              <div className="section-heading">
                <div className="section-number">03</div>

                <div>
                  <h2>Visitor Photo</h2>

                  <p>Capture from camera or choose a photo from the device.</p>
                </div>
              </div>

              <div className="photo-upload-area">
                {!photoPreview ? (
                  <div className="photo-options">
                    {/* CAMERA */}

                    <button
                      type="button"
                      className="photo-option camera-option"
                      onClick={openCamera}
                    >
                      <div className="photo-option-icon">📷</div>

                      <strong>Capture from Camera</strong>

                      <span>Take visitor photo now</span>
                    </button>

                    {/* DEVICE */}

                    <label className="photo-option device-option">
                      <div className="photo-option-icon">🖼️</div>

                      <strong>Choose from Device</strong>

                      <span>JPG, PNG or WEBP</span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="photo-preview-container">
                    <img
                      src={photoPreview}
                      alt="Visitor preview"
                      className="photo-preview"
                    />

                    <div className="photo-size-info">
                      <span>Photo ready</span>

                      <strong>{formatFileSize(photoFile?.size)}</strong>

                      <small>Compressed below 1 MB</small>
                    </div>

                    <div className="photo-preview-actions">
                      <button
                        type="button"
                        className="retake-photo-button"
                        onClick={openCamera}
                      >
                        📷 Retake
                      </button>

                      <label className="change-photo-button">
                        🖼️ Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                        />
                      </label>

                      <button
                        type="button"
                        className="remove-photo"
                        onClick={removePhoto}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CAMERA MODAL */}

              {cameraOpen && (
                <div className="camera-overlay">
                  <div className="camera-modal">
                    <div className="camera-header">
                      <div>
                        <span>CAMERA</span>

                        <h3>Capture Visitor Photo</h3>
                      </div>

                      <button
                        type="button"
                        className="camera-close"
                        onClick={closeCamera}
                      >
                        ×
                      </button>
                    </div>

                    {cameraError ? (
                      <div className="camera-error">
                        <span>!</span>

                        {cameraError}
                      </div>
                    ) : (
                      <div className="camera-preview">
                        <video ref={videoRef} autoPlay playsInline muted />

                        <div className="camera-frame">
                          <span></span>
                        </div>
                      </div>
                    )}

                    <canvas
                      ref={canvasRef}
                      style={{
                        display: "none",
                      }}
                    />

                    <div className="camera-actions">
                      <button
                        type="button"
                        className="camera-cancel-button"
                        onClick={closeCamera}
                      >
                        Cancel
                      </button>

                      {!cameraError && (
                        <button
                          type="button"
                          className="capture-button"
                          onClick={capturePhoto}
                        >
                          <span className="capture-circle">📷</span>
                          Capture Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* =================================================
              PURPOSE
          ================================================= */}

          <section className="form-section">
            <div className="section-heading">
              <div className="section-number">
                {existingVisitor ? "03" : "04"}
              </div>

              <div>
                <h2>Purpose of Visit</h2>

                <p>Select why the visitor is entering.</p>
              </div>
            </div>

            <div className="purpose-grid">
              <label className="purpose-option">
                <input
                  type="radio"
                  value="Petition / Complaint"
                  {...register("purpose", {
                    required: "Purpose of visit is required.",
                  })}
                />

                <span className="purpose-content">
                  <strong>Petition / Complaint</strong>

                  <small>Visitor has a complaint or petition.</small>
                </span>
              </label>

              <label className="purpose-option">
                <input
                  type="radio"
                  value="Meeting"
                  {...register("purpose", {
                    required: "Purpose of visit is required.",
                  })}
                />

                <span className="purpose-content">
                  <strong>Meeting</strong>

                  <small>Visitor is attending a meeting.</small>
                </span>
              </label>

              <label className="purpose-option">
                <input
                  type="radio"
                  value="Other"
                  {...register("purpose", {
                    required: "Purpose of visit is required.",
                  })}
                />

                <span className="purpose-content">
                  <strong>Other</strong>

                  <small>Any other official purpose.</small>
                </span>
              </label>
            </div>

            {errors.purpose && (
              <small className="field-error">{errors.purpose.message}</small>
            )}
          </section>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate("/gate")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting
                ? "Registering..."
                : existingVisitor
                  ? "Create New Visit"
                  : "Register Visitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterVisitor;

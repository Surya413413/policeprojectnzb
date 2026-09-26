import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaPlus,
  FaSearch,
  FaUsers,
  FaUserShield,
  FaUserTie,
  FaUserCheck,
  FaUserClock,
  FaCircle,
  FaTimes,
  FaSave,
} from "react-icons/fa";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../../firebase/config";
import { useLanguage } from "../../context/LanguageContext";

import "../../styles/CommissionerStaff.css";

const CommissionerStaff = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showAddStaff, setShowAddStaff] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "WATCHMAN",
  });

  // =========================================================
  // LIVE STAFF DATA
  // =========================================================

  useEffect(() => {
    const staffQuery = query(
      collection(db, "staff"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      staffQuery,
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setStaff(records);
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        console.error("Staff listener error:", snapshotError);

        setError(
          "Unable to load staff records. Please check Firestore permissions.",
        );

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // FILTERED STAFF
  // =========================================================

  const filteredStaff = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return staff.filter((member) => {
      const name = String(member.name || "").toLowerCase();
      const email = String(member.email || "").toLowerCase();
      const mobile = String(member.mobile || "").toLowerCase();

      const role = String(member.role || "").toUpperCase();

      const status = String(member.status || "ACTIVE").toUpperCase();

      const matchesSearch =
        !searchValue ||
        name.includes(searchValue) ||
        email.includes(searchValue) ||
        mobile.includes(searchValue);

      const matchesRole = roleFilter === "ALL" || role === roleFilter;

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staff, search, roleFilter, statusFilter]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalStaff = staff.length;

  const activeStaff = staff.filter(
    (member) => String(member.status || "ACTIVE").toUpperCase() === "ACTIVE",
  ).length;

  const watchmen = staff.filter(
    (member) => String(member.role || "").toUpperCase() === "WATCHMAN",
  ).length;

  const policeOfficers = staff.filter(
    (member) => String(member.role || "").toUpperCase() === "POLICE",
  ).length;

  // =========================================================
  // FORM HANDLER
  // =========================================================

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // OPEN ADD STAFF
  // =========================================================

  const openAddStaff = () => {
    setError("");
    setSuccess("");

    setFormData({
      name: "",
      email: "",
      mobile: "",
      role: "WATCHMAN",
    });

    setShowAddStaff(true);
  };

  // =========================================================
  // CLOSE ADD STAFF
  // =========================================================

  const closeAddStaff = () => {
    if (saving) return;

    setShowAddStaff(false);

    setFormData({
      name: "",
      email: "",
      mobile: "",
      role: "WATCHMAN",
    });
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const mobile = formData.mobile.trim();

    if (!name) {
      return "Please enter staff name.";
    }

    if (!email) {
      return "Please enter staff email.";
    }

    if (!email.includes("@")) {
      return "Please enter a valid email address.";
    }

    if (!mobile) {
      return "Please enter mobile number.";
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      return "Mobile number must contain 10 digits.";
    }

    if (!["WATCHMAN", "POLICE"].includes(formData.role)) {
      return "Please select a valid staff role.";
    }

    return "";
  };

  // =========================================================
  // ADD STAFF
  // =========================================================

  const handleAddStaff = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const staffData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        role: formData.role,
        status: "PENDING_AUTH",
        authStatus: "NOT_CREATED",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "staff"), staffData);

      setSuccess(
        "Staff profile created. Now create the Firebase Authentication account for this staff member.",
      );

      setFormData({
        name: "",
        email: "",
        mobile: "",
        role: "WATCHMAN",
      });

      setShowAddStaff(false);
    } catch (addError) {
      console.error("Add staff error:", addError);

      setError(
        "Unable to create staff profile. Please check your permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (value) => {
    if (!value) return "—";

    try {
      const date =
        typeof value?.toDate === "function" ? value.toDate() : new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // =========================================================
  // ROLE LABEL
  // =========================================================

  const getRoleLabel = (role) => {
    const normalized = String(role || "").toUpperCase();

    if (normalized === "WATCHMAN") {
      return "Watchman";
    }

    if (normalized === "POLICE") {
      return "Police Officer";
    }

    if (normalized === "COMMISSIONER") {
      return "Commissioner";
    }

    return role || "—";
  };

  // =========================================================
  // STATUS LABEL
  // =========================================================

  const getStatusLabel = (member) => {
    const status = String(member.status || "ACTIVE").toUpperCase();

    if (status === "PENDING_AUTH") {
      return "Pending Auth";
    }

    if (status === "ACTIVE") {
      return "Active";
    }

    if (status === "DISABLED") {
      return "Disabled";
    }

    return status;
  };

  return (
    <div className="commissioner-staff-page">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="commissioner-staff-header">
        <div className="commissioner-staff-header-left">
          <button
            type="button"
            className="staff-back-button"
            onClick={() => navigate("/commissioner")}
            title={t("staff.backToDashboard")}
          >
            <FaArrowLeft />
          </button>

          <div>
            <span className="staff-page-label">{t("staff.commissioner")}</span>

            <h1>{t("staff.title")}</h1>

            <p>{t("staff.subtitle")}</p>
          </div>
        </div>

        <button
          type="button"
          className="staff-add-button"
          onClick={openAddStaff}
        >
          <FaPlus />
          <span>{t("staff.addStaff")}</span>
        </button>
      </header>

      {/* =====================================================
          SUCCESS
          ===================================================== */}

      {success && (
        <div className="staff-success">
          <FaUserCheck />

          <span>{success}</span>

          <button type="button" onClick={() => setSuccess("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="staff-error">
          <span>{error}</span>

          <button type="button" onClick={() => setError("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* =====================================================
          STATISTICS
          ===================================================== */}

      <section className="staff-stats-grid">
        <div className="staff-stat-card">
          <div className="staff-stat-icon blue">
            <FaUsers />
          </div>

          <div>
            <span>{t("staff.totalStaff")}</span>

            <strong>{loading ? "—" : totalStaff}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon green">
            <FaUserCheck />
          </div>

          <div>
            <span>{t("staff.activeStaff")}</span>

            <strong>{loading ? "—" : activeStaff}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon orange">
            <FaUserShield />
          </div>

          <div>
            <span>{t("staff.watchmen")}</span>

            <strong>{loading ? "—" : watchmen}</strong>
          </div>
        </div>

        <div className="staff-stat-card">
          <div className="staff-stat-icon purple">
            <FaUserTie />
          </div>

          <div>
            <span>{t("staff.policeOfficers")}</span>

            <strong>{loading ? "—" : policeOfficers}</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          STAFF DIRECTORY
          ===================================================== */}

      <section className="staff-directory-panel">
        <div className="staff-directory-header">
          <div>
            <span className="staff-section-label">
              {t("staff.staffDirectory")}
            </span>

            <h2>
              {filteredStaff.length} {t("staff.records")}
            </h2>
          </div>

          <div className="staff-live-status">
            <FaCircle />
            Live
          </div>
        </div>

        {/* ===================================================
            FILTERS
            =================================================== */}

        <div className="staff-filter-bar">
          <div className="staff-search">
            <FaSearch />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("staff.searchPlaceholder")}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="staff-filter-select"
          >
            <option value="ALL">{t("staff.allRoles")}</option>

            <option value="WATCHMAN">{t("staff.watchmen")}</option>

            <option value="POLICE">{t("staff.policeOfficers")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="staff-filter-select"
          >
            <option value="ALL">{t("staff.allStatus")}</option>

            <option value="ACTIVE">{t("staff.active")}</option>

            <option value="DISABLED">{t("staff.disabled")}</option>

            <option value="PENDING_AUTH">Pending Auth</option>
          </select>
        </div>

        {/* ===================================================
            TABLE
            =================================================== */}

        <div className="staff-table-wrapper">
          {loading ? (
            <div className="staff-empty-state">
              <FaUserClock />

              <strong>{t("staff.loading")}</strong>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="staff-empty-state">
              <FaUsers />

              <strong>{t("staff.noStaff")}</strong>

              <span>{t("staff.noStaffMessage")}</span>
            </div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>{t("staff.staffMember")}</th>

                  <th>{t("staff.role")}</th>

                  <th>{t("staff.contact")}</th>

                  <th>{t("staff.status")}</th>

                  <th>{t("staff.created")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((member) => {
                  const status = String(
                    member.status || "ACTIVE",
                  ).toUpperCase();

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="staff-member-cell">
                          <div className="staff-avatar">
                            {String(member.name || "S")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>{member.name || "—"}</strong>

                            <span>{member.email || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`staff-role-badge ${String(
                            member.role || "",
                          ).toLowerCase()}`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </td>

                      <td>
                        <span className="staff-mobile">
                          {member.mobile || "—"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`staff-status-badge ${
                            status === "ACTIVE"
                              ? "active"
                              : status === "PENDING_AUTH"
                                ? "pending"
                                : "disabled"
                          }`}
                        >
                          <FaCircle />

                          {getStatusLabel(member)}
                        </span>
                      </td>

                      <td>
                        <span className="staff-created-date">
                          {formatDate(member.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* =====================================================
          ADD STAFF MODAL
          ===================================================== */}

      {showAddStaff && (
        <div
          className="staff-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddStaff();
            }
          }}
        >
          <div className="staff-modal">
            <div className="staff-modal-header">
              <div>
                <span>Staff Management</span>

                <h2>Add Staff</h2>
              </div>

              <button
                type="button"
                className="staff-modal-close"
                onClick={closeAddStaff}
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="staff-form">
              <div className="staff-form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Enter full name"
                  autoComplete="off"
                />
              </div>

              <div className="staff-form-group">
                <label>Email Address</label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Enter email address"
                  autoComplete="off"
                />
              </div>

              <div className="staff-form-group">
                <label>Mobile Number</label>

                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleFormChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              <div className="staff-form-group">
                <label>Staff Role</label>

                <select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                >
                  <option value="WATCHMAN">Watchman</option>

                  <option value="POLICE">Police Officer</option>
                </select>
              </div>

              <div className="staff-auth-note">
                <FaUserShield />

                <div>
                  <strong>Firebase login</strong>

                  <span>
                    After creating this profile, create the corresponding
                    Firebase Authentication account manually from Firebase
                    Console.
                  </span>
                </div>
              </div>

              <div className="staff-modal-actions">
                <button
                  type="button"
                  className="staff-cancel-button"
                  onClick={closeAddStaff}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="staff-save-button"
                  disabled={saving}
                >
                  <FaSave />

                  {saving ? "Saving..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionerStaff;

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../../firebase/config";
import { getCurrentUserRole } from "../../services/authService";
import {
  subscribeToAllVisits,
  subscribeToVisitors,
} from "../../services/gateService";
import "../../styles/PoliceReports.css";

const REPORT_TYPES = [
  { value: "visitors", label: "Visitor Report" },
  { value: "visits", label: "Visit / Movement Report" },
  { value: "active-cases", label: "Active Cases Report" },
  { value: "closed-cases", label: "Closed Cases Report" },
  { value: "pending-cases", label: "Pending Cases Report" },
  { value: "case-actions", label: "Case Action Report" },
  { value: "evidence", label: "Evidence Report" },
  { value: "ai-analysis", label: "AI Analysis Report" },
];

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const dateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateValue = (visit) =>
  toDate(visit?.entryTime || visit?.createdAt || visit?.updatedAt);

const getCaseStatus = (visit) =>
  visit?.caseStatus || visit?.caseAction?.status || "No Case";

const isCase = (visit) =>
  Boolean(
    visit?.caseStatus ||
    visit?.caseAction ||
    visit?.aiStatus ||
    visit?.aiProblemSummary ||
    visit?.voiceData ||
    visit?.documentData ||
    visit?.voiceEvidence?.length ||
    visit?.documentEvidence?.length,
  );

const getVoiceCount = (visit) =>
  Array.isArray(visit?.voiceEvidence)
    ? visit.voiceEvidence.length
    : visit?.voiceData
      ? 1
      : 0;

const getDocumentCount = (visit) =>
  Array.isArray(visit?.documentEvidence)
    ? visit.documentEvidence.length
    : visit?.documentData
      ? 1
      : 0;

const escapeCsv = (value) => {
  const text = String(value ?? "").replace(/\r?\n|\r/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function PoliceReports() {
  const navigate = useNavigate();
  const today = dateInputValue(new Date());
  const firstDay = dateInputValue(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [officer, setOfficer] = useState({ name: "", email: "" });
  const [visits, setVisits] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [reportType, setReportType] = useState("visitors");
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDateValue, setToDateValue] = useState(today);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const userRole = await getCurrentUserRole();
        if (userRole?.role !== "POLICE") {
          navigate("/login", { replace: true });
          return;
        }
        setOfficer({
          name: userRole?.name || user.displayName || "Police Officer",
          email: userRole?.email || user.email || "",
        });
      } catch (err) {
        console.error("Police report officer error:", err);
        setOfficer({
          name: user.displayName || "Police Officer",
          email: user.email || "",
        });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let visitsReady = false;
    let visitorsReady = false;
    const updateLoading = () => {
      if (visitsReady && visitorsReady) setLoading(false);
    };

    const unsubscribeVisits = subscribeToAllVisits(
      (data) => {
        setVisits(data || []);
        visitsReady = true;
        updateLoading();
      },
      (err) => {
        console.error("Police reports visits error:", err);
        setError("Unable to load visit records.");
        visitsReady = true;
        updateLoading();
      },
    );

    const unsubscribeVisitors = subscribeToVisitors(
      (data) => {
        setVisitors(data || []);
        visitorsReady = true;
        updateLoading();
      },
      (err) => {
        console.error("Police reports visitors error:", err);
        setError("Unable to load visitor records.");
        visitorsReady = true;
        updateLoading();
      },
    );

    return () => {
      if (typeof unsubscribeVisits === "function") unsubscribeVisits();
      if (typeof unsubscribeVisitors === "function") unsubscribeVisitors();
    };
  }, []);

  const visitorMap = useMemo(
    () => new Map(visitors.map((visitor) => [visitor.id, visitor])),
    [visitors],
  );

  const filteredVisits = useMemo(() => {
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDateValue ? new Date(`${toDateValue}T23:59:59.999`) : null;
    const query = search.trim().toLowerCase();

    return visits.filter((visit) => {
      const date = getDateValue(visit);
      if (from && (!date || date < from)) return false;
      if (to && (!date || date > to)) return false;

      if (!query) return true;
      const visitor = visitorMap.get(visit.visitorId);
      const haystack = [
        visitor?.fullName,
        visitor?.mobileNumber,
        visitor?.visitorCode,
        visit?.visitorCode,
        visit?.purpose,
        visit?.caseStatus,
        visit?.caseAction?.status,
        visit?.caseAction?.assignedOfficer,
        visit?.caseAction?.officerName,
        visit?.aiProblemSummary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [visits, visitorMap, fromDate, toDateValue, search]);

  const reportRows = useMemo(() => {
    if (reportType === "visitors") {
      const unique = new Map();
      filteredVisits.forEach((visit) => {
        const visitor = visitorMap.get(visit.visitorId);
        if (!unique.has(visit.visitorId))
          unique.set(visit.visitorId, { visitor, visit });
      });
      return Array.from(unique.values()).map(({ visitor, visit }) => ({
        "Visitor ID":
          visitor?.visitorCode || visit?.visitorCode || visit?.visitorId || "—",
        "Full Name": visitor?.fullName || "—",
        Mobile: visitor?.mobileNumber || "—",
        Address: visitor?.address || "—",
        Purpose: visit?.purpose || "—",
        "Last Visit": formatDateTime(visit?.entryTime),
      }));
    }

    if (reportType === "visits") {
      return filteredVisits.map((visit) => {
        const visitor = visitorMap.get(visit.visitorId);
        return {
          "Visit ID": visit.id,
          "Visitor Name": visitor?.fullName || "—",
          Mobile: visitor?.mobileNumber || "—",
          Purpose: visit.purpose || "—",
          Entry: formatDateTime(visit.entryTime),
          Exit: formatDateTime(visit.exitTime),
          Status: visit.status || "—",
        };
      });
    }

    if (reportType === "case-actions") {
      return filteredVisits.filter(isCase).flatMap((visit) => {
        const visitor = visitorMap.get(visit.visitorId);
        const action = visit.caseAction || {};
        return [
          {
            "Case / Visit ID": visit.id,
            "Visitor Name": visitor?.fullName || "—",
            Action: action.actionType || "—",
            Status: action.status || getCaseStatus(visit),
            Priority: action.priority || visit.casePriority || "—",
            "Assigned Officer":
              action.assignedOfficer || action.officerName || "—",
            "Next Action": action.nextActionDate || "—",
            Remarks: action.officerRemarks || "—",
            "Recorded On": formatDateTime(action.createdAt),
          },
        ];
      });
    }

    return filteredVisits
      .filter((visit) => {
        const status = String(getCaseStatus(visit)).toLowerCase();
        if (reportType === "active-cases")
          return isCase(visit) && status !== "closed";
        if (reportType === "closed-cases")
          return isCase(visit) && status === "closed";
        if (reportType === "pending-cases") {
          return (
            isCase(visit) &&
            status !== "closed" &&
            Boolean(visit.caseAction?.nextActionDate)
          );
        }
        if (reportType === "evidence")
          return (
            isCase(visit) &&
            (getVoiceCount(visit) > 0 || getDocumentCount(visit) > 0)
          );
        if (reportType === "ai-analysis")
          return (
            isCase(visit) &&
            (visit.aiStatus === "ANALYZED" || visit.aiProblemSummary)
          );
        return false;
      })
      .map((visit) => {
        const visitor = visitorMap.get(visit.visitorId);
        return {
          "Case / Visit ID": visit.id,
          "Visitor Name": visitor?.fullName || "—",
          Status: getCaseStatus(visit),
          Priority: visit.casePriority || visit.caseAction?.priority || "—",
          "Assigned Officer":
            visit.caseAction?.assignedOfficer ||
            visit.caseAction?.officerName ||
            "—",
          "Voice Evidence": getVoiceCount(visit),
          "Document Evidence": getDocumentCount(visit),
          "AI Status": visit.aiStatus || "Pending",
          "Problem Summary": visit.aiProblemSummary || "—",
          "Last Updated": formatDateTime(visit.updatedAt || visit.entryTime),
        };
      });
  }, [filteredVisits, visitorMap, reportType]);

  const summary = useMemo(
    () => ({
      records: reportRows.length,
      totalVisits: filteredVisits.length,
      cases: filteredVisits.filter(isCase).length,
      closed: filteredVisits.filter(
        (v) => isCase(v) && String(getCaseStatus(v)).toLowerCase() === "closed",
      ).length,
      active: filteredVisits.filter(
        (v) => isCase(v) && String(getCaseStatus(v)).toLowerCase() !== "closed",
      ).length,
    }),
    [filteredVisits, reportRows],
  );

  const reportLabel =
    REPORT_TYPES.find((item) => item.value === reportType)?.label ||
    "Police Report";
  const filenameBase = `policesetu-${reportType}-${fromDate || "all"}-${toDateValue || "all"}`;

  const downloadCsv = () => {
    if (!reportRows.length) {
      setError("There are no records matching the selected filters.");
      return;
    }
    const columns = Object.keys(reportRows[0]);
    const csv = [
      columns.map(escapeCsv).join(","),
      ...reportRows.map((row) =>
        columns.map((column) => escapeCsv(row[column])).join(","),
      ),
    ].join("\r\n");
    downloadBlob(
      `\ufeff${csv}`,
      `${filenameBase}.csv`,
      "text/csv;charset=utf-8;",
    );
  };

  const printReport = () => {
    if (!reportRows.length) {
      setError("There are no records matching the selected filters.");
      return;
    }
    window.print();
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Police report logout error:", err);
      setLoggingOut(false);
      setError("Unable to logout. Please try again.");
    }
  };

  return (
    <div className="police-reports-page">
      <header className="police-reports-header no-print">
        <button
          className="reports-back-button"
          onClick={() => navigate("/police")}
          type="button"
        >
          ← Dashboard
        </button>
        <div>
          <span>POLICESETU AI</span>
          <strong>Police Reports</strong>
        </div>
        <div className="reports-header-user">
          <span>{officer.name || "Police Officer"}</span>
          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      <main className="police-reports-main">
        <section className="reports-title-row">
          <div>
            <span className="reports-eyebrow">REPORT CENTER</span>
            <h1>Police Reports</h1>
            <p>
              Generate operational reports from the current visitor and case
              records.
            </p>
          </div>
        </section>

        {error && <div className="reports-error no-print">{error}</div>}

        <section className="reports-filter-card no-print">
          <div className="reports-filter-grid">
            <label>
              Report Type
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                {REPORT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              From Date
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              To Date
              <input
                type="date"
                value={toDateValue}
                onChange={(e) => setToDateValue(e.target.value)}
              />
            </label>
            <label>
              Search
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, mobile, case, officer..."
              />
            </label>
          </div>
          <div className="reports-actions">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={loading || !reportRows.length}
            >
              ↓ Download Excel / CSV
            </button>
            <button
              type="button"
              className="secondary"
              onClick={printReport}
              disabled={loading || !reportRows.length}
            >
              🖨 Print / Save PDF
            </button>
          </div>
          <small className="reports-note">
            The Excel download is CSV format, which opens directly in Microsoft
            Excel and Google Sheets. PDF uses the browser print dialog's “Save
            as PDF”.
          </small>
        </section>

        <section className="reports-summary-grid">
          <div>
            <span>Report Records</span>
            <strong>{loading ? "—" : summary.records}</strong>
          </div>
          <div>
            <span>Visits</span>
            <strong>{loading ? "—" : summary.totalVisits}</strong>
          </div>
          <div>
            <span>Active Cases</span>
            <strong>{loading ? "—" : summary.active}</strong>
          </div>
          <div>
            <span>Closed Cases</span>
            <strong>{loading ? "—" : summary.closed}</strong>
          </div>
        </section>

        <section className="report-print-area">
          <div className="report-print-header">
            <div>
              <span>POLICESETU AI</span>
              <h2>{reportLabel}</h2>
            </div>
            <div>
              <strong>Reporting Period</strong>
              <p>
                {fromDate || "All"} → {toDateValue || "All"}
              </p>
              <small>Generated: {formatDateTime(new Date())}</small>
            </div>
          </div>

          {loading ? (
            <div className="reports-empty">Loading report data...</div>
          ) : !reportRows.length ? (
            <div className="reports-empty">
              No records found for the selected report and date range.
            </div>
          ) : (
            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    {Object.keys(reportRows[0]).map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row, index) => (
                    <tr key={index}>
                      {Object.keys(reportRows[0]).map((column) => (
                        <td key={column}>{String(row[column] ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

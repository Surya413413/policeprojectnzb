import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";

import { db } from "../../firebase/config";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/CommissionerReports.css";

/* =========================================================
   DATE HELPERS
========================================================= */

const toDate = (value) => {
  if (!value) return null;

  try {
    if (typeof value?.toDate === "function") {
      return value.toDate();
    }

    const d = new Date(value);

    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const dateKey = (value) => {
  const d = toDate(value);

  if (!d) return "";

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) => {
  const d = toDate(value);

  return d ? d.toLocaleString("en-IN") : "—";
};

/* =========================================================
   CASE HELPERS
========================================================= */

const isCase = (visit) =>
  Boolean(
    visit?.caseStatus ||
    visit?.caseAction ||
    visit?.aiStatus ||
    visit?.aiProblemSummary ||
    visit?.voiceEvidence?.length ||
    visit?.documentEvidence?.length ||
    visit?.voiceData ||
    visit?.documentData,
  );

const getStatus = (visit) =>
  String(
    visit?.caseStatus || visit?.caseAction?.status || "Under Verification",
  ).trim();

const getPriority = (visit) =>
  String(visit?.casePriority || visit?.caseAction?.priority || "Medium").trim();

const evidenceCount = (visit) => {
  const voices = Array.isArray(visit?.voiceEvidence)
    ? visit.voiceEvidence.length
    : visit?.voiceData
      ? 1
      : 0;

  const docs = Array.isArray(visit?.documentEvidence)
    ? visit.documentEvidence.length
    : visit?.documentData
      ? 1
      : 0;

  return voices + docs;
};

/* =========================================================
   CSV HELPERS
========================================================= */

const csvEscape = (value) =>
  `"${String(value ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/"/g, '""')}"`;

const downloadCsv = (rows, filename) => {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);

  a.click();

  a.remove();

  URL.revokeObjectURL(url);
};

/* =========================================================
   LOCAL REPORT TRANSLATIONS
   These translate UI/report wording only.
   Database values remain unchanged.
========================================================= */

const reportTranslations = {
  en: {
    commissionerPortal: "COMMISSIONER PORTAL",
    reportsAnalytics: "Reports & Analytics",
    readOnlyReporting: "Read-only administrative reporting and oversight.",
    dashboard: "Dashboard",

    allCases: "All Cases",
    openCases: "Open Cases",
    closedCases: "Closed Cases",
    priorityCases: "High / Urgent Cases",
    evidenceCases: "Cases With Evidence",
    aiCases: "AI Analyzed Cases",
    visitorReport: "Visitor Report",
    visitReport: "Visit / Movement Report",

    searchPlaceholder: "Search visitor, mobile, code or officer...",

    downloadCsv: "↓ Download CSV / Excel",
    printPdf: "🖨 Print / Save PDF",

    visitors: "Visitors",
    visits: "Visits",
    cases: "Cases",
    open: "Open Cases",
    closed: "Closed Cases",
    highUrgent: "High / Urgent",
    aiAnalyzed: "AI Analyzed",
    evidenceItems: "Evidence Items",

    reportData: "REPORT DATA",
    caseReport: "Case Report",
    records: "records",

    loadingReport: "Loading report...",
    noRecords: "No records found.",

    caseOversight: "CASE OVERSIGHT",
    openCasesByOfficer: "Open Cases by Officer",
    officers: "officers",
    noOpenAssignedCases: "No open assigned cases.",
    openCase: "open case",
    openCasesPlural: "open cases",

    commissionerReadOnly:
      "Commissioner access is read-only. Operational case changes remain in the police workflow.",

    unableVisitorData: "Unable to load visitor data.",
    unableVisitData: "Unable to load visit data.",
    noSelectedReport: "There are no records for the selected report.",

    visitorName: "Visitor Name",
    mobile: "Mobile",
    visitorCode: "Visitor Code",
    address: "Address",
    visitsInPeriod: "Visits In Period",

    visitor: "Visitor",
    purpose: "Purpose",
    caseStatus: "Case Status",
    priority: "Priority",
    assignedOfficer: "Assigned Officer",
    evidence: "Evidence",
    aiStatus: "AI Status",
    entryTime: "Entry Time",

    unknownVisitor: "Unknown Visitor",
    noCase: "No Case",
    unassigned: "Unassigned",

    underVerification: "Under Verification",
    new: "New",
    evidenceCollection: "Evidence Collection",
    referred: "Referred",
    complaintRegistered: "Complaint Registered",
    firRegistered: "FIR Registered",
    closedStatus: "Closed",

    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",

    pending: "PENDING",
    analyzed: "ANALYZED",
  },

  hi: {
    commissionerPortal: "कमिश्नर पोर्टल",
    reportsAnalytics: "रिपोर्ट और विश्लेषण",
    readOnlyReporting: "केवल-पठन प्रशासनिक रिपोर्टिंग और निगरानी।",
    dashboard: "डैशबोर्ड",

    allCases: "सभी मामले",
    openCases: "खुले मामले",
    closedCases: "बंद मामले",
    priorityCases: "उच्च / अत्यावश्यक मामले",
    evidenceCases: "साक्ष्य वाले मामले",
    aiCases: "AI द्वारा विश्लेषित मामले",
    visitorReport: "आगंतुक रिपोर्ट",
    visitReport: "मुलाकात / गतिविधि रिपोर्ट",

    searchPlaceholder: "आगंतुक, मोबाइल, कोड या अधिकारी खोजें...",

    downloadCsv: "↓ CSV / Excel डाउनलोड करें",
    printPdf: "🖨 प्रिंट / PDF सेव करें",

    visitors: "आगंतुक",
    visits: "मुलाकातें",
    cases: "मामले",
    open: "खुले मामले",
    closed: "बंद मामले",
    highUrgent: "उच्च / अत्यावश्यक",
    aiAnalyzed: "AI द्वारा विश्लेषित",
    evidenceItems: "साक्ष्य आइटम",

    reportData: "रिपोर्ट डेटा",
    caseReport: "केस रिपोर्ट",
    records: "रिकॉर्ड",

    loadingReport: "रिपोर्ट लोड हो रही है...",
    noRecords: "कोई रिकॉर्ड नहीं मिला।",

    caseOversight: "केस निगरानी",
    openCasesByOfficer: "अधिकारी के अनुसार खुले मामले",
    officers: "अधिकारी",
    noOpenAssignedCases: "कोई खुला नियुक्त मामला नहीं है।",
    openCase: "खुला मामला",
    openCasesPlural: "खुले मामले",

    commissionerReadOnly:
      "कमिश्नर की पहुंच केवल-पठन है। केस में परिचालन परिवर्तन पुलिस वर्कफ़्लो में किए जाते हैं।",

    unableVisitorData: "आगंतुक डेटा लोड नहीं किया जा सका।",
    unableVisitData: "मुलाकात डेटा लोड नहीं किया जा सका।",
    noSelectedReport: "चयनित रिपोर्ट के लिए कोई रिकॉर्ड नहीं है।",

    visitorName: "आगंतुक का नाम",
    mobile: "मोबाइल",
    visitorCode: "आगंतुक कोड",
    address: "पता",
    visitsInPeriod: "अवधि में मुलाकातें",

    visitor: "आगंतुक",
    purpose: "उद्देश्य",
    caseStatus: "केस स्थिति",
    priority: "प्राथमिकता",
    assignedOfficer: "नियुक्त अधिकारी",
    evidence: "साक्ष्य",
    aiStatus: "AI स्थिति",
    entryTime: "प्रवेश समय",

    unknownVisitor: "अज्ञात आगंतुक",
    noCase: "कोई केस नहीं",
    unassigned: "नियुक्त नहीं",

    underVerification: "सत्यापन के अंतर्गत",
    new: "नया",
    evidenceCollection: "साक्ष्य संग्रह",
    referred: "संदर्भित",
    complaintRegistered: "शिकायत दर्ज",
    firRegistered: "FIR दर्ज",
    closedStatus: "बंद",

    low: "कम",
    medium: "मध्यम",
    high: "उच्च",
    urgent: "अत्यावश्यक",

    pending: "लंबित",
    analyzed: "विश्लेषित",
  },

  te: {
    commissionerPortal: "కమిషనర్ పోర్టల్",
    reportsAnalytics: "నివేదికలు & విశ్లేషణ",
    readOnlyReporting:
      "చదవడానికి మాత్రమే ఉన్న పరిపాలనా నివేదికలు మరియు పర్యవేక్షణ.",
    dashboard: "డాష్‌బోర్డ్",

    allCases: "అన్ని కేసులు",
    openCases: "తెరిచి ఉన్న కేసులు",
    closedCases: "మూసివేసిన కేసులు",
    priorityCases: "అధిక / అత్యవసర కేసులు",
    evidenceCases: "సాక్ష్యాలు ఉన్న కేసులు",
    aiCases: "AI ద్వారా విశ్లేషించిన కేసులు",
    visitorReport: "సందర్శకుల నివేదిక",
    visitReport: "సందర్శన / కదలికల నివేదిక",

    searchPlaceholder: "సందర్శకుడు, మొబైల్, కోడ్ లేదా అధికారిని శోధించండి...",

    downloadCsv: "↓ CSV / Excel డౌన్‌లోడ్ చేయండి",
    printPdf: "🖨 ప్రింట్ / PDF సేవ్ చేయండి",

    visitors: "సందర్శకులు",
    visits: "సందర్శనలు",
    cases: "కేసులు",
    open: "తెరిచి ఉన్న కేసులు",
    closed: "మూసివేసిన కేసులు",
    highUrgent: "అధిక / అత్యవసర",
    aiAnalyzed: "AI విశ్లేషించినవి",
    evidenceItems: "సాక్ష్య అంశాలు",

    reportData: "నివేదిక డేటా",
    caseReport: "కేసు నివేదిక",
    records: "రికార్డులు",

    loadingReport: "నివేదిక లోడ్ అవుతోంది...",
    noRecords: "రికార్డులు కనబడలేదు.",

    caseOversight: "కేసు పర్యవేక్షణ",
    openCasesByOfficer: "అధికారి వారీగా తెరిచి ఉన్న కేసులు",
    officers: "అధికారులు",
    noOpenAssignedCases: "తెరిచి ఉన్న కేటాయించిన కేసులు లేవు.",
    openCase: "తెరిచి ఉన్న కేసు",
    openCasesPlural: "తెరిచి ఉన్న కేసులు",

    commissionerReadOnly:
      "కమిషనర్ యాక్సెస్ చదవడానికి మాత్రమే. కేసు నిర్వహణలో మార్పులు పోలీస్ వర్క్‌ఫ్లోలో జరుగుతాయి.",

    unableVisitorData: "సందర్శకుల డేటాను లోడ్ చేయడం సాధ్యపడలేదు.",
    unableVisitData: "సందర్శన డేటాను లోడ్ చేయడం సాధ్యపడలేదు.",
    noSelectedReport: "ఎంచుకున్న నివేదికకు రికార్డులు లేవు.",

    visitorName: "సందర్శకుడి పేరు",
    mobile: "మొబైల్",
    visitorCode: "సందర్శకుల కోడ్",
    address: "చిరునామా",
    visitsInPeriod: "కాలవ్యవధిలో సందర్శనలు",

    visitor: "సందర్శకుడు",
    purpose: "ఉద్దేశ్యం",
    caseStatus: "కేసు స్థితి",
    priority: "ప్రాధాన్యత",
    assignedOfficer: "కేటాయించిన అధికారి",
    evidence: "సాక్ష్యం",
    aiStatus: "AI స్థితి",
    entryTime: "ప్రవేశ సమయం",

    unknownVisitor: "తెలియని సందర్శకుడు",
    noCase: "కేసు లేదు",
    unassigned: "కేటాయించలేదు",

    underVerification: "ధృవీకరణలో ఉంది",
    new: "కొత్తది",
    evidenceCollection: "సాక్ష్యాల సేకరణ",
    referred: "రిఫర్ చేయబడింది",
    complaintRegistered: "ఫిర్యాదు నమోదు చేయబడింది",
    firRegistered: "FIR నమోదు చేయబడింది",
    closedStatus: "మూసివేయబడింది",

    low: "తక్కువ",
    medium: "మధ్యస్థం",
    high: "అధిక",
    urgent: "అత్యవసరం",

    pending: "పెండింగ్",
    analyzed: "విశ్లేషించబడింది",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

function CommissionerReports() {
  const navigate = useNavigate();

  const { language } = useLanguage();

  const labels = reportTranslations[language] || reportTranslations.en;

  const today = dateKey(new Date());

  const monthStart = dateKey(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const [visitors, setVisitors] = useState([]);
  const [visits, setVisits] = useState([]);

  const [reportType, setReportType] = useState("cases");

  const [fromDate, setFromDate] = useState(monthStart);

  const [toDateFilter, setToDateFilter] = useState(today);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =======================================================
     FIRESTORE - VISITORS
  ======================================================= */

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "visitors")),

      (snap) => {
        setVisitors(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );

        setLoading(false);
      },

      (err) => {
        console.error("Commissioner visitor report error:", err);

        setError(labels.unableVisitorData);

        setLoading(false);
      },
    );

    return () => unsub();
  }, [language]);

  /* =======================================================
     FIRESTORE - VISITS
  ======================================================= */

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "visits")),

      (snap) => {
        setVisits(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })),
        );
      },

      (err) => {
        console.error("Commissioner visit report error:", err);

        setError(labels.unableVisitData);
      },
    );

    return () => unsub();
  }, [language]);

  /* =======================================================
     VISITOR MAP
  ======================================================= */

  const visitorMap = useMemo(
    () => new Map(visitors.map((visitor) => [visitor.id, visitor])),
    [visitors],
  );

  /* =======================================================
     FILTERED VISITS
  ======================================================= */

  const filteredVisits = useMemo(() => {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

    const end = toDateFilter ? new Date(`${toDateFilter}T23:59:59.999`) : null;

    const value = search.trim().toLowerCase();

    return visits
      .filter((visit) => {
        const d = toDate(visit.entryTime || visit.createdAt || visit.updatedAt);

        const visitor = visitorMap.get(visit.visitorId);

        const officer =
          visit?.caseAction?.assignedOfficer ||
          visit?.caseAction?.officerName ||
          "";

        const inRange =
          (!start || (d && d >= start)) && (!end || (d && d <= end));

        const matchesSearch =
          !value ||
          visitor?.fullName?.toLowerCase().includes(value) ||
          visitor?.mobileNumber?.toLowerCase().includes(value) ||
          visit?.visitorCode?.toLowerCase().includes(value) ||
          officer.toLowerCase().includes(value);

        return inRange && matchesSearch;
      })

      .filter((visit) => {
        const status = getStatus(visit).toLowerCase();

        const priority = getPriority(visit).toLowerCase();

        if (reportType === "visitors") {
          return true;
        }

        if (reportType === "visits") {
          return true;
        }

        if (reportType === "cases") {
          return isCase(visit);
        }

        if (reportType === "open") {
          return isCase(visit) && status !== "closed";
        }

        if (reportType === "closed") {
          return isCase(visit) && status === "closed";
        }

        if (reportType === "priority") {
          return isCase(visit) && ["high", "urgent"].includes(priority);
        }

        if (reportType === "evidence") {
          return isCase(visit) && evidenceCount(visit) > 0;
        }

        if (reportType === "ai") {
          return (
            isCase(visit) &&
            String(visit.aiStatus || "").toUpperCase() === "ANALYZED"
          );
        }

        return true;
      })

      .sort(
        (a, b) =>
          (toDate(b.updatedAt || b.entryTime)?.getTime() || 0) -
          (toDate(a.updatedAt || a.entryTime)?.getTime() || 0),
      );
  }, [visits, visitorMap, reportType, fromDate, toDateFilter, search]);

  /* =======================================================
     VISITOR REPORT ROWS
  ======================================================= */

  const visitorRows = useMemo(() => {
    const value = search.trim().toLowerCase();

    return visitors
      .map((visitor) => {
        const matchingVisits = visits.filter((visit) => {
          const d = toDate(
            visit.entryTime || visit.createdAt || visit.updatedAt,
          );

          const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;

          const end = toDateFilter
            ? new Date(`${toDateFilter}T23:59:59.999`)
            : null;

          return (
            visit.visitorId === visitor.id &&
            (!start || (d && d >= start)) &&
            (!end || (d && d <= end))
          );
        });

        return {
          visitor,
          matchingVisits,
        };
      })

      .filter(({ visitor, matchingVisits }) => {
        const matchesSearch =
          !value ||
          visitor?.fullName?.toLowerCase().includes(value) ||
          visitor?.mobileNumber?.toLowerCase().includes(value) ||
          visitor?.visitorCode?.toLowerCase().includes(value);

        return matchesSearch && matchingVisits.length > 0;
      });
  }, [visitors, visits, fromDate, toDateFilter, search]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const caseVisits = visits.filter(isCase);

    const open = caseVisits.filter(
      (v) => getStatus(v).toLowerCase() !== "closed",
    );

    const closed = caseVisits.filter(
      (v) => getStatus(v).toLowerCase() === "closed",
    );

    const highUrgent = open.filter((v) =>
      ["high", "urgent"].includes(getPriority(v).toLowerCase()),
    );

    const analyzed = caseVisits.filter(
      (v) => String(v.aiStatus || "").toUpperCase() === "ANALYZED",
    );

    const evidence = caseVisits.reduce((sum, v) => sum + evidenceCount(v), 0);

    return {
      visitors: visitorRows.length,
      visits: filteredVisits.length,
      cases: filteredVisits.filter(isCase).length,
      open: open.length,
      closed: closed.length,
      highUrgent: highUrgent.length,
      analyzed: analyzed.length,
      evidence,
    };
  }, [visits, filteredVisits, visitorRows]);

  /* =======================================================
     TRANSLATE DATABASE STATUS FOR DISPLAY
     Actual database value remains unchanged.
  ======================================================= */

  const translateStatus = (status) => {
    const value = String(status || "")
      .trim()
      .toLowerCase();

    const map = {
      "under verification": labels.underVerification,

      new: labels.new,

      "evidence collection": labels.evidenceCollection,

      referred: labels.referred,

      "complaint registered": labels.complaintRegistered,

      "fir registered": labels.firRegistered,

      closed: labels.closedStatus,

      pending: labels.pending,

      analyzed: labels.analyzed,

      "no case": labels.noCase,
    };

    return map[value] || status;
  };

  /* =======================================================
     TRANSLATE PRIORITY FOR DISPLAY
  ======================================================= */

  const translatePriority = (priority) => {
    const value = String(priority || "")
      .trim()
      .toLowerCase();

    const map = {
      low: labels.low,
      medium: labels.medium,
      high: labels.high,
      urgent: labels.urgent,
    };

    return map[value] || priority;
  };

  /* =======================================================
     REPORT ROWS
  ======================================================= */

  const reportRows = useMemo(() => {
    if (reportType === "visitors") {
      return [
        [
          labels.visitorName,
          labels.mobile,
          labels.visitorCode,
          labels.address,
          labels.visitsInPeriod,
        ],

        ...visitorRows.map(({ visitor, matchingVisits }) => [
          visitor.fullName || "",
          visitor.mobileNumber || "",
          visitor.visitorCode || "",
          visitor.address || "",
          matchingVisits.length,
        ]),
      ];
    }

    return [
      [
        labels.visitor,
        labels.mobile,
        labels.visitorCode,
        labels.purpose,
        labels.caseStatus,
        labels.priority,
        labels.assignedOfficer,
        labels.evidence,
        labels.aiStatus,
        labels.entryTime,
      ],

      ...filteredVisits.map((visit) => {
        const visitor = visitorMap.get(visit.visitorId);

        return [
          visitor?.fullName || labels.unknownVisitor,

          visitor?.mobileNumber || "",

          visit.visitorCode || "",

          visit.purpose || "",

          isCase(visit) ? translateStatus(getStatus(visit)) : labels.noCase,

          isCase(visit) ? translatePriority(getPriority(visit)) : "",

          visit?.caseAction?.assignedOfficer ||
            visit?.caseAction?.officerName ||
            labels.unassigned,

          evidenceCount(visit),

          String(visit?.aiStatus || "PENDING").toUpperCase() === "ANALYZED"
            ? labels.analyzed
            : labels.pending,

          formatDate(visit.entryTime),
        ];
      }),
    ];
  }, [reportType, visitorRows, filteredVisits, visitorMap, labels]);

  /* =======================================================
     OFFICER WORKLOAD
  ======================================================= */

  const officerWorkload = useMemo(() => {
    const counts = {};

    visits
      .filter(isCase)
      .filter((visit) => getStatus(visit).toLowerCase() !== "closed")
      .forEach((visit) => {
        const officer =
          visit?.caseAction?.assignedOfficer ||
          visit?.caseAction?.officerName ||
          labels.unassigned;

        counts[officer] = (counts[officer] || 0) + 1;
      });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [visits, labels]);

  /* =======================================================
     DOWNLOAD REPORT
  ======================================================= */

  const downloadReport = () => {
    if (reportRows.length <= 1) {
      setError(labels.noSelectedReport);

      return;
    }

    downloadCsv(
      reportRows,
      `policesetu-commissioner-${reportType}-${fromDate || "all"}-${toDateFilter || "all"}.csv`,
    );
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="commissioner-reports-page">
      {/* ================= HEADER ================= */}

      <header className="commissioner-reports-header no-print">
        <div>
          <span>{labels.commissionerPortal}</span>

          <h1>{labels.reportsAnalytics}</h1>

          <p>{labels.readOnlyReporting}</p>
        </div>

        <button type="button" onClick={() => navigate("/commissioner")}>
          ← {labels.dashboard}
        </button>
      </header>

      {/* ================= MAIN ================= */}

      <main className="commissioner-reports-main">
        {/* ERROR */}

        {error && (
          <div className="commissioner-reports-error no-print">{error}</div>
        )}

        {/* ================= TOOLBAR ================= */}

        <section className="commissioner-report-toolbar no-print">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="cases">{labels.allCases}</option>

            <option value="open">{labels.openCases}</option>

            <option value="closed">{labels.closedCases}</option>

            <option value="priority">{labels.priorityCases}</option>

            <option value="evidence">{labels.evidenceCases}</option>

            <option value="ai">{labels.aiCases}</option>

            <option value="visitors">{labels.visitorReport}</option>

            <option value="visits">{labels.visitReport}</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <input
            type="date"
            value={toDateFilter}
            onChange={(e) => setToDateFilter(e.target.value)}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
          />

          <button type="button" onClick={downloadReport} disabled={loading}>
            {labels.downloadCsv}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            disabled={loading}
          >
            {labels.printPdf}
          </button>
        </section>

        {/* ================= SUMMARY ================= */}

        <section className="commissioner-report-summary">
          <div>
            <span>{labels.visitors}</span>

            <strong>{loading ? "—" : summary.visitors}</strong>
          </div>

          <div>
            <span>{labels.visits}</span>

            <strong>{loading ? "—" : summary.visits}</strong>
          </div>

          <div>
            <span>{labels.cases}</span>

            <strong>{loading ? "—" : summary.cases}</strong>
          </div>

          <div>
            <span>{labels.open}</span>

            <strong>{loading ? "—" : summary.open}</strong>
          </div>

          <div>
            <span>{labels.closed}</span>

            <strong>{loading ? "—" : summary.closed}</strong>
          </div>

          <div>
            <span>{labels.highUrgent}</span>

            <strong>{loading ? "—" : summary.highUrgent}</strong>
          </div>

          <div>
            <span>{labels.aiAnalyzed}</span>

            <strong>{loading ? "—" : summary.analyzed}</strong>
          </div>

          <div>
            <span>{labels.evidenceItems}</span>

            <strong>{loading ? "—" : summary.evidence}</strong>
          </div>
        </section>

        {/* ================= REPORT TABLE ================= */}

        <section className="commissioner-report-table">
          <div className="commissioner-report-table-head">
            <div>
              <span>{labels.reportData}</span>

              <h2>
                {reportType === "visitors"
                  ? labels.visitorReport
                  : reportType === "visits"
                    ? labels.visitReport
                    : labels.caseReport}
              </h2>
            </div>

            <span>
              {reportRows.length > 0 ? reportRows.length - 1 : 0}{" "}
              {labels.records}
            </span>
          </div>

          {loading ? (
            <div className="commissioner-report-empty">
              {labels.loadingReport}
            </div>
          ) : reportRows.length <= 1 ? (
            <div className="commissioner-report-empty">{labels.noRecords}</div>
          ) : (
            <div className="commissioner-report-scroll">
              <table>
                <thead>
                  <tr>
                    {reportRows[0].map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {reportRows.slice(1, 201).map((row, index) => (
                    <tr key={index}>
                      {row.map((value, cellIndex) => (
                        <td key={cellIndex}>{String(value ?? "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ================= OFFICER WORKLOAD ================= */}

        <section className="commissioner-report-table officer-workload-panel">
          <div className="commissioner-report-table-head">
            <div>
              <span>{labels.caseOversight}</span>

              <h2>{labels.openCasesByOfficer}</h2>
            </div>

            <span>
              {officerWorkload.length} {labels.officers}
            </span>
          </div>

          {officerWorkload.length === 0 ? (
            <div className="commissioner-report-empty">
              {labels.noOpenAssignedCases}
            </div>
          ) : (
            <div className="commissioner-workload-report">
              {officerWorkload.map(([officer, count]) => (
                <div key={officer}>
                  <strong>{officer}</strong>

                  <span>
                    {count}{" "}
                    {count === 1 ? labels.openCase : labels.openCasesPlural}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= FOOTER NOTE ================= */}

        <p className="commissioner-report-note no-print">
          {labels.commissionerReadOnly}
        </p>
      </main>
    </div>
  );
}

export default CommissionerReports;

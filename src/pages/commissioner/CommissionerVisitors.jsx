import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";

import { db } from "../../firebase/config";
import { useLanguage } from "../../context/LanguageContext";
import "../../styles/CommissionerVisitors.css";

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

const formatDateTime = (value) => {
  const d = toDate(value);

  return d
    ? d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";
};

/* =========================================================
   PAGE TRANSLATIONS
========================================================= */

const visitorTranslations = {
  en: {
    commissionerPortal: "COMMISSIONER PORTAL",
    visitorRecords: "Visitor Records",
    readOnlyInfo: "Read-only registered visitor information.",

    dashboard: "Dashboard",

    searchPlaceholder: "Search name, mobile, visitor code or address...",

    visitorRecordsCount: "visitor records",

    registeredVisitors: "REGISTERED VISITORS",
    visitorDirectory: "Visitor Directory",
    liveFirestoreData: "Live Firestore Data",

    loadingVisitors: "Loading visitors...",

    noRecords: "No visitor records match your search.",

    visitor: "Visitor",
    mobile: "Mobile",
    visitorCode: "Visitor Code",
    address: "Address",
    totalVisits: "Total Visits",
    latestVisit: "Latest Visit",
    action: "Action",

    unknownVisitor: "Unknown Visitor",

    viewLatestCase: "View Latest Case →",

    unableVisitorRecords: "Unable to load visitor records.",

    unableVisitInformation: "Unable to load visit information.",
  },

  hi: {
    commissionerPortal: "कमिश्नर पोर्टल",
    visitorRecords: "आगंतुक रिकॉर्ड",
    readOnlyInfo: "केवल-पठन पंजीकृत आगंतुक जानकारी।",

    dashboard: "डैशबोर्ड",

    searchPlaceholder: "नाम, मोबाइल, आगंतुक कोड या पता खोजें...",

    visitorRecordsCount: "आगंतुक रिकॉर्ड",

    registeredVisitors: "पंजीकृत आगंतुक",
    visitorDirectory: "आगंतुक निर्देशिका",
    liveFirestoreData: "लाइव Firestore डेटा",

    loadingVisitors: "आगंतुक लोड हो रहे हैं...",

    noRecords: "आपकी खोज से कोई आगंतुक रिकॉर्ड मेल नहीं खाता।",

    visitor: "आगंतुक",
    mobile: "मोबाइल",
    visitorCode: "आगंतुक कोड",
    address: "पता",
    totalVisits: "कुल मुलाकातें",
    latestVisit: "हाल की मुलाकात",
    action: "कार्रवाई",

    unknownVisitor: "अज्ञात आगंतुक",

    viewLatestCase: "नवीनतम केस देखें →",

    unableVisitorRecords: "आगंतुक रिकॉर्ड लोड नहीं किए जा सके।",

    unableVisitInformation: "मुलाकात की जानकारी लोड नहीं की जा सकी।",
  },

  te: {
    commissionerPortal: "కమిషనర్ పోర్టల్",
    visitorRecords: "సందర్శకుల రికార్డులు",
    readOnlyInfo: "చదవడానికి మాత్రమే ఉన్న నమోదు చేసిన సందర్శకుల సమాచారం.",

    dashboard: "డాష్‌బోర్డ్",

    searchPlaceholder:
      "పేరు, మొబైల్, సందర్శకుల కోడ్ లేదా చిరునామాను శోధించండి...",

    visitorRecordsCount: "సందర్శకుల రికార్డులు",

    registeredVisitors: "నమోదైన సందర్శకులు",
    visitorDirectory: "సందర్శకుల డైరెక్టరీ",
    liveFirestoreData: "లైవ్ Firestore డేటా",

    loadingVisitors: "సందర్శకులు లోడ్ అవుతున్నారు...",

    noRecords: "మీ శోధనకు సరిపోయే సందర్శకుల రికార్డులు లేవు.",

    visitor: "సందర్శకుడు",
    mobile: "మొబైల్",
    visitorCode: "సందర్శకుల కోడ్",
    address: "చిరునామా",
    totalVisits: "మొత్తం సందర్శనలు",
    latestVisit: "తాజా సందర్శన",
    action: "చర్య",

    unknownVisitor: "తెలియని సందర్శకుడు",

    viewLatestCase: "తాజా కేసును చూడండి →",

    unableVisitorRecords: "సందర్శకుల రికార్డులను లోడ్ చేయడం సాధ్యపడలేదు.",

    unableVisitInformation: "సందర్శన సమాచారాన్ని లోడ్ చేయడం సాధ్యపడలేదు.",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

function CommissionerVisitors() {
  const navigate = useNavigate();

  const { language } = useLanguage();

  const labels = visitorTranslations[language] || visitorTranslations.en;

  const [visitors, setVisitors] = useState([]);

  const [visits, setVisits] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =======================================================
     VISITORS LISTENER
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "visitors")),

      (snapshot) => {
        setVisitors(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );

        setLoading(false);
      },

      (err) => {
        console.error("Commissioner visitors error:", err);

        setError(labels.unableVisitorRecords);

        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [language]);

  /* =======================================================
     VISITS LISTENER
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "visits")),

      (snapshot) => {
        setVisits(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
      },

      (err) => {
        console.error("Commissioner visitor visits error:", err);

        setError(labels.unableVisitInformation);
      },
    );

    return () => unsubscribe();
  }, [language]);

  /* =======================================================
     VISITOR ROWS
  ======================================================= */

  const visitorRows = useMemo(() => {
    const value = search.trim().toLowerCase();

    return visitors

      .filter((visitor) => {
        if (!value) return true;

        return (
          visitor?.fullName?.toLowerCase().includes(value) ||
          visitor?.mobileNumber?.toLowerCase().includes(value) ||
          visitor?.visitorCode?.toLowerCase().includes(value) ||
          visitor?.address?.toLowerCase().includes(value)
        );
      })

      .map((visitor) => {
        const visitorVisits = visits
          .filter((visit) => visit.visitorId === visitor.id)

          .sort(
            (a, b) =>
              (toDate(b.entryTime || b.createdAt)?.getTime() || 0) -
              (toDate(a.entryTime || a.createdAt)?.getTime() || 0),
          );

        return {
          visitor,

          totalVisits: visitorVisits.length,

          latestVisit: visitorVisits[0] || null,
        };
      })

      .sort(
        (a, b) =>
          (toDate(
            b.latestVisit?.entryTime || b.latestVisit?.createdAt,
          )?.getTime() || 0) -
          (toDate(
            a.latestVisit?.entryTime || a.latestVisit?.createdAt,
          )?.getTime() || 0),
      );
  }, [visitors, visits, search]);

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="commissioner-visitors-page">
      {/* ================= HEADER ================= */}

      <header className="commissioner-visitors-header">
        <div>
          <span>{labels.commissionerPortal}</span>

          <h1>{labels.visitorRecords}</h1>

          <p>{labels.readOnlyInfo}</p>
        </div>

        <button type="button" onClick={() => navigate("/commissioner")}>
          ← {labels.dashboard}
        </button>
      </header>

      {/* ================= MAIN ================= */}

      <main className="commissioner-visitors-main">
        {/* ERROR */}

        {error && <div className="commissioner-visitors-error">{error}</div>}

        {/* ================= SEARCH ================= */}

        <section className="commissioner-visitors-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
          />

          <span>
            {visitorRows.length} {labels.visitorRecordsCount}
          </span>
        </section>

        {/* ================= TABLE ================= */}

        <section className="commissioner-visitors-table-wrap">
          <div className="commissioner-visitors-table-head">
            <div>
              <span>{labels.registeredVisitors}</span>

              <h2>{labels.visitorDirectory}</h2>
            </div>

            <span>{labels.liveFirestoreData}</span>
          </div>

          {loading ? (
            <div className="commissioner-visitors-empty">
              {labels.loadingVisitors}
            </div>
          ) : visitorRows.length === 0 ? (
            <div className="commissioner-visitors-empty">
              {labels.noRecords}
            </div>
          ) : (
            <div className="commissioner-visitors-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{labels.visitor}</th>

                    <th>{labels.mobile}</th>

                    <th>{labels.visitorCode}</th>

                    <th>{labels.address}</th>

                    <th>{labels.totalVisits}</th>

                    <th>{labels.latestVisit}</th>

                    <th>{labels.action}</th>
                  </tr>
                </thead>

                <tbody>
                  {visitorRows.map(({ visitor, totalVisits, latestVisit }) => (
                    <tr key={visitor.id}>
                      <td>
                        <strong>
                          {visitor.fullName || labels.unknownVisitor}
                        </strong>
                      </td>

                      <td>{visitor.mobileNumber || "—"}</td>

                      <td>{visitor.visitorCode || "—"}</td>

                      <td>{visitor.address || "—"}</td>

                      <td>{totalVisits}</td>

                      <td>{formatDateTime(latestVisit?.entryTime)}</td>

                      <td>
                        {latestVisit ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/commissioner/cases/${latestVisit.id}`)
                            }
                          >
                            {labels.viewLatestCase}
                          </button>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
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

export default CommissionerVisitors;

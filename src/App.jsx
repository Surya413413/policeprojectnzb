import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// =========================
// AUTH
// =========================
import Login from "./pages/Login";

// =========================
// WATCHMAN / GATE
// =========================
import GateDashboard from "./pages/GateDashboard";
import RegisterVisitor from "./pages/gate/RegisterVisitor";
import VisitorSearch from "./pages/gate/VisitorSearch";
import VisitorDetails from "./pages/gate/VisitorDetails";
import GatePass from "./pages/gate/GatePass";
import VisitorMovement from "./pages/gate/VisitorMovement";

// =========================
// POLICE
// =========================
import PoliceDashboard from "./pages/police/PoliceDashboard";
import PoliceVisitors from "./pages/police/PoliceVisitors";
import PoliceVisitorDetails from "./pages/police/PoliceVisitorDetails";
import PoliceInside from "./pages/police/PoliceInside";
import PolicePetitions from "./pages/police/PolicePetitions";
import PoliceHistory from "./pages/police/PoliceHistory";
import PoliceRegisterVisitor from "./pages/police/PoliceRegisterVisitor";
import PoliceReports from "./pages/police/PoliceReports";

// =========================
// COMMISSIONER
// =========================
import CommissionerDashboard from "./pages/commissioner/CommissionerDashboard";
import CommissionerVisitors from "./pages/commissioner/CommissionerVisitors";
import CommissionerCases from "./pages/commissioner/CommissionerCases";
import CommissionerCaseDetails from "./pages/commissioner/CommissionerCaseDetails";
import CommissionerReports from "./pages/commissioner/CommissionerReports";
import CommissionerStaff from "./pages/commissioner/CommissionerStaff";

// =========================
// ROUTE PROTECTION
// =========================
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* =================================================
            WATCHMAN / GATE ROUTES
        ================================================= */}
        <Route element={<RoleRoute allowedRole="WATCHMAN" />}>
          <Route path="/gate" element={<GateDashboard />} />
          <Route path="/gate/register" element={<RegisterVisitor />} />
          <Route path="/gate/search" element={<VisitorSearch />} />

          <Route path="/gate/visitor/:visitorId" element={<VisitorDetails />} />

          <Route path="/gate/pass/:visitId" element={<GatePass />} />

          <Route path="/gate/movement" element={<VisitorMovement />} />
        </Route>

        {/* =================================================
            POLICE ROUTES
        ================================================= */}
        <Route element={<RoleRoute allowedRole="POLICE" />}>
          <Route path="/police" element={<PoliceDashboard />} />

          <Route path="/police/visitors" element={<PoliceVisitors />} />

          <Route
            path="/police/visitors/:visitorId"
            element={<PoliceVisitorDetails />}
          />

          <Route path="/police/inside" element={<PoliceInside />} />

          <Route path="/police/petitions" element={<PolicePetitions />} />

          <Route path="/police/history" element={<PoliceHistory />} />

          <Route path="/police/register" element={<PoliceRegisterVisitor />} />

          <Route path="/police/reports" element={<PoliceReports />} />
        </Route>

        {/* =================================================
            COMMISSIONER ROUTES
        ================================================= */}
        <Route element={<RoleRoute allowedRole="COMMISSIONER" />}>
          <Route path="/commissioner" element={<CommissionerDashboard />} />

          <Route
            path="/commissioner/visitors"
            element={<CommissionerVisitors />}
          />

          <Route path="/commissioner/cases" element={<CommissionerCases />} />

          <Route
            path="/commissioner/cases/:visitId"
            element={<CommissionerCaseDetails />}
          />

          <Route
            path="/commissioner/reports"
            element={<CommissionerReports />}
          />
          <Route path="/commissioner/staff" element={<CommissionerStaff />} />
        </Route>

        {/* =================================================
            UNKNOWN ROUTES
        ================================================= */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

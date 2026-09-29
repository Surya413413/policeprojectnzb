import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronLeft,
  FaChevronRight,
  FaSignOutAlt,
  FaSearch,
  FaShieldAlt,
  FaTachometerAlt,
  FaUserPlus,
  FaUsers,
  FaFolderOpen,
  FaFileAlt,
  FaBrain,
  FaDatabase,
  FaChartBar,
  FaUserShield,
  FaClipboardList,
  FaTimes,
} from "react-icons/fa";

import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { getCurrentUserRole } from "../services/authService";
import { useLanguage } from "../context/LanguageContext";
import AppSettings from "./AppSettings";

import "../styles/AppLayout.css";

const ROLE_MENUS = {
  POLICE: [
    {
      label: "Dashboard",
      path: "/police",
      icon: <FaTachometerAlt />,
    },
    {
      label: "Register Visitor",
      path: "/police/register",
      icon: <FaUserPlus />,
    },
    {
      label: "Visitors",
      path: "/police/visitors",
      icon: <FaUsers />,
    },
    {
      label: "Case Management",
      path: "/police/visitors?caseFilter=all-cases",
      caseFilter: "all-cases",
      icon: <FaFolderOpen />,
    },
    {
      label: "Petitions / Complaints",
      path: "/police/petitions",
      icon: <FaClipboardList />,
    },
    {
      label: "Case Intelligence",
      path: "/police/visitors?caseFilter=active",
      caseFilter: "active",
      icon: <FaBrain />,
    },
    {
      label: "AI Analysis",
      path: "/police/visitors?caseFilter=ai-pending",
      caseFilter: "ai-pending",
      icon: <FaBrain />,
    },
    {
      label: "Evidence",
      path: "/police/visitors?caseFilter=evidence-pending",
      caseFilter: "evidence-pending",
      icon: <FaFileAlt />,
    },
    {
      label: "Reports",
      path: "/police/reports",
      icon: <FaChartBar />,
    },
    {
      label: "Station Records",
      path: "/police/history",
      icon: <FaDatabase />,
    },
  ],

  COMMISSIONER: [
    {
      label: "Dashboard",
      path: "/commissioner",
      icon: <FaTachometerAlt />,
    },
    {
      label: "Visitors",
      path: "/commissioner/visitors",
      icon: <FaUsers />,
    },
    {
      label: "Cases",
      path: "/commissioner/cases",
      icon: <FaFolderOpen />,
    },
    {
      label: "Reports",
      path: "/commissioner/reports",
      icon: <FaChartBar />,
    },
    {
      label: "Staff Management",
      path: "/commissioner/staff",
      icon: <FaUserShield />,
    },
  ],

  WATCHMAN: [
    {
      label: "Dashboard",
      path: "/gate",
      icon: <FaTachometerAlt />,
    },
    {
      label: "Register Visitor",
      path: "/gate/register",
      icon: <FaUserPlus />,
    },
    // {
    //   label: "Search Visitors",
    //   path: "/gate/search",
    //   icon: <FaSearch />,
    // },
    {
      label: "Visitor Records",
      path: "/gate/search",
      icon: <FaUsers />,
    },
    {
      label: "Visitor Movement",
      path: "/gate/movement",
      icon: <FaClipboardList />,
    },
  ],
};

const ROLE_NAMES = {
  POLICE: "Police Officer",
  COMMISSIONER: "Commissioner",
  WATCHMAN: "Watchman",
};

const AppLayout = ({ role, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const menuItems = ROLE_MENUS[role] || [];

  useEffect(() => {
    const unsubscribe = getCurrentUserRole((userProfile) => {
      setProfile(userProfile);
    });

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }

      if (typeof unsubscribeAuth === "function") {
        unsubscribeAuth();
      }
    };
  }, []);

  /*
   * Global visitor search
   */
  useEffect(() => {
    if (!currentUser) {
      setSearchResults([]);
      return undefined;
    }

    let visitors = [];
    let visits = [];

    const buildResults = () => {
      const combined = [];

      visitors.forEach((visitor) => {
        combined.push({
          type: "visitor",
          id: visitor.id,
          visitorId: visitor.id,
          name: visitor.fullName || visitor.name || "Unknown Visitor",
          mobile: visitor.mobile || visitor.phone || "",
          address: visitor.address || "",
          code: visitor.visitorCode || "",
          purpose: "",
          status: "",
          caseStatus: "",
          casePriority: "",
          aiStatus: "",
        });
      });

      visits.forEach((visit) => {
        combined.push({
          type: "visit",
          id: visit.id,
          visitorId: visit.visitorId || "",
          name: visit.fullName || visit.visitorName || "",
          mobile: visit.mobile || "",
          address: visit.address || "",
          code: visit.visitorCode || "",
          purpose: visit.purpose || "",
          status: visit.status || "",
          caseStatus: visit.caseStatus || visit.caseAction?.status || "",
          casePriority: visit.casePriority || visit.caseAction?.priority || "",
          aiStatus: visit.aiStatus || "",
        });
      });

      const query = searchText.trim().toLowerCase();

      if (!query) {
        setSearchResults([]);
        return;
      }

      const filtered = combined
        .filter((item) => {
          const searchableText = [
            item.name,
            item.mobile,
            item.address,
            item.code,
            item.purpose,
            item.status,
            item.caseStatus,
            item.casePriority,
            item.aiStatus,
            item.visitorId,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(query);
        })
        .slice(0, 12);

      setSearchResults(filtered);
    };

    const unsubscribeVisitors = onSnapshot(
      collection(db, "visitors"),
      (snapshot) => {
        visitors = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        buildResults();
      },
    );

    const unsubscribeVisits = onSnapshot(
      collection(db, "visits"),
      (snapshot) => {
        visits = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        buildResults();
      },
    );

    return () => {
      unsubscribeVisitors();
      unsubscribeVisits();
    };
  }, [currentUser, searchText]);

  const pageTitle = useMemo(() => {
    const pathname = location.pathname;
    const currentFilter = new URLSearchParams(location.search).get(
      "caseFilter",
    );

    const matchingItem = menuItems.find((item) => {
      const itemPath = item.path.split("?")[0];

      // Query-aware matching for case pages.
      if (itemPath === "/police/visitors" && pathname === itemPath) {
        if (item.caseFilter) {
          return item.caseFilter === currentFilter;
        }

        return !currentFilter;
      }

      if (itemPath === pathname) {
        return true;
      }

      return itemPath !== "/" && pathname.startsWith(`${itemPath}/`);
    });

    if (matchingItem) {
      return matchingItem.label;
    }

    if (role === "POLICE") {
      return "Police Command Center";
    }

    if (role === "COMMISSIONER") {
      return "Commissioner Command Center";
    }

    return "Gate Management";
  }, [location.pathname, location.search, menuItems, role]);

  const isActive = (item) => {
    const itemPath = item.path.split("?")[0];
    const currentFilter = new URLSearchParams(location.search).get(
      "caseFilter",
    );

    // Dashboard must only be active on the exact dashboard route.
    if (
      itemPath === "/police" ||
      itemPath === "/commissioner" ||
      itemPath === "/gate"
    ) {
      return location.pathname === itemPath && !currentFilter;
    }

    // Police visitor/case pages use the query parameter to determine
    // which sidebar item is active. This prevents multiple blue items.
    if (itemPath === "/police/visitors") {
      if (location.pathname !== itemPath) {
        return false;
      }

      if (item.caseFilter) {
        return currentFilter === item.caseFilter;
      }

      return !currentFilter;
    }

    return (
      location.pathname === itemPath ||
      location.pathname.startsWith(`${itemPath}/`)
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileSidebarOpen(false);
    setShowSearchResults(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSearchResult = (result) => {
    if (role === "POLICE") {
      if (result.visitorId) {
        navigate(`/police/visitors/${result.visitorId}`);
      } else {
        navigate("/police/visitors");
      }
    } else if (role === "COMMISSIONER") {
      if (result.type === "visit" && result.id) {
        navigate(`/commissioner/cases/${result.id}`);
      } else {
        navigate("/commissioner/visitors");
      }
    } else {
      if (result.visitorId) {
        navigate(`/gate/visitor/${result.visitorId}`);
      } else {
        navigate("/gate/search");
      }
    }

    setSearchText("");
    setSearchResults([]);
    setShowSearchResults(false);
    setMobileSidebarOpen(false);
  };

  const getDisplayName = () => {
    if (profile?.name) {
      return profile.name;
    }

    if (profile?.fullName) {
      return profile.fullName;
    }

    if (currentUser?.displayName) {
      return currentUser.displayName;
    }

    return ROLE_NAMES[role] || "User";
  };

  return (
    <div
      className={`app-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      {mobileSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            {/* <FaShieldAlt /> */}
            <img src="/logo.png" alt="Logo" />
          </div>

          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <strong>POLICESETU</strong>
              <span>AI COMMAND SYSTEM</span>
            </div>
          )}

          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        <div className="sidebar-role">
          <span>ROLE</span>
          <strong>{ROLE_NAMES[role] || role}</strong>
        </div>

        <nav className="sidebar-navigation">
          {menuItems.map((item) => (
            <button
              key={`${item.label}-${item.path}`}
              type="button"
              className={`sidebar-nav-item ${isActive(item) ? "active" : ""}`}
              onClick={() => handleNavigation(item.path)}
              title={sidebarCollapsed ? item.label : ""}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>

              {!sidebarCollapsed && (
                <span className="sidebar-nav-label">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : ""}
          >
            <FaSignOutAlt />

            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="app-main-area">
        <header className="app-header">
          <div className="app-header-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <FaBars />
            </button>

            <button
              type="button"
              className="sidebar-collapse-button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>

            <div className="header-page-title">
              <span>{ROLE_NAMES[role]}</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="app-header-right">
            <div className="global-search">
              <FaSearch className="global-search-icon" />

              <input
                type="text"
                placeholder="Search visitors, mobile, ID..."
                value={searchText}
                onFocus={() => {
                  if (searchText.trim()) {
                    setShowSearchResults(true);
                  }
                }}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setShowSearchResults(true);
                }}
              />

              {searchText && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearchText("");
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                >
                  <FaTimes />
                </button>
              )}

              {showSearchResults && searchText.trim() && (
                <div className="search-results-dropdown">
                  {searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        className="search-result-item"
                        onClick={() => handleSearchResult(result)}
                      >
                        <div className="search-result-icon">
                          {result.type === "visit" ? (
                            <FaClipboardList />
                          ) : (
                            <FaUsers />
                          )}
                        </div>

                        <div className="search-result-content">
                          <strong>{result.name || "Visitor"}</strong>

                          <span>
                            {result.mobile || result.code || result.visitorId}
                          </span>

                          {result.purpose && <small>{result.purpose}</small>}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="search-no-results">
                      No matching records found.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="header-status">
              {/* <span className="status-dot" /> */}
              {/* <span>Station Online</span> */}
            </div>

            <div className="header-settings">
              <AppSettings />
            </div>

            <div className="header-profile">
              {/* <img src="/police-officer.svg" alt="Profile" /> */}

              <div className="header-profile-info">
                <strong>{getDisplayName()}</strong>
                <span>{ROLE_NAMES[role]}</span>
              </div>
            </div>

            <button
              type="button"
              className="header-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </header>

        <main className="app-page-content">{children || <Outlet />}</main>
      </div>
    </div>
  );
};

export default AppLayout;

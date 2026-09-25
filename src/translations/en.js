const en = {
  common: {
    english: "English",
    hindi: "Hindi",
    telugu: "Telugu",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    back: "Back",
    search: "Search",
    loading: "Loading...",
    submit: "Submit",
    update: "Update",
    delete: "Delete",
    view: "View",
    edit: "Edit",
    download: "Download",
    upload: "Upload",
    open: "Open",
    remove: "Remove",
    refresh: "Refresh",
    logout: "Logout",
    loggingOut: "Logging out...",
    yes: "Yes",
    no: "No",
  },

  theme: {
    light: "Light",
    dark: "Dark",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
  },

  language: {
    title: "Language",
    selectLanguage: "Select Language",
  },

  login: {
    title: "PoliceSetu AI",
    email: "Email",
    password: "Password",
    login: "Login",
    forgotPassword: "Forgot Password?",
  },

  navigation: {
    dashboard: "Dashboard",
    visitors: "Visitors",
    registerVisitor: "Register Visitor",
    currentlyInside: "Currently Inside",
    petitions: "Petitions & Complaints",
    history: "History",
    reports: "Reports",
    cases: "Cases",
    caseReview: "Case Review",
    visitorRecords: "Visitor Records",
    settings: "Settings",
    logout: "Logout",
  },

  watchman: {
    dashboard: "Watchman Dashboard",
    registerVisitor: "Register Visitor",
    fullName: "Full Name",
    mobileNumber: "Mobile Number",
    address: "Address",
    photo: "Photo",
    captureCamera: "Capture Camera",
    visitPurpose: "Visit Purpose",
    register: "Register Visitor",
  },

  police: {
    dashboard: "Police Dashboard",
    todaysVisitors: "Today's Visitors",
    currentlyInside: "Currently Inside",
    pendingCases: "Pending Cases",
    activeCases: "Active Cases",
    closedCases: "Closed Cases",
    recentVisitors: "Recent Visitors",
    recentCases: "Recent Cases",
    caseDetails: "Case Details",
    caseEvidence: "Case Evidence",
    caseAction: "Case Action",
    caseTimeline: "Case Timeline",
    analyzeWithAI: "Analyze with AI",
  },

  commissioner: {
    // Header
    portal: "Commissioner Portal",
    administrativeAccess: "Administrative Access",

    // Dashboard
    dashboard: "Commissioner Dashboard",
    administrativeOverview: "ADMINISTRATIVE OVERVIEW",
    dashboardDescription:
      "Monitor station visitor activity, case workload, priorities and follow-up status.",
    liveFirestoreData: "Live Firestore Data",

    // Statistics
    totalVisitors: "Total Visitors",
    registeredVisitorRecords: "Registered visitor records",
    todaysVisits: "Today's Visits",
    stationVisitsToday: "Station visits today",
    currentlyInside: "Currently Inside",
    activeStationEntries: "Active station entries",
    openCases: "Open Cases",
    casesNotClosed: "Cases not marked closed",
    pendingFollowUp: "Pending Follow-up",
    casesRequiringFollowUp: "Cases requiring follow-up",
    highUrgent: "High / Urgent",
    openPriorityCases: "Open priority cases",
    closedCases: "Closed Cases",
    casesMarkedClosed: "Cases marked closed",
    aiAnalyzed: "AI Analyzed",
    completedAiAnalysis: "Cases with completed AI analysis",

    // Quick actions
    reviewVisitorInformation: "Review registered visitor information.",
    openPoliceReports: "Open the existing Police reports module.",
    openCaseList: "Open the visitor case list for review.",

    // Recent cases
    liveCaseActivity: "LIVE CASE ACTIVITY",
    recentCases: "Recent Cases",
    noCaseRecords: "No case records available.",
    unknownVisitor: "Unknown Visitor",
    noVisitorContact: "No visitor contact",
    updated: "Updated",

    // Officer workload
    officerWorkload: "Officer Workload",
    officerWorkloadLabel: "OFFICER WORKLOAD",
    openCasesByOfficer: "Open Cases by Officer",
    noAssignedOpenCases: "No assigned open cases.",

    // Case status
    caseStatusLabel: "CASE STATUS",
    caseOverview: "Case Overview",
    newUnderVerification: "New / Under Verification",
    evidenceCollection: "Evidence Collection",
    referred: "Referred",
    closed: "Closed",

    // AI
    aiMonitoring: "AI MONITORING",
    analysisStatus: "Analysis Status",
    analyzed: "Analyzed",
    evidenceAwaitingAi: "Evidence awaiting AI analysis",
    aiDisclaimer:
      "AI results are shown for administrative review. Police officers remain responsible for verifying facts, evidence and applicable law.",

    // Station activity
    stationActivity: "STATION ACTIVITY",
    todaysMovement: "Today's Movement",
    totalVisits: "Total Visits",
    inside: "Inside",
    exited: "Exited",
    visitor: "Visitor",
  },

  case: {
    // Existing case translations
    status: "Case Status",
    priority: "Priority",
    assignedOfficer: "Assigned Officer",
    evidence: "Evidence",
    voiceStatements: "Voice Statements",
    supportingDocuments: "Supporting Documents",
    reportedProblem: "Reported Problem",
    evidenceSummary: "Evidence Summary",
    legalProvisions: "Potentially Relevant Legal Provisions",
    suggestedActions: "Suggested Police Actions",
    confidence: "Confidence",
    lastAnalyzed: "Last Analyzed",
    officerRemarks: "Officer Remarks",

    // Commissioner Case Details
    caseIdMissing: "Case ID is missing.",
    caseRecordNotFound: "Case record not found.",
    unableToLoadCase: "Unable to load case information.",
    loadingCase: "Loading case...",
    caseNotFound: "Case not found.",
    backToCases: "Back to Cases",

    details: "Case Details",
    readOnlyReview: "Read-only case and investigation review.",
    record: "Case Record",

    visitorCode: "Visitor Code",
    visitPurpose: "Visit Purpose",
    entryTime: "Entry Time",
    exitTime: "Exit Time",
    evidenceItems: "Evidence Items",
    aiStatus: "AI Status",
    lastUpdated: "Last Updated",

    visitorInformation: "Visitor Information",
    registeredVisitor: "Registered Visitor",
    fullName: "Full Name",
    mobile: "Mobile",
    address: "Address",

    aiCaseAnalysis: "AI Case Analysis",
    administrativeReview: "Administrative Review",
    readOnly: "Read Only",

    problemSummary: "Problem Summary",
    noAiProblemSummary: "AI problem summary is not available.",

    noAiEvidenceSummary: "AI evidence summary is not available.",
    noLegalProvisions: "No potentially relevant legal provisions recorded.",
    noSuggestedActions: "No suggested police actions recorded.",

    notRecorded: "Not recorded",

    recordings: "recording(s)",
    noVoiceEvidence: "No voice evidence recorded.",
    policeEvidence: "Police evidence",
    fileUnavailable: "File unavailable",

    documents: "document(s)",
    noSupportingDocuments: "No supporting documents recorded.",

    actionTimeline: "Case Action Timeline",
    policeActivityHistory: "Police Activity History",
    actions: "action(s)",
    loadingTimeline: "Loading timeline...",
    noCaseActions: "No case actions recorded.",

    caseAction: "Case Action",
    officer: "Officer",
    noOfficerRemarks: "No officer remarks recorded.",
    nextAction: "Next action",
    unassigned: "Unassigned",
    allStatus: "All Status",
    newStatus: "New",
    complaintRegistered: "Complaint Registered",
    firRegistered: "FIR Registered",

    allPriority: "All Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",

    unableToLoadVisitors: "Unable to load visitor information.",
    unableToLoadCases: "Unable to load case information.",

    readOnlyCaseOverview: "Read-only overview of police case activity.",

    dashboard: "Dashboard",
    searchCases: "Search visitor, mobile, code or officer...",

    records: "records",
    loadingCases: "Loading cases...",
    noCasesMatch: "No cases match the current filters.",

    visitor: "Visitor",
    officer: "Officer",
    updated: "Updated",

    review: "Review",
    caseReview: "Case Review",

    policeWorkflowMessage:
      "Operational changes remain with the police officer workflow.",
  },

  messages: {
    savedSuccessfully: "Saved successfully.",
    updatedSuccessfully: "Updated successfully.",
    deletedSuccessfully: "Deleted successfully.",
    somethingWentWrong: "Something went wrong.",
    noRecordsFound: "No records found.",
    accessDenied: "Access denied.",
  },
};

export default en;

POLICESETU AI

AI-Powered Police Visitor & Case Management System

POLICESETU AI is a role-based visitor and case management application
built with React.js, Vite, Firebase, Firestore, Firebase AI
Logic/Gemini, React Router, React Icons, and CSS.

### 1. Project Workflow

WATCHMAN
↓
Register Visitor
↓
Firebase / Firestore
↓
POLICE DASHBOARD
↓
Open Visitor / Case
↓
Record Voice + Upload/Scan Documents
↓
Save Evidence
↓
Gemini AI Case Analysis
↓
Problem Summary / Evidence Summary /
Potentially Relevant Legal Provisions /
Suggested Police Actions
↓
COMMISSIONER REVIEW

### 2. Roles

WATCHMAN

Login

Register visitors

Search existing visitors

Capture visitor photo

Enter full name, mobile, address, and visit purpose

Create visits

Track visitors currently inside

Checkout visitors

The Watchman does not record voice statements, upload case documents, or
perform AI case analysis.

POLICE

Police dashboard

Visitor directory

Visitor details

Currently inside

Petitions/complaints

Visit history

Voice evidence

Multiple voice recordings

Supporting documents

Mobile document scanning

AI case analysis

Case actions

Case timeline

Reports

COMMISSIONER

Dashboard overview

Visitor directory

Case review

Case details

Reports

Staff Management

Officer workload

Real-time monitoring

### 3. Technology Stack

Frontend React.js + Vite + JavaScript
Routing React Router
Backend Firebase
Authentication Firebase Authentication
Database Cloud Firestore
AI Firebase AI Logic + Gemini
Icons React Icons
Styling CSS
Realtime Firestore onSnapshot
Languages English / Hindi / Telugu
Theme Light / Dark

Current Gemini model:

gemini-3.6-flash

### 4. Project Structure

src/
├── components/
│ ├── ProtectedRoute.jsx
│ ├── RoleRoute.jsx
│ └── AppSettings.jsx
│
├── context/
│ ├── LanguageContext.jsx
│ └── ThemeContext.jsx
│
├── translations/
│ ├── en.js
│ ├── hi.js
│ └── te.js
│
├── pages/
│ ├── police/
│ │ ├── PoliceDashboard.jsx
│ │ ├── PoliceVisitors.jsx
│ │ ├── PoliceVisitorDetails.jsx
│ │ ├── PoliceInside.jsx
│ │ ├── PolicePetitions.jsx
│ │ ├── PoliceHistory.jsx
│ │ ├── PoliceRegisterVisitor.jsx
│ │ ├── PoliceCaseEvidence.jsx
│ │ ├── PoliceCaseAction.jsx
│ │ ├── PoliceCaseSummary.jsx
│ │ ├── PoliceCaseTimeline.jsx
│ │ └── PoliceReports.jsx
│ │
│ ├── commissioner/
│ │ ├── CommissionerDashboard.jsx
│ │ ├── CommissionerVisitors.jsx
│ │ ├── CommissionerCases.jsx
│ │ ├── CommissionerReports.jsx
│ │ ├── CommissionerCaseDetails.jsx
│ │ └── CommissionerStaff.jsx
│ │
│ ├── Login.jsx
│ └── GateDashboard.jsx
│
├── services/
│ ├── authService.js
│ ├── visitorService.js
│ ├── gateService.js
│ ├── aiTest.js
│ └── aiCaseService.js
│
├── firebase/
│ └── config.js
│
├── styles/
│ └── \*.css
│
├── App.jsx
├── App.css
├── index.css
└── main.jsx

### 5. Installation

Clone the repository:

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd policeprojectnzb

Install dependencies:

npm install

Install React Icons:

npm install react-icons

Start development:

npm run dev

Open:

http://localhost:5173/

### 6. Firebase Setup

Create a Firebase project and register the web application.

Current project:

policesetu-ai

Current web application:

POLICESETU AI Web

Enable:

Firebase Authentication
Cloud Firestore
Firebase AI Logic
Firebase App Check
Firebase Storage (planned/available for production evidence)

Enable Email/Password authentication.

 ### 7. Firebase Configuration

Configuration is located at:

src/firebase/config.js

Typical structure:

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
apiKey: "...",
authDomain: "...",
projectId: "...",
storageBucket: "...",
messagingSenderId: "...",
appId: "..."
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

Never commit private service-account credentials, private keys,
passwords, or secrets.

### 8. Authentication

There is no public Watchman/Police registration page.

Users are authenticated through Firebase Authentication.

After login, the application reads:

users/{FirebaseAuthUID}

Example:

{
name: "Police Officer",
email: "police@example.com",
role: "POLICE"
}

Supported roles:

WATCHMAN
POLICE
COMMISSIONER

Routing:

WATCHMAN → /gate
POLICE → /police
COMMISSIONER → /commissioner

### 9. Firestore Collections

users/
{uid}

visitors/
{visitorId}

visits/
{visitId}
caseActions/
{actionId}

staff/
{staffId}

counters/
{counterId}

### 10. Visitor Model

Example visitor:

{
fullName: "Visitor Name",
mobileNumber: "9876543210",
address: "Visitor Address",
photoData: "...",
visitorCode: "VIS-0001",
createdAt: "...",
updatedAt: "..."
}

Example visit:

{
visitorId: "visitor-id",
visitCode: "VISIT-0001",
purpose: "Petition / Complaint",
status: "INSIDE",
entryTime: "...",
exitTime: null,
registeredBy: "Watchman",
createdAt: "...",
updatedAt: "..."
}

A visitor can have multiple visits.

### 11. Police Case Model

A visit can contain case information:

{
caseStatus: "Under Verification",
casePriority: "High",

caseAction: {
actionType: "...",
officerRemarks: "...",
assignedOfficer: "...",
priority: "High",
nextActionDate: "...",
status: "Under Verification",
officerId: "...",
officerName: "...",
createdAt: "..."
}
}

Case action history:

visits/{visitId}/caseActions/{actionId}

### 12. Evidence

Evidence is collected by Police, not Watchman.

Voice

Multiple voice recordings are supported:

voiceEvidence: [
{
id: "...",
name: "Voice Recording 1",
data: "...",
type: "audio/webm",
createdAt: "..."
}
]

Documents

Multiple documents are supported:

documentEvidence: [
{
id: "...",
name: "Supporting Document",
data: "...",
type: "application/pdf",
source: "upload",
createdAt: "..."
}
]

Mobile scanning uses:

<input
  type="file"
  accept="image/*"
  capture="environment"
/>

### 13. Temporary Evidence Storage

During development, evidence may be stored as Base64 in Firestore.

Example:

data:audio/webm;base64,...

Before sending Base64 data to Gemini, the Data URL prefix is removed.

Base64 in Firestore is only a temporary solution because Firestore
documents have size limits.

Production architecture

Police
↓
Firebase Storage
├── Audio
├── PDF
└── Images
↓
Firestore metadata + Storage URL

Firebase Storage should be used for production evidence files.

### 14. Gemini AI

Firebase AI Logic is used to connect the application with Gemini.

Initialization:

import {
getAI,
getGenerativeModel,
GoogleAIBackend
} from "firebase/ai";

const ai = getAI(app, {
backend: new GoogleAIBackend()
});

const model = getGenerativeModel(ai, {
model: "gemini-3.6-flash"
});

AI files:

src/services/aiTest.js
src/services/aiCaseService.js

### 15. AI Case Analysis

The Police Officer can provide:

Voice Statement

- Supporting Document

The AI can produce:

Transcript
Document Text
Problem Summary
Evidence Summary
Potentially Relevant Legal Provisions
Suggested Police Actions
Confidence
Limitations

The AI must not invent facts.

It must distinguish visitor statements from document information.

Legal provisions are presented as potentially relevant provisions for
officer verification.

AI should not make the final decision about:

Whether a crime occurred
Whether an offence is established
Whether an FIR must be registered
Whether a person should be arrested

The investigating officer remains responsible for verifying facts,
evidence, and applicable law.

### 16. Firebase App Check

The web application uses Firebase App Check.

Development debug configuration can use:

if (import.meta.env.DEV) {
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

The generated debug token must be registered in Firebase Console for
local development when required.

Production App Check configuration should be reviewed before deployment.

### 17. Real-Time Firestore

The dashboards use Firestore real-time listeners.

Typical pattern:

onSnapshot(queryRef, (snapshot) => {
const records = snapshot.docs.map((doc) => ({
id: doc.id,
...doc.data()
}));

setRecords(records);
});

This allows Watchman, Police, and Commissioner dashboards to receive
live changes.

### 18. Police Dashboard

The Police Dashboard provides:

Total Visitors
Today's Visits
Currently Inside
Open Cases
Closed Cases
AI Analysis
Evidence
Follow-up
Case Intelligence

Case Intelligence filters include:

Urgent
High
Verification
Evidence Pending
AI Pending
Follow-up
Active
Closed
All Cases

### 19. Police Visitor Details

Displays:

Visitor profile

Visitor photo

Visitor code

Current visit

Visit history

Case status

Priority

Assigned officer

Evidence count

AI status

Case summary

Case timeline

Voice evidence

Supporting documents

The latest visit is used for current case evidence.

### 20. Case Evidence UI

The case evidence page supports:

Voice

Add recording

Multiple recordings

Audio playback

Remove recording

Documents

Upload multiple documents

Scan documents using mobile camera

Open

Download

Remove

### 21. Case Actions

Police can save:

Action Type
Officer Remarks
Assigned Officer
Priority
Next Action Date
Status
Officer ID
Officer Name

Case action history is stored in Firestore.

### 22. Commissioner Dashboard

The Commissioner dashboard provides:

Total Visitors
Today's Visits
Currently Inside
Open Cases
Pending Follow-up
High/Urgent Cases
Closed Cases
AI Analyzed Cases

It also provides:

Recent Cases

Officer Workload

Case Overview

Today's Movement

Visitor Directory

Case Review

Reports

Staff Management

### 23. Staff Management

Route:

/commissioner/staff

Current functionality:

Staff directory

Search

Role filter

Status filter

Total staff

Active staff

Watchmen

Police officers

Add staff profile

Fields:

Full Name
Email
Mobile
Role

Current Add Staff creates a Firestore staff profile.

Planned

Automated Firebase Authentication account creation will be implemented
later through a trusted backend/Cloud Function.

### 24. Language Support

Supported languages:

English
Hindi
Telugu

Files:

src/translations/en.js
src/translations/hi.js
src/translations/te.js

Usage:

const { t } = useLanguage();

t("staff.title");

Static UI labels should use the translation files.

Dynamic visitor/case content can later use a translation API when
required.

### 25. Theme Support

Supported themes:

Light
Dark

Theme context:

src/context/ThemeContext.jsx

Settings:

src/components/AppSettings.jsx

The selected theme and language are stored in localStorage.

### 26. React Icons

Install:

npm install react-icons

Example:

import {
FaUsers,
FaChartBar,
FaFolderOpen,
FaArrowRight,
FaUserShield
} from "react-icons/fa";

### 27. Security

Frontend route protection is not enough.

Firestore Security Rules must enforce:

WATCHMAN
→ Gate/visitor operations

POLICE
→ Visitor, visit, case, evidence operations

COMMISSIONER
→ Monitoring/review and authorized staff operations

Role is determined from:

users/{request.auth.uid}

Example:

function getUserRole() {
return get(
/databases/$(database)/documents/users/$(request.auth.uid)
).data.role;
}

Review Firestore rules carefully before production.

### 28. Development Workflow

For a new feature:

1. Create/update React component
2. Create/update CSS
3. Add service functions if Firestore is needed
4. Add English/Hindi/Telugu translations
5. Add route in App.jsx
6. Apply RoleRoute/ProtectedRoute
7. Update Firestore rules if required
8. Run npm run dev
9. Test browser console
10. Test Watchman, Police, and Commissioner permissions

11. Testing Workflow

Watchman

Login
↓
Gate Dashboard
↓
Register Visitor
↓
Capture Photo
↓
Create Visit
↓
Currently Inside
↓
Checkout

Police

Login
↓
Police Dashboard
↓
Visitors
↓
Visitor Details
↓
Record Voice
↓
Upload/Scan Document
↓
Save Evidence
↓
Analyze with AI
↓
Review Summary
↓
Create Case Action
↓
Review Timeline

Commissioner

Login
↓
Commissioner Dashboard
↓
Visitors
↓
Cases
↓
Case Details
↓
Reports
↓
Staff Management

### 30. Troubleshooting

Firebase API key error

Check:

Firebase project
Firebase web app
API key
Auth configuration

App Check error

Check:

Firebase Console
→ App Check
→ Web App

Register the development debug token when using local development.

Gemini Base64 error

Do not send:

data:audio/webm;base64,GkXfo...

Send only the Base64 payload:

GkXfo...

Firestore document too large

Move large audio/document/image data to Firebase Storage.

Invalid account role

Verify:

# Firebase Auth UID

Firestore users/{uid}

and:

{
role: "COMMISSIONER"
}

### 31. Production Build

Build:

npm run build

Preview:

npm run preview

32. Git Workflow

Check:

git status

Add:

git add .

Commit:

git commit -m "Update POLICESETU AI"

Push:

git push -u origin main

Do not force-push unless intentionally rewriting remote history.

### 33. Production Checklist

Before production:

Review Firestore Security Rules

Configure production App Check

Move evidence to Firebase Storage

Remove test accounts

Remove test data

Review Firebase Authentication

Verify role documents

Implement secure staff account provisioning

Review AI prompts and output handling

Test mobile camera

Test responsive layouts

Test light/dark mode

Test English/Hindi/Telugu

Test all roles

Test Firestore permissions

Run production build

Check browser console

### 34. Current Status

Completed

Firebase Authentication

Role-based login

Watchman Gate Dashboard

Visitor registration

Visitor management

Visit management

Police Dashboard

Police Visitor Directory

Police Visitor Details

Case Intelligence

Voice Evidence

Multiple Voice Evidence

Document Evidence

Multiple Document Evidence

Mobile Document Scanning

Gemini AI Case Analysis

Case Actions

Case Timeline

Commissioner Dashboard

Commissioner Visitor Directory

Commissioner Case Review

Commissioner Reports

Commissioner Staff Directory

Staff Search and Filters

Add Staff Profile

English/Hindi/Telugu

Light/Dark Theme

React Icons

Real-Time Firestore Updates

Planned

Automated Staff Authentication

Secure backend/Cloud Function for staff provisioning

Firebase Storage for evidence

Production file handling

Additional AI workflow improvements

Additional reporting improvements

### 35. High-Level Architecture

                    POLICESETU AI
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v

    WATCHMAN POLICE COMMISSIONER
    | | |
    v v v
    GATE CASE UI REVIEW UI
    | | |
    +-----------------+-----------------+
    |
    v
    FIREBASE
    +-----+-----+
    | | |
    v v v
    Auth Firestore Storage\*
    |
    v
    Firebase AI Logic
    |
    v
    Gemini AI

- Firebase Storage is planned for production evidence storage.

### 36. Core Principles

Watchman manages the gate.

Police manages cases and evidence.

AI assists the officer and does not make final legal/investigative
decisions.

Firestore Security Rules enforce authorization.

Static UI translations stay in local translation files.

Dynamic content can use a translation API when needed.

Production evidence should use Firebase Storage rather than Base64
Firestore storage.

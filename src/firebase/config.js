import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// --------------------------------------------------
// Firebase configuration
// --------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyCeZsMEdjxuZwJqR23IBh4WTEMoaeAkI5k",
  authDomain: "policesetu-ai.firebaseapp.com",
  databaseURL:
    "https://policesetu-ai-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "policesetu-ai",
  storageBucket: "policesetu-ai.firebasestorage.app",
  messagingSenderId: "550317285666",
  appId: "1:550317285666:web:a131a2860ef3e39bcfc57b",
  measurementId: "G-VXM7JY5ZR5",
};

//token: ad2ae9f7-9fe2-4154-bf40-a4b76857a5cc

// --------------------------------------------------
// Initialize Firebase
// --------------------------------------------------

const app = initializeApp(firebaseConfig);

// --------------------------------------------------
// App Check DEBUG MODE
// --------------------------------------------------

// Only for local development.
// Firebase will generate a debug token in the browser console.
if (import.meta.env.DEV) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// --------------------------------------------------
// Initialize App Check
// --------------------------------------------------

export const appCheck = initializeAppCheck(app, {
  // Placeholder provider for local development.
  // The debug token above is used during localhost testing.
  provider: new ReCaptchaV3Provider("none"),

  isTokenAutoRefreshEnabled: true,
});

// --------------------------------------------------
// Firebase services
// --------------------------------------------------

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export { app };
export default app;

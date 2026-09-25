import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export const getCurrentUserRole = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.log("❌ No Firebase user logged in");
    return null;
  }

  console.log("✅ Firebase Auth UID:", currentUser.uid);
  console.log("✅ Firebase Auth Email:", currentUser.email);

  const userRef = doc(db, "users", currentUser.uid);
  const userSnapshot = await getDoc(userRef);

  console.log("📄 Firestore user exists:", userSnapshot.exists());

  if (!userSnapshot.exists()) {
    console.log("❌ No users document for UID:", currentUser.uid);
    return null;
  }

  const userData = userSnapshot.data();

  console.log("📄 Firestore user data:", userData);
  console.log("🔐 User role:", userData.role);

  return {
    uid: currentUser.uid,
    email: currentUser.email || "",
    name: userData.name || "",
    role: userData.role || "",
  };
};

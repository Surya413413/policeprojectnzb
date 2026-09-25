import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { db } from "../firebase/config";

export const testFirestoreConnection = async () => {
  try {
    const docRef = await addDoc(collection(db, "connectionTests"), {
      message: "POLICESETU AI Firestore connection successful",
      createdAt: serverTimestamp(),
    });

    console.log("Firestore connected successfully!");
    console.log("Document ID:", docRef.id);

    return {
      success: true,
      id: docRef.id,
    };
  } catch (error) {
    console.error("Firestore connection failed:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};

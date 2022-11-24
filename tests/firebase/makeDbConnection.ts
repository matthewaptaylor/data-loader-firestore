import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
process.env.FIRESTORE_PROJECT_ID = "firestore-data-loader";
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8081";

initializeApp({
  projectId: process.env.FIRESTORE_PROJECT_ID,
});
const firestore = getFirestore();

export default firestore;

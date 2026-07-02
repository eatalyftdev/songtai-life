import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Load config from firebase-applet-config.json values
// These values are stable and provided securely.
const firebaseConfig = {
  apiKey: "AIzaSyCfxVnCll01b2RMncgq1UGrmmvPGbDVfx8",
  authDomain: "webmail-7159a.firebaseapp.com",
  projectId: "webmail-7159a",
  storageBucket: "webmail-7159a.firebasestorage.app",
  messagingSenderId: "90952093715",
  appId: "1:90952093715:web:4872406c462c4294b7afe6",
  firestoreDatabaseId: "ai-studio-songtailifeecosy-2be2e2a4-b207-4814-bb6d-3aae1b6b43b1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

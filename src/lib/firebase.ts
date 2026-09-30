import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";

export const app = getApps().find((app) => app.name === "[DEFAULT]") ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);

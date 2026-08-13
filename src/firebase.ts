import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDoWlBp0JDCCAPde04IQxzeaTH98szw4L8",
  authDomain: "english-study-app-c645a.firebaseapp.com",
  projectId: "english-study-app-c645a",
  storageBucket: "english-study-app-c645a.firebasestorage.app",
  messagingSenderId: "545509310602",
  appId: "1:545509310602:web:67a624e0d98000d093ed73"
};

const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

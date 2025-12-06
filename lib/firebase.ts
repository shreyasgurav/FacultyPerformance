import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCC9CVOorWHuHk9w8FdR_dHBQIc9MDq610",
  authDomain: "somaiyafacultyfeedback.firebaseapp.com",
  projectId: "somaiyafacultyfeedback",
  storageBucket: "somaiyafacultyfeedback.firebasestorage.app",
  messagingSenderId: "500390891668",
  appId: "1:500390891668:web:ff8bebb487f43802eaa481",
  measurementId: "G-S4DJ1P9LHP"
};

// Initialize Firebase (prevent multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };

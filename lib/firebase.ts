import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Only initialize Firebase on the client side
let app: ReturnType<typeof initializeApp> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;
let googleProvider: GoogleAuthProvider | undefined;

function initFirebase() {
  // Check if we're on the client side
  if (typeof window === 'undefined') {
    return;
  }

  // Check if Firebase is already initialized
  if (app && auth && googleProvider) {
    return;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Only initialize if we have the required config
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return;
  }

  // Initialize Firebase (prevent multiple initializations)
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

// Initialize Firebase when this module is imported on the client side
if (typeof window !== 'undefined') {
  initFirebase();
}

// Export getters that ensure Firebase is initialized
export function getAuthInstance() {
  if (typeof window !== 'undefined' && !auth) {
    initFirebase();
  }
  return auth;
}

export function getGoogleProviderInstance() {
  if (typeof window !== 'undefined' && !googleProvider) {
    initFirebase();
  }
  return googleProvider;
}

// For backward compatibility - these will be undefined on server side
export { auth, googleProvider };

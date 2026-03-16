import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Only initialize if service account is provided
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      return adminApp;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      return null;
    }
  }

  // No service account = local dev mode, don't initialize
  return null;
}

export function getAdminAuth(): Auth | null {
  if (adminAuth) return adminAuth;
  
  const app = getAdminApp();
  if (!app) return null;
  
  adminAuth = getAuth(app);
  return adminAuth;
}

/**
 * Verify a Firebase ID token and return the decoded token with the user's email.
 * Returns null if the token is invalid, expired, or if Firebase Admin SDK is not initialized.
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      // No service account configured - local dev mode, skip verification
      return null;
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);
    
    if (!decodedToken.email) {
      return null;
    }

    return {
      email: decodedToken.email.toLowerCase(),
      uid: decodedToken.uid,
    };
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    return null;
  }
}

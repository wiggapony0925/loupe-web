/**
 * Firebase Auth (SMS OTP) wiring. The web SDK runs inside the Capacitor
 * webview; reCAPTCHA is the invisible variant mounted on a dedicated node.
 * All exports are small wrappers so screens never import firebase directly.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  getAuth,
  onIdTokenChanged,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

let app: FirebaseApp | null = null;
let verifier: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

export function firebaseAuth(): Auth {
  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    });
  }
  return getAuth(app);
}

/** container: an empty, always-mounted div (invisible reCAPTCHA anchor). */
export async function startPhoneSignIn(phoneE164: string, containerId: string): Promise<void> {
  const auth = firebaseAuth();
  verifier ??= new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  pendingConfirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
}

export async function confirmSmsCode(code: string): Promise<void> {
  if (!pendingConfirmation) throw new Error('No sign-in in progress');
  await pendingConfirmation.confirm(code);
  pendingConfirmation = null;
}

export function watchAuth(callback: (user: FirebaseUser | null) => void): () => void {
  return onIdTokenChanged(firebaseAuth(), callback);
}

export async function currentIdToken(): Promise<string | null> {
  const user = firebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebaseAuth());
}

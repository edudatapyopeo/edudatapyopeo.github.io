import { getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const config = window.PYOEDU_CONFIG?.firebase;
const requiredFields = ["apiKey", "authDomain", "projectId", "appId"];
export const configured = Boolean(config && requiredFields.every(field => String(config[field] || "").trim()));

let auth = null;
if (configured) {
  const app = getApps()[0] || initializeApp(config);
  auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
}

export function observeAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email, password) {
  if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(credential.user);
  return credential;
}

export async function sendVerification() {
  const user = auth?.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  await sendEmailVerification(user);
}

export async function signOutUser() {
  if (auth) await signOut(auth);
}

export async function sendReset(email) {
  if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
  await sendPasswordResetEmail(auth, email);
}

export async function getIdToken(forceRefresh = false) {
  const user = auth?.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");
  return user.getIdToken(forceRefresh);
}

export function currentUser() {
  return auth?.currentUser || null;
}

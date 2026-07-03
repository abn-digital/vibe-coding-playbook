import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { deleteDoc, doc, getFirestore, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// No emulators in this playbook - these run against the REAL project's deployed
// rules (deploy first: npx firebase-tools deploy --only firestore:rules).
// Anonymous auth + one self-cleaning doc write keeps the footprint tiny.
// Skips unless FIREBASE_API_KEY is set (the public web API key from compose.env).
const apiKey = process.env.FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID ?? "hike-agentic-playground";
const TIMEOUT = 15_000;

describe.skipIf(!apiKey)("firestore rules (real project)", () => {
  let app: FirebaseApp;
  let uid: string;

  beforeAll(async () => {
    app = initializeApp({ apiKey, projectId: PROJECT_ID });
    const cred = await signInAnonymously(getAuth(app));
    uid = cred.user.uid;
  }, TIMEOUT);

  afterAll(async () => {
    await getAuth(app).currentUser?.delete();
    await deleteApp(app);
  });

  it(
    "allows owner to write their user doc",
    async () => {
      const ref = doc(getFirestore(app), `users/${uid}`);
      await setDoc(ref, { rulesSmoke: true });
      await deleteDoc(ref);
    },
    TIMEOUT,
  );

  it(
    "denies writing another user's doc",
    async () => {
      await expect(
        setDoc(doc(getFirestore(app), "users/someone-else"), { x: 1 }),
      ).rejects.toMatchObject({ code: "permission-denied" });
    },
    TIMEOUT,
  );

  it(
    "denies anonymous write to emailGated collection",
    async () => {
      await expect(
        setDoc(doc(getFirestore(app), "emailGated/rules-smoke"), { x: 1 }),
      ).rejects.toMatchObject({ code: "permission-denied" });
    },
    TIMEOUT,
  );
});

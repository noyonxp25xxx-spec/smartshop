// config/firebaseAdmin.js
// Server-side Firebase Admin SDK — Firestore + Auth + Firebase Storage
require("dotenv").config();
const admin = require("firebase-admin");

let hasCredentials = false;

if (!admin.apps.length) {
  const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || "smart-computer-shop.firebasestorage.app";

  let loadedCert = null;

  // 1. From FIREBASE_SERVICE_ACCOUNT_JSON env variable (JSON string or Base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      let rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      if (rawJson.startsWith("{")) {
        loadedCert = JSON.parse(rawJson);
      } else {
        // Try base64 decoding
        const decoded = Buffer.from(rawJson, "base64").toString("utf-8");
        loadedCert = JSON.parse(decoded);
      }
      console.log("🔑 Loaded Firebase service account from FIREBASE_SERVICE_ACCOUNT_JSON env");
    } catch (err) {
      console.error("❌ Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    }
  }

  // 2. From discrete env variables (CLIENT_EMAIL & PRIVATE_KEY)
  if (!loadedCert && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 50) {
    loadedCert = {
      projectId: process.env.FIREBASE_PROJECT_ID || "smart-computer-shop",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL.trim(),
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    };
    console.log("🔑 Loaded Firebase service account from discrete environment variables");
  }

  // Initialize admin with loaded certificate
  if (loadedCert) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(loadedCert),
        storageBucket: storageBucketName,
      });
      hasCredentials = true;
      console.log(`🔥 [Firebase Connected] Project: ${loadedCert.project_id || process.env.FIREBASE_PROJECT_ID} (Firestore & Storage Active)`);
    } catch (err) {
      console.error("❌ Error initializing Firebase Admin:", err.message);
    }
  } else {
    console.log("ℹ️ [Dual-Engine Mode] Running on local JSON cache. Place 'firebase-adminsdk.json' in project folder to enable real-time Firebase Cloud Firestore sync.");
  }
} else {
  hasCredentials = true;
}

let db = null;
let auth = null;
let bucket = null;

if (hasCredentials) {
  try { db = admin.firestore(); } catch (e) { db = null; }
  try { auth = admin.auth(); } catch (e) { auth = null; }
  try {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "smart-computer-shop.firebasestorage.app";
    bucket = admin.storage().bucket(bucketName);
  } catch (e) { bucket = null; }
}

module.exports = {
  admin,
  db,
  auth,
  bucket,
  hasCredentials,
  isFirebaseConnected: hasCredentials
};

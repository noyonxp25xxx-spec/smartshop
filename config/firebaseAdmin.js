// config/firebaseAdmin.js
// Server-side Firebase Admin SDK — Firestore + Auth + Storage
require("dotenv").config();
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let hasCredentials = false;

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, "..", "firebase-adminsdk.json");

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
      });
      hasCredentials = true;
      console.log("✅ Firebase Admin initialized from firebase-adminsdk.json");
    } catch (err) {
      console.error("❌ Error loading firebase-adminsdk.json:", err.message);
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 50) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      hasCredentials = true;
      console.log("✅ Firebase Admin initialized from environment variables");
    } catch (err) {
      console.error("❌ Error initializing Firebase Admin from env:", err.message);
    }
  } else {
    console.log("ℹ️ Running in fast dual-engine local storage mode (no Firebase service account key loaded).");
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
  try { bucket = admin.storage().bucket(); } catch (e) { bucket = null; }
}

module.exports = { admin, db, auth, bucket, hasCredentials };

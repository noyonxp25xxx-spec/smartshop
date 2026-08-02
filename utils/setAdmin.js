// utils/setAdmin.js
// One-time bootstrap: promote a user to "admin" by email.
// Usage:  node utils/setAdmin.js someone@example.com
require("dotenv").config();
const { auth, db } = require("../config/firebaseAdmin");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("ব্যবহার: node utils/setAdmin.js you@example.com");
    process.exit(1);
  }

  try {
    const userRecord = await auth.getUserByEmail(email);
    await db.collection("users").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || userRecord.email,
        role: "admin",
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`✅ ${email} এখন অ্যাডমিন।`);
    process.exit(0);
  } catch (err) {
    console.error("❌ ব্যর্থ:", err.message);
    console.error("টিপ: প্রথমে ওয়েবসাইটে গিয়ে ওই ইমেইল দিয়ে একবার সাইন-আপ করুন, তারপর এই স্ক্রিপ্ট চালান।");
    process.exit(1);
  }
}

main();

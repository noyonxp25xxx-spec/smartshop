// utils/syncToFirebase.js — Push all local data to Firebase Firestore Cloud
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { db, hasCredentials } = require("../config/firebaseAdmin");

async function syncAllToFirebase() {
  console.log("==================================================");
  console.log("🔥 Smart Computer Shop — Firebase Firestore Data Sync");
  console.log("==================================================");

  if (!hasCredentials || !db) {
    console.error("❌ Firebase Admin is not connected with a service account key.");
    console.log("💡 How to connect:");
    console.log("1. Go to Firebase Console -> Project Settings -> Service accounts");
    console.log("2. Click 'Generate new private key' and save as 'firebase-adminsdk.json' in this project root folder.");
    console.log("3. Run: npm run sync:firebase\n");
    process.exit(1);
  }

  const dbFile = path.join(__dirname, "..", "data", "database.json");
  if (!fs.existsSync(dbFile)) {
    console.error("❌ Local database file not found at:", dbFile);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbFile, "utf-8");
  const data = JSON.parse(raw);

  const products = Array.isArray(data.products) ? data.products : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const users = Array.isArray(data.users) ? data.users : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];

  console.log(`📦 Found: ${products.length} Products, ${categories.length} Categories, ${users.length} Users, ${orders.length} Orders.`);

  try {
    // 1. Sync Categories
    console.log("\n📁 Syncing Categories to Firestore...");
    for (const cat of categories) {
      await db.collection("categories").doc(cat.id).set(cat, { merge: true });
      console.log(`  ✓ Category synced: ${cat.name} (${cat.id})`);
    }

    // 2. Sync Products
    console.log("\n📦 Syncing Products to Firestore...");
    for (const prod of products) {
      await db.collection("products").doc(prod.id).set(prod, { merge: true });
      console.log(`  ✓ Product synced: ${prod.name} (${prod.id})`);
    }

    // 3. Sync Users
    console.log("\n👥 Syncing Users to Firestore...");
    for (const user of users) {
      await db.collection("users").doc(user.uid).set(user, { merge: true });
      console.log(`  ✓ User synced: ${user.email} (${user.role})`);
    }

    // 4. Sync Orders
    if (orders.length > 0) {
      console.log("\n🛒 Syncing Orders to Firestore...");
      for (const order of orders) {
        await db.collection("orders").doc(order.id).set(order, { merge: true });
        console.log(`  ✓ Order synced: #${order.id} - ${order.customerName}`);
      }
    }

    console.log("\n==================================================");
    console.log("🎉 ALL DATA SUCCESSFULLY SYNCED TO FIREBASE FIRESTORE!");
    console.log("==================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error during Firestore sync:", err.message);
    process.exit(1);
  }
}

syncAllToFirebase();

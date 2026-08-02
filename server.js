// server.js
require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const cors = require("cors");

const { attachUser } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Attach req.user (or null) on every request based on the session cookie
app.use(attachUser);

// Expose firebase client config + current user to every EJS view without repeating it
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.firebaseClientConfig = {
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.PUBLIC_FIREBASE_APP_ID,
  };
  next();
});

app.use("/", authRoutes);
app.use("/", productRoutes);
app.use("/", adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "পেজ পাওয়া যায়নি",
    message: "এই পেজটি খুঁজে পাওয়া যায়নি।",
    user: req.user,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "কিছু একটা ভুল হয়েছে",
    message: "সার্ভারে একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।",
    user: req.user,
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`🛍️  Dokan running: http://localhost:${PORT}`));
}

module.exports = app; // exported for Vercel's serverless entry

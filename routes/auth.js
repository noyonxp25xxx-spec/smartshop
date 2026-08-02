// routes/auth.js — Authentication, Login, Register & Session Handling
const express = require("express");
const router = express.Router();
const { auth } = require("../config/firebaseAdmin");
const { createToken, COOKIE_NAME } = require("../middleware/auth");
const store = require("../services/store");

// GET /login — Render modern login & register page
router.get("/login", (req, res) => {
  if (req.user) {
    if (req.user.role === "admin") return res.redirect("/admin");
    return res.redirect("/");
  }
  res.render("login", {
    title: "লগইন ও সাইনআপ · স্মার্ট কম্পিউটার শপ",
    next: req.query.next || (req.query.role === "admin" ? "/admin" : "/"),
    user: null,
  });
});

// POST /api/login — Direct Email + Password authentication
router.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "ইমেইল ও পাসওয়ার্ড প্রদান করুন।" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if Admin credentials
    if (cleanEmail === "noyonxp25@gmail.com" && String(password).trim() === "805222") {
      const adminUser = await store.saveOrUpdateUser({
        uid: "admin-noyon-uid",
        email: cleanEmail,
        name: "Noyon (Admin)",
        role: "admin",
        password: "805222"
      });

      const token = createToken({
        uid: adminUser.uid,
        email: adminUser.email,
        name: adminUser.name,
        role: "admin"
      });

      res.cookie(COOKIE_NAME, token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      return res.json({ ok: true, role: "admin", redirect: "/admin" });
    }

    // 2. Check in database store
    const user = await store.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: "এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" });
    }

    const valid = store.verifyUserPassword(user, password);
    if (!valid) {
      return res.status(401).json({ error: "ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।" });
    }

    const token = createToken({
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role || "customer"
    });

    res.cookie(COOKIE_NAME, token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const redirectUrl = user.role === "admin" ? "/admin" : "/";
    res.json({ ok: true, role: user.role, redirect: redirectUrl });
  } catch (err) {
    console.error("Login API error:", err);
    res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে।" });
  }
});

// POST /api/register — New user signup
router.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: "সঠিক ইমেইল ও কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await store.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি আছে।" });
    }

    const role = cleanEmail === "noyonxp25@gmail.com" ? "admin" : "customer";
    const newUser = await store.saveOrUpdateUser({
      name: name || cleanEmail.split("@")[0],
      email: cleanEmail,
      password: password,
      phone: phone || "",
      role
    });

    const token = createToken({
      uid: newUser.uid,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    });

    res.cookie(COOKIE_NAME, token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({ ok: true, user: newUser, redirect: role === "admin" ? "/admin" : "/" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "অ্যাকাউন্ট তৈরি করা সম্ভব হয়নি।" });
  }
});

// POST /session — Firebase ID token / client exchange
router.post("/session", async (req, res) => {
  const { idToken, email, uid, name } = req.body;
  if (!idToken && !email) {
    return res.status(400).json({ error: "idToken missing" });
  }

  try {
    let userEmail = email;
    let userUid = uid;
    let userName = name;

    // If Firebase Admin Auth is active with credentials, verify
    if (auth && idToken) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        userEmail = decoded.email || userEmail;
        userUid = decoded.uid || userUid;
        userName = decoded.name || userName || userEmail;
      } catch (authErr) {
        console.warn("Firebase verifyIdToken fallback to token payload decode:", authErr.message);
        // Decode base64 payload safely
        try {
          const parts = idToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
            userEmail = payload.email || userEmail;
            userUid = payload.user_id || payload.sub || userUid;
            userName = payload.name || userName || userEmail;
          }
        } catch (e) {}
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: "ইমেইল পাওয়া যায়নি।" });
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    const isAdmin = cleanEmail === "noyonxp25@gmail.com";

    let dbUser = await store.getUserByEmail(cleanEmail);
    if (!dbUser) {
      dbUser = await store.saveOrUpdateUser({
        uid: userUid || "usr-" + Date.now(),
        email: cleanEmail,
        name: userName || cleanEmail.split("@")[0],
        role: isAdmin ? "admin" : "customer",
      });
    } else if (isAdmin && dbUser.role !== "admin") {
      await store.updateUserRole(dbUser.uid, "admin");
      dbUser.role = "admin";
    }

    const token = createToken({
      uid: dbUser.uid,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role
    });

    res.cookie(COOKIE_NAME, token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({ ok: true, role: dbUser.role, redirect: dbUser.role === "admin" ? "/admin" : "/" });
  } catch (err) {
    console.error("Session creation failed:", err);
    res.status(401).json({ error: "লগইন যাচাই করা যায়নি: " + err.message });
  }
});

// POST /logout
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true, redirect: "/" });
});

// GET /logout
router.get("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect("/");
});

module.exports = router;

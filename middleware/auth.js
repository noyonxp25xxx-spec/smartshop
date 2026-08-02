// middleware/auth.js — Robust Authentication Middleware
const crypto = require("crypto");
const { auth } = require("../config/firebaseAdmin");
const store = require("../services/store");

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "dokan_session";
const JWT_SECRET = process.env.SESSION_SECRET || "smart-computer-shop-ultra-secure-key-2026";

/**
 * Creates a tamper-proof HMAC signed token
 */
function createToken(payload, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Date.now() + expiresInMs;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a signed HMAC token
 */
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (signature !== expectedSig) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Reads cookie, verifies user session, and attaches req.user
 */
async function attachUser(req, res, next) {
  req.user = null;
  const cookie = req.cookies[COOKIE_NAME];

  if (!cookie) return next();

  // 1. Try our HMAC token first
  const customData = verifyToken(cookie);
  if (customData) {
    // Check if user still exists or has updated role
    const dbUser = await store.getUserById(customData.uid) || await store.getUserByEmail(customData.email);
    const role = dbUser ? dbUser.role : customData.role;
    
    req.user = {
      uid: customData.uid,
      email: customData.email,
      name: (dbUser && dbUser.name) || customData.name || customData.email,
      role: customData.email.toLowerCase() === "noyonxp25@gmail.com" ? "admin" : role || "customer"
    };
    return next();
  }

  // 2. Try Firebase Session Cookie if Firebase Admin Auth is active
  if (auth) {
    try {
      const decoded = await auth.verifySessionCookie(cookie, true);
      const dbUser = await store.getUserById(decoded.uid) || await store.getUserByEmail(decoded.email);
      const role = dbUser ? dbUser.role : (decoded.role || "customer");
      
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: (dbUser && dbUser.name) || decoded.name || decoded.email,
        role: decoded.email.toLowerCase() === "noyonxp25@gmail.com" ? "admin" : role
      };
      return next();
    } catch (err) {
      // bad cookie
    }
  }

  res.clearCookie(COOKIE_NAME);
  next();
}

/**
 * Protects routes from non-logged in users
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    if (req.originalUrl.startsWith("/api/") || req.xhr) {
      return res.status(401).json({ error: "অনুগ্রহ করে লগইন করুন" });
    }
    return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
  }
  next();
}

/**
 * Role-based access control
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      if (req.originalUrl.startsWith("/api/") || req.xhr) {
        return res.status(401).json({ error: "অনুগ্রহ করে লগইন করুন" });
      }
      return res.redirect("/login?next=" + encodeURIComponent(req.originalUrl));
    }

    if (!roles.includes(req.user.role)) {
      if (req.originalUrl.startsWith("/api/") || req.xhr) {
        return res.status(403).json({ error: "আপনার এই পেজ দেখার অনুমতি নেই" });
      }
      return res.status(403).render("error", {
        title: "প্রবেশাধিকার নেই",
        message: "এই সেকশনটি শুধুমাত্র " + roles.join("/") + "-দের জন্য সংরক্ষিত।",
        user: req.user
      });
    }
    next();
  };
}

module.exports = {
  attachUser,
  requireAuth,
  requireRole,
  createToken,
  verifyToken,
  COOKIE_NAME
};

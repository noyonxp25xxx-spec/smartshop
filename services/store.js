// services/store.js — Unified Data Service (Firebase Firestore + Local Cache Dual-Engine)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { db, hasCredentials } = require("../config/firebaseAdmin");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial sample tech products for Smart Computer Shop
const initialProducts = [
  {
    id: "prod-1",
    name: "ASUS ROG Strix G16 Gaming Laptop (Core i7 13th Gen, 16GB, 1TB NVMe, RTX 4060 8GB)",
    category: "ল্যাপটপ",
    uniqueCode: "ROG-G16-4060",
    buyPrice: 175000,
    sellPrice: 198000,
    stock: 8,
    description: "16-inch FHD+ 165Hz Display, 13th Gen Intel Core i7-13650HX, 16GB DDR5 4800MHz RAM, 1TB PCIe 4.0 NVMe M.2 SSD, NVIDIA GeForce RTX 4060 8GB GDDR6.",
    imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-2",
    name: "Intel Core i7-14700K 14th Gen Processor (20 Cores, Up to 5.6GHz)",
    category: "প্রসেসর",
    uniqueCode: "INTEL-14700K",
    buyPrice: 42000,
    sellPrice: 47500,
    stock: 14,
    description: "Intel 14th Gen Raptor Lake Refresh Processor. 20 Cores (8 P-cores + 12 E-cores), 28 Threads, LGA1700 Socket, Intel UHD Graphics 770.",
    imageUrl: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-3",
    name: "Samsung Odyssey G5 27\" QHD 165Hz Curved Gaming Monitor (1ms, HDR10)",
    category: "মনিটর",
    uniqueCode: "SAM-G5-27",
    buyPrice: 28500,
    sellPrice: 32900,
    stock: 6,
    description: "27 inch WQHD (2560 x 1440) 1000R Curved VA Panel, 165Hz Refresh Rate, 1ms Response Time, AMD FreeSync Premium, HDR10 support.",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-4",
    name: "Corsair K70 RGB PRO Mechanical Gaming Keyboard (Cherry MX Red)",
    category: "গেমিং গিয়ার",
    uniqueCode: "COR-K70-PRO",
    buyPrice: 12500,
    sellPrice: 14800,
    stock: 18,
    description: "Full-size Mechanical Gaming Keyboard with durable aluminum frame, Cherry MX Red switches, AXON hyper-processing technology, per-key RGB backlighting.",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-5",
    name: "Logitech G Pro X Superlight Wireless Gaming Mouse (White)",
    category: "গেমিং গিয়ার",
    uniqueCode: "LOGI-GPX-W",
    buyPrice: 11000,
    sellPrice: 13200,
    stock: 12,
    description: "Ultra-lightweight under 63g, HERO 25K Sensor, Lightspeed Wireless, Zero-additive PTFE feet, up to 70 hours battery life.",
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-6",
    name: "Samsung 990 PRO 2TB PCIe 4.0 NVMe M.2 SSD (Up to 7450MB/s)",
    category: "র‍্যাম ও এসএসডি",
    uniqueCode: "SAM-990P-2TB",
    buyPrice: 18500,
    sellPrice: 21500,
    stock: 22,
    description: "Read speeds up to 7,450 MB/s, write speeds up to 6,900 MB/s. V-NAND TLC, Samsung in-house controller, dynamic thermal guard.",
    imageUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-7",
    name: "Corsair Vengeance RGB DDR5 32GB (2x16GB) 6000MHz Desktop RAM",
    category: "র‍্যাম ও এসএসডি",
    uniqueCode: "COR-DDR5-32G",
    buyPrice: 13000,
    sellPrice: 15400,
    stock: 15,
    description: "High-performance DDR5 memory with ten-zone RGB lighting, onboard voltage regulation, custom Intel XMP 3.0 profiles.",
    imageUrl: "https://images.unsplash.com/photo-1541140532154-b024d705b909?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod-8",
    name: "Gigabyte GeForce RTX 4070 Super Eagle OC 12GB Graphics Card",
    category: "গ্রাফিক্স কার্ড",
    uniqueCode: "RTX-4070S-12G",
    buyPrice: 78000,
    sellPrice: 87500,
    stock: 4,
    description: "Windforce 3X Cooling System, 12GB 192-bit GDDR6X, DLSS 3, Ray Tracing, Dual BIOS, RGB Fusion.",
    imageUrl: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initial default categories
const initialCategories = [
  { id: "cat-1", name: "ল্যাপটপ", icon: "💻", createdAt: new Date().toISOString() },
  { id: "cat-2", name: "প্রসেসর", icon: "⚡", createdAt: new Date().toISOString() },
  { id: "cat-3", name: "মনিটর", icon: "🖥️", createdAt: new Date().toISOString() },
  { id: "cat-4", name: "গেমিং গিয়ার", icon: "🎮", createdAt: new Date().toISOString() },
  { id: "cat-5", name: "র‍্যাম ও এসএসডি", icon: "💾", createdAt: new Date().toISOString() },
  { id: "cat-6", name: "গ্রাফিক্স কার্ড", icon: "🖥️", createdAt: new Date().toISOString() },
  { id: "cat-7", name: "এক্সেসরিজ", icon: "🔌", createdAt: new Date().toISOString() }
];

function hashPassword(pass) {
  return crypto.createHash("sha256").update(String(pass || "")).digest("hex");
}

// Initial admin user
const initialUsers = [
  {
    uid: "admin-noyon-uid",
    email: "noyonxp25@gmail.com",
    name: "Noyon (Admin)",
    role: "admin",
    passwordHash: hashPassword("805222"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function loadLocalData() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      if (raw.trim() === "") throw new Error("File is empty");
      const parsed = JSON.parse(raw);
      return {
        products: Array.isArray(parsed.products) ? parsed.products : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : initialCategories,
        users: Array.isArray(parsed.users) ? parsed.users : initialUsers,
        orders: Array.isArray(parsed.orders) ? parsed.orders : []
      };
    }
  } catch (err) {
    console.error("Local database read error:", err.message);
    if (fs.existsSync(DB_FILE)) {
      try { fs.copyFileSync(DB_FILE, DB_FILE + ".corrupted.bak"); } catch (e) {}
    }
  }
  const defaultData = { products: [], categories: initialCategories, users: initialUsers, orders: [] };
  if (!fs.existsSync(DB_FILE)) {
    saveLocalData(defaultData);
  }
  return defaultData;
}

function saveLocalData(data) {
  try {
    const tempFile = DB_FILE + ".tmp";
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Local database write error:", err.message);
  }
}

// Memory cache + local JSON sync
let memoryStore = loadLocalData();

// Ensure default admin user always exists
if (!memoryStore.users.some(u => u.email.toLowerCase() === "noyonxp25@gmail.com")) {
  memoryStore.users.push({
    uid: "admin-noyon-uid",
    email: "noyonxp25@gmail.com",
    name: "Noyon (Admin)",
    role: "admin",
    passwordHash: hashPassword("805222"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  saveLocalData(memoryStore);
}

// ---------------- FIRESTORE AUTO-SEED & SYNC ---------------- //

async function autoSyncFirestoreIfConnected() {
  if (!db) return;
  try {
    // Check if products collection has docs
    const prodSnap = await db.collection("products").limit(1).get();
    if (prodSnap.empty && memoryStore.products.length > 0) {
      console.log("🚀 Syncing existing products to Firebase Firestore...");
      const batch = db.batch();
      memoryStore.products.forEach(p => {
        const ref = db.collection("products").doc(p.id);
        batch.set(ref, p);
      });
      await batch.commit();
      console.log(`✅ Uploaded ${memoryStore.products.length} products to Firestore.`);
    }

    // Check if categories collection has docs
    const catSnap = await db.collection("categories").limit(1).get();
    if (catSnap.empty && memoryStore.categories.length > 0) {
      console.log("🚀 Syncing existing categories to Firebase Firestore...");
      const batch = db.batch();
      memoryStore.categories.forEach(c => {
        const ref = db.collection("categories").doc(c.id);
        batch.set(ref, c);
      });
      await batch.commit();
      console.log(`✅ Uploaded ${memoryStore.categories.length} categories to Firestore.`);
    }

    // Check if admin user is in Firestore
    const adminDoc = await db.collection("users").doc("admin-noyon-uid").get();
    if (!adminDoc.exists) {
      const adminUser = memoryStore.users.find(u => u.email.toLowerCase() === "noyonxp25@gmail.com") || initialUsers[0];
      await db.collection("users").doc(adminUser.uid).set(adminUser);
      console.log("✅ Synced Admin account to Firestore users collection.");
    }
  } catch (err) {
    console.warn("⚠️ Firestore auto-sync warning:", err.message);
  }
}

// Run auto-sync if connected
if (hasCredentials && db) {
  setTimeout(() => {
    autoSyncFirestoreIfConnected();
  }, 1500);
}

// ---------------- PRODUCTS API ---------------- //

async function getAllProducts() {
  if (db) {
    try {
      const snap = await db.collection("products").get();
      if (!snap.empty) {
        const prods = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort descending by createdAt
        prods.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        // Keep memoryStore updated with fresh cloud data
        memoryStore.products = prods;
        saveLocalData(memoryStore);
        return prods;
      }
    } catch (e) {
      console.warn("Firestore getAllProducts fallback:", e.message);
    }
  }
  return [...memoryStore.products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function getProductById(id) {
  if (db) {
    try {
      const doc = await db.collection("products").doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
    } catch (e) {}
  }
  return memoryStore.products.find(p => p.id === id) || null;
}

async function searchProducts(q) {
  const products = await getAllProducts();
  const cleanQ = (q || "").trim().toLowerCase();
  if (!cleanQ) return [];

  // Exact unique code match first
  const codeMatches = products.filter(
    p => p.uniqueCode && p.uniqueCode.toLowerCase() === cleanQ
  );
  if (codeMatches.length > 0) return codeMatches;

  // Substring match on name, category, code, description
  return products.filter(p => {
    return (
      (p.name && p.name.toLowerCase().includes(cleanQ)) ||
      (p.category && p.category.toLowerCase().includes(cleanQ)) ||
      (p.uniqueCode && p.uniqueCode.toLowerCase().includes(cleanQ)) ||
      (p.description && p.description.toLowerCase().includes(cleanQ))
    );
  });
}

async function createProduct(data) {
  const newId = "prod-" + Date.now();
  const product = {
    id: newId,
    name: (data.name || "").trim(),
    category: (data.category || "").trim() || "কম্পিউটার গ্যাজেট",
    uniqueCode: (data.uniqueCode ? String(data.uniqueCode).trim().toUpperCase() : null),
    buyPrice: Number(data.buyPrice) || 0,
    sellPrice: Number(data.sellPrice) || 0,
    stock: Number(data.stock) || 0,
    description: (data.description || "").trim(),
    imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Sync locally
  memoryStore.products.unshift(product);
  saveLocalData(memoryStore);

  // Sync with Firestore Cloud
  if (db) {
    try {
      await db.collection("products").doc(newId).set(product);
      console.log(`🔥 [Firestore] Created product '${product.name}' (${newId})`);
    } catch (e) {
      console.error("Firestore sync error on create:", e.message);
    }
  }

  return product;
}

async function updateProduct(id, data) {
  const idx = memoryStore.products.findIndex(p => p.id === id);
  const existing = idx !== -1 ? memoryStore.products[idx] : (await getProductById(id)) || {};

  const updated = {
    ...existing,
    id,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    category: data.category !== undefined ? data.category.trim() : existing.category,
    uniqueCode: data.uniqueCode !== undefined ? (data.uniqueCode ? String(data.uniqueCode).trim().toUpperCase() : null) : existing.uniqueCode,
    buyPrice: data.buyPrice !== undefined ? Number(data.buyPrice) : existing.buyPrice,
    sellPrice: data.sellPrice !== undefined ? Number(data.sellPrice) : existing.sellPrice,
    stock: data.stock !== undefined ? Number(data.stock) : existing.stock,
    description: data.description !== undefined ? data.description.trim() : existing.description,
    imageUrl: data.imageUrl || existing.imageUrl,
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    memoryStore.products[idx] = updated;
  } else {
    memoryStore.products.push(updated);
  }
  saveLocalData(memoryStore);

  // Sync with Firestore Cloud
  if (db) {
    try {
      await db.collection("products").doc(id).set(updated, { merge: true });
      console.log(`🔥 [Firestore] Updated product '${updated.name}' (${id})`);
    } catch (e) {
      console.error("Firestore sync error on update:", e.message);
    }
  }

  return updated;
}

async function deleteProduct(id) {
  memoryStore.products = memoryStore.products.filter(p => p.id !== id);
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("products").doc(id).delete();
      console.log(`🔥 [Firestore] Deleted product ${id}`);
    } catch (e) {
      console.error("Firestore sync error on delete:", e.message);
    }
  }
  return true;
}

// ---------------- USERS & AUTH API ---------------- //

async function getAllUsers() {
  if (db) {
    try {
      const snap = await db.collection("users").get();
      if (!snap.empty) {
        const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
        users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        memoryStore.users = users;
        saveLocalData(memoryStore);
        return users;
      }
    } catch (e) {}
  }
  return [...memoryStore.users].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function getUserByEmail(email) {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  
  if (db) {
    try {
      const snap = await db.collection("users").where("email", "==", clean).limit(1).get();
      if (!snap.empty) {
        return { uid: snap.docs[0].id, ...snap.docs[0].data() };
      }
    } catch (e) {}
  }

  return memoryStore.users.find(u => u.email.toLowerCase() === clean) || null;
}

async function getUserById(uid) {
  if (!uid) return null;
  if (db) {
    try {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) return { uid: doc.id, ...doc.data() };
    } catch (e) {}
  }
  return memoryStore.users.find(u => u.uid === uid) || null;
}

async function saveOrUpdateUser(userObj) {
  const cleanEmail = (userObj.email || "").trim().toLowerCase();
  const isAdminEmail = cleanEmail === "noyonxp25@gmail.com";
  
  const uid = userObj.uid || "usr-" + Date.now();
  const role = isAdminEmail ? "admin" : (userObj.role || "customer");

  const existingIdx = memoryStore.users.findIndex(
    u => u.uid === uid || u.email.toLowerCase() === cleanEmail
  );

  const finalUser = {
    uid,
    email: cleanEmail,
    name: userObj.name || cleanEmail.split("@")[0],
    role,
    passwordHash: userObj.password ? hashPassword(userObj.password) : (existingIdx !== -1 ? memoryStore.users[existingIdx].passwordHash : null),
    updatedAt: new Date().toISOString(),
    createdAt: existingIdx !== -1 ? memoryStore.users[existingIdx].createdAt : new Date().toISOString()
  };

  if (existingIdx !== -1) {
    memoryStore.users[existingIdx] = finalUser;
  } else {
    memoryStore.users.push(finalUser);
  }
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("users").doc(uid).set(finalUser, { merge: true });
      console.log(`🔥 [Firestore] Saved user ${finalUser.email} (${uid})`);
    } catch (e) {}
  }

  return finalUser;
}

async function updateUserRole(uid, role) {
  const user = memoryStore.users.find(u => u.uid === uid);
  if (user) {
    user.role = role;
    user.updatedAt = new Date().toISOString();
    saveLocalData(memoryStore);
  }

  if (db) {
    try {
      await db.collection("users").doc(uid).set({ role, updatedAt: new Date().toISOString() }, { merge: true });
      console.log(`🔥 [Firestore] Updated user ${uid} role to ${role}`);
    } catch (e) {}
  }
  return true;
}

function verifyUserPassword(user, password) {
  if (!user || !password) return false;
  
  // Direct admin credentials check
  if (user.email.toLowerCase() === "noyonxp25@gmail.com" && String(password) === "805222") {
    return true;
  }
  
  return user.passwordHash === hashPassword(password);
}

// ---------------- CATEGORIES API ---------------- //

async function getAllCategories() {
  if (db) {
    try {
      const snap = await db.collection("categories").get();
      if (!snap.empty) {
        const cats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cats.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        memoryStore.categories = cats;
        saveLocalData(memoryStore);
        return cats;
      }
    } catch (e) {}
  }
  return memoryStore.categories || [];
}

async function getCategoryById(id) {
  if (db) {
    try {
      const doc = await db.collection("categories").doc(id).get();
      if (doc.exists) return { id: doc.id, ...doc.data() };
    } catch (e) {}
  }
  return (memoryStore.categories || []).find(c => c.id === id) || null;
}

async function createCategory(data) {
  const newId = "cat-" + Date.now();
  const cat = {
    id: newId,
    name: (data.name || "").trim(),
    icon: (data.icon || "📦").trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!memoryStore.categories) memoryStore.categories = [];
  memoryStore.categories.push(cat);
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("categories").doc(newId).set(cat);
      console.log(`🔥 [Firestore] Created category '${cat.name}' (${newId})`);
    } catch (e) {}
  }
  return cat;
}

async function updateCategory(id, data) {
  if (!memoryStore.categories) memoryStore.categories = [];
  const idx = memoryStore.categories.findIndex(c => c.id === id);
  const existing = idx !== -1 ? memoryStore.categories[idx] : (await getCategoryById(id)) || {};

  const updated = {
    ...existing,
    id,
    name: data.name !== undefined ? data.name.trim() : existing.name,
    icon: data.icon !== undefined ? data.icon.trim() : (existing.icon || "📦"),
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    const oldName = existing.name;
    const newName = updated.name;
    if (oldName && newName && oldName !== newName) {
      memoryStore.products.forEach(p => {
        if (p.category === oldName) {
          p.category = newName;
          p.updatedAt = new Date().toISOString();
        }
      });
    }
    memoryStore.categories[idx] = updated;
  }
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("categories").doc(id).set(updated, { merge: true });
      console.log(`🔥 [Firestore] Updated category '${updated.name}' (${id})`);
    } catch (e) {}
  }
  return updated;
}

async function deleteCategory(id) {
  if (!memoryStore.categories) memoryStore.categories = [];
  memoryStore.categories = memoryStore.categories.filter(c => c.id !== id);
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("categories").doc(id).delete();
      console.log(`🔥 [Firestore] Deleted category ${id}`);
    } catch (e) {}
  }
  return true;
}

// ---------------- ORDERS API (FIRESTORE CLOUD) ---------------- //

async function createOrder(data) {
  const orderId = "ord-" + Date.now();
  const order = {
    id: orderId,
    productId: data.productId || null,
    productName: data.productName || "অজ্ঞাত পণ্য",
    productCode: data.productCode || null,
    price: Number(data.price) || 0,
    customerName: (data.customerName || data.name || "").trim(),
    phone: (data.phone || "").trim(),
    address: (data.address || "").trim(),
    status: "pending", // pending, confirmed, delivered, cancelled
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!memoryStore.orders) memoryStore.orders = [];
  memoryStore.orders.unshift(order);
  saveLocalData(memoryStore);

  if (db) {
    try {
      await db.collection("orders").doc(orderId).set(order);
      console.log(`🔥 [Firestore] Saved new customer order #${orderId}`);
    } catch (e) {
      console.error("Firestore order save error:", e.message);
    }
  }

  return order;
}

async function getAllOrders() {
  if (db) {
    try {
      const snap = await db.collection("orders").get();
      if (!snap.empty) {
        const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        memoryStore.orders = orders;
        saveLocalData(memoryStore);
        return orders;
      }
    } catch (e) {}
  }
  return [...(memoryStore.orders || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function updateOrderStatus(orderId, status) {
  if (!memoryStore.orders) memoryStore.orders = [];
  const order = memoryStore.orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    saveLocalData(memoryStore);
  }

  if (db) {
    try {
      await db.collection("orders").doc(orderId).set({ status, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {}
  }
  return true;
}

module.exports = {
  getAllProducts,
  getProductById,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllUsers,
  getUserByEmail,
  getUserById,
  saveOrUpdateUser,
  updateUserRole,
  verifyUserPassword,
  hashPassword,
  createOrder,
  getAllOrders,
  updateOrderStatus,
  autoSyncFirestoreIfConnected
};

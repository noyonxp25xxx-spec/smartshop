// routes/admin.js — Admin Panel Routes (Products, Stock, Users & Reseller Management)
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const store = require("../services/store");
const { bucket } = require("../config/firebaseAdmin");
const { requireRole } = require("../middleware/auth");

// Configure local upload storage
const UPLOADS_DIR = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".jpg";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "product-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Protect all admin routes — only accessible by admin
router.use(requireRole("admin"));

// ---------- PAGES ---------- //

// GET /admin — Dashboard
router.get("/admin", async (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const products = await store.getAllProducts();
    const users = await store.getAllUsers();

    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + ((Number(p.buyPrice) || Number(p.sellPrice) || 0) * (Number(p.stock) || 0)), 0);
    const lowStock = products.filter((p) => Number(p.stock) <= 5).length;
    const resellersCount = users.filter((u) => u.role === "reseller").length;

    res.render("admin/dashboard", {
      title: "অ্যাডমিন ড্যাশবোর্ড · স্মার্ট কম্পিউটার শপ",
      user: req.user,
      stats: {
        totalProducts: products.length,
        totalStock,
        totalInventoryValue,
        lowStock,
        resellersCount,
        totalUsers: users.length,
      },
      recentProducts: products.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/products — All products list
router.get("/admin/products", async (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const products = await store.getAllProducts();
    res.render("admin/products", {
      title: "পণ্য তালিকা ও স্টক ম্যানেজমেন্ট · অ্যাডমিন",
      user: req.user,
      products,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/categories — Category Management Page
router.get("/admin/categories", async (req, res, next) => {
  try {
    const categories = await store.getAllCategories();
    const products = await store.getAllProducts();

    // Map product counts to each category
    const categoriesWithCount = categories.map(c => ({
      ...c,
      productCount: products.filter(p => p.category === c.name).length
    }));

    res.render("admin/categories", {
      title: "ক্যাটাগরি ম্যানেজমেন্ট · অ্যাডমিন",
      user: req.user,
      categories: categoriesWithCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/products/new — Add new product form
router.get("/admin/products/new", async (req, res, next) => {
  try {
    const categories = await store.getAllCategories();
    res.render("admin/product-form", {
      title: "নতুন পণ্য যোগ করুন · অ্যাডমিন",
      user: req.user,
      product: null,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/products/:id/edit — Edit product form
router.get("/admin/products/:id/edit", async (req, res, next) => {
  try {
    const product = await store.getProductById(req.params.id);
    if (!product) return res.redirect("/admin/products");
    const categories = await store.getAllCategories();
    res.render("admin/product-form", {
      title: "পণ্য এডিট · " + product.name,
      user: req.user,
      product,
      categories,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users — User & Reseller management
router.get("/admin/users", async (req, res, next) => {
  try {
    const users = await store.getAllUsers();
    res.render("admin/users", {
      title: "ইউজার ও রিসেলার রোল ম্যানেজমেন্ট · অ্যাডমিন",
      user: req.user,
      users,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- API: PRODUCTS ---------- //

// POST /admin/api/products — Create product
router.post("/admin/api/products", upload.single("image"), async (req, res) => {
  try {
    const { name, category, uniqueCode, buyPrice, sellPrice, stock, description, imageUrlInput } = req.body;

    if (!name || sellPrice === undefined) {
      return res.status(400).json({ error: "পণ্যের নাম ও বিক্রয় মূল্য আবশ্যক।" });
    }

    let imageUrl = imageUrlInput ? imageUrlInput.trim() : null;
    if (req.file) {
      imageUrl = "/uploads/" + req.file.filename;
    }
    if (!imageUrl) {
      imageUrl = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80";
    }

    const formattedCode = uniqueCode ? String(uniqueCode).trim().toUpperCase() : null;

    const created = await store.createProduct({
      name,
      category,
      uniqueCode: formattedCode,
      buyPrice,
      sellPrice,
      stock,
      description,
      imageUrl,
    });

    res.json({ ok: true, product: created });
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: err.message || "পণ্য যোগ করতে সমস্যা হয়েছে।" });
  }
});

// PUT /admin/api/products/:id — Update product
router.put("/admin/api/products/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, category, uniqueCode, buyPrice, sellPrice, stock, description, imageUrlInput } = req.body;

    const data = {
      name,
      category,
      uniqueCode: uniqueCode !== undefined ? (uniqueCode ? String(uniqueCode).trim().toUpperCase() : null) : undefined,
      buyPrice,
      sellPrice,
      stock,
      description,
    };

    if (req.file) {
      data.imageUrl = "/uploads/" + req.file.filename;
    } else if (imageUrlInput) {
      data.imageUrl = imageUrlInput.trim();
    }

    const updated = await store.updateProduct(req.params.id, data);
    if (!updated) {
      return res.status(404).json({ error: "পণ্য পাওয়া যায়নি।" });
    }

    res.json({ ok: true, product: updated });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: err.message || "পণ্য আপডেট করতে সমস্যা হয়েছে।" });
  }
});

// PATCH /admin/api/products/:id/stock — Instant Stock Modifier (+/-)
router.patch("/admin/api/products/:id/stock", async (req, res) => {
  try {
    const { delta } = req.body;
    const p = await store.getProductById(req.params.id);
    if (!p) return res.status(404).json({ error: "পণ্য পাওয়া যায়নি।" });

    const newStock = Math.max(0, (Number(p.stock) || 0) + Number(delta));
    const updated = await store.updateProduct(req.params.id, { stock: newStock });
    res.json({ ok: true, stock: updated.stock });
  } catch (err) {
    res.status(500).json({ error: "স্টক আপডেট করা যায়নি।" });
  }
});

// DELETE /admin/api/products/:id — Delete product
router.delete("/admin/api/products/:id", async (req, res) => {
  try {
    await store.deleteProduct(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: err.message || "পণ্য মুছতে সমস্যা হয়েছে।" });
  }
});

// ---------- API: USERS / RESELLER ROLE ---------- //

// PUT /admin/api/users/:uid/role — Set Role
router.put("/admin/api/users/:uid/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "reseller", "customer"].includes(role)) {
      return res.status(400).json({ error: "অবৈধ রোল।" });
    }

    await store.updateUserRole(req.params.uid, role);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "রোল পরিবর্তন করা যায়নি।" });
  }
});

// ---------- API: CATEGORIES ---------- //

// POST /admin/api/categories — Add new category
router.post("/admin/api/categories", async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "ক্যাটাগরির নাম আবশ্যক।" });
    }

    const categories = await store.getAllCategories();
    if (categories.some(c => c.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({ error: "এই নামের ক্যাটাগরি ইতিমধ্যে বিদ্যমান আছে।" });
    }

    const created = await store.createCategory({
      name: name.trim(),
      icon: (icon || "📦").trim(),
    });

    res.json({ ok: true, category: created });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ error: "ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে।" });
  }
});

// PUT /admin/api/categories/:id — Update category
router.put("/admin/api/categories/:id", async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "ক্যাটাগরির নাম আবশ্যক।" });
    }

    const updated = await store.updateCategory(req.params.id, {
      name: name.trim(),
      icon: (icon || "📦").trim(),
    });

    if (!updated) {
      return res.status(404).json({ error: "ক্যাটাগরি পাওয়া যায়নি।" });
    }

    res.json({ ok: true, category: updated });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ error: "ক্যাটাগরি আপডেট করতে সমস্যা হয়েছে।" });
  }
});

// DELETE /admin/api/categories/:id — Delete category
router.delete("/admin/api/categories/:id", async (req, res) => {
  try {
    const cat = await store.getCategoryById(req.params.id);
    if (!cat) {
      return res.status(404).json({ error: "ক্যাটাগরি পাওয়া যায়নি।" });
    }

    await store.deleteCategory(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "ক্যাটাগরি মুছতে সমস্যা হয়েছে।" });
  }
});

module.exports = router;

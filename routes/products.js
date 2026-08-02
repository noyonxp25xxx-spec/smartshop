// routes/products.js — Public Storefront & Fast Search API
const express = require("express");
const router = express.Router();
const store = require("../services/store");

// Resellers and Admins can see the buy/wholesale price
function canSeeBuyPrice(user) {
  return user && (user.role === "admin" || user.role === "reseller");
}

function shapeProduct(p, user) {
  const base = {
    id: p.id,
    name: p.name,
    category: p.category || "কম্পিউটার গ্যাজেট",
    uniqueCode: p.uniqueCode || null,
    sellPrice: Number(p.sellPrice) || 0,
    stock: Number(p.stock) || 0,
    imageUrl: p.imageUrl || "/img/no-image.svg",
    description: p.description || "",
  };
  if (canSeeBuyPrice(user)) {
    base.buyPrice = Number(p.buyPrice) || 0;
    base.margin = base.sellPrice - base.buyPrice;
  }
  return base;
}

// GET / — Storefront Home with Category Filter + Live Search + Product Grid
router.get("/", async (req, res, next) => {
  try {
    const allProducts = await store.getAllProducts();
    const category = (req.query.category || "").trim();
    
    let filtered = allProducts;
    if (category && category !== "all") {
      filtered = allProducts.filter(p => p.category === category);
    }

    const products = filtered.map(p => shapeProduct(p, req.user));
    
    // Load categories from store
    const categories = await store.getAllCategories();

    res.render("index", {
      title: "স্মার্ট কম্পিউটার শপ · প্রিমিয়াম টেক গ্যাজেট ও পিসি শপ",
      products,
      categories,
      selectedCategory: category,
      query: "",
      user: req.user,
    });
  } catch (err) {
    console.error("Storefront render error:", err);
    res.render("index", {
      title: "স্মার্ট কম্পিউটার শপ",
      products: [],
      categories: [],
      selectedCategory: "",
      query: "",
      user: req.user,
    });
  }
});

// GET /api/products/search?q=... — Fast live search API
router.get("/api/products/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      const all = await store.getAllProducts();
      return res.json({ products: all.slice(0, 40).map(p => shapeProduct(p, req.user)) });
    }

    const matches = await store.searchProducts(q);
    res.json({ products: matches.map(p => shapeProduct(p, req.user)) });
  } catch (err) {
    console.error("Search API error:", err);
    res.status(500).json({ error: "অনুসন্ধান ব্যর্থ হয়েছে" });
  }
});

// GET /product/:id — Single product detail page
router.get("/product/:id", async (req, res) => {
  try {
    const p = await store.getProductById(req.params.id);
    if (!p) {
      return res.status(404).render("error", {
        title: "পণ্য পাওয়া যায়নি",
        message: "এই পণ্যটি আমাদের ক্যাটালগে খুঁজে পাওয়া যায়নি।",
        user: req.user,
      });
    }

    const allProducts = await store.getAllProducts();
    const related = allProducts
      .filter(item => item.id !== p.id && item.category === p.category)
      .slice(0, 4)
      .map(item => shapeProduct(item, req.user));

    res.render("product", {
      title: `${p.name} · স্মার্ট কম্পিউটার শপ`,
      product: shapeProduct(p, req.user),
      related,
      user: req.user,
    });
  } catch (err) {
    console.error("Product detail error:", err);
    res.status(500).render("error", {
      title: "ত্রুটি",
      message: "পণ্য লোড করার সময় সমস্যা হয়েছে।",
      user: req.user,
    });
  }
});

module.exports = router;

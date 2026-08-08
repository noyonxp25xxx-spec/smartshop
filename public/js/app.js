// public/js/app.js — Storefront Interactivity & Fast Search

// 1. Copy Unique Product Code
function copyProductCode(code, event) {
  if (event) event.stopPropagation();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`কোড #${code} কপি করা হয়েছে!`);
    }).catch(() => {
      fallbackCopy(code);
    });
  } else {
    fallbackCopy(code);
  }
}

function copyCodeFromEl(el, event) {
  if (event) event.stopPropagation();
  const code = el.getAttribute("data-code");
  if (code) copyProductCode(code, event);
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  showToast(`কোড #${text} কপি করা হয়েছে!`);
}

// 2. Simple Toast Notification
function showToast(msg) {
  let toast = document.getElementById("shopToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "shopToast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--accent-cyan);
      color: #FFFFFF;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0, 210, 255, 0.3);
      z-index: 9999;
      transition: all 0.3s ease;
      transform: translateY(100px);
      opacity: 0;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.transform = "translateY(0)";
  toast.style.opacity = "1";

  setTimeout(() => {
    toast.style.transform = "translateY(100px)";
    toast.style.opacity = "0";
  }, 3000);
}

// 3. Quick Order Modal Management
let currentOrderProduct = null;

function openOrderModal(id, name, code, price) {
  currentOrderProduct = { id, name, code, price };
  const idEl = document.getElementById("orderProductId");
  const nameEl = document.getElementById("orderProductName");
  const codeEl = document.getElementById("orderProductCode");
  const priceEl = document.getElementById("orderProductPrice");
  const sumEl = document.getElementById("modalProductSummary");

  if (idEl) idEl.value = id;
  if (nameEl) nameEl.value = name;
  if (codeEl) codeEl.value = code || "";
  if (priceEl) priceEl.value = price;
  
  if (sumEl) {
    sumEl.innerHTML = `
      <strong>${escapeHtml(name)}</strong> ${code ? `(#${escapeHtml(code)})` : ""} — 
      <span style="color: var(--accent-cyan); font-weight: bold;">৳${Number(price).toLocaleString("en-US")}</span>
    `;
  }

  const modal = document.getElementById("quickOrderModal");
  if (modal) modal.classList.add("active");
}

function closeOrderModal() {
  const modal = document.getElementById("quickOrderModal");
  if (modal) modal.classList.remove("active");
}

function handleCardOrder(btn) {
  const id = btn.getAttribute("data-id");
  const name = btn.getAttribute("data-name");
  const code = btn.getAttribute("data-code");
  const price = btn.getAttribute("data-price");
  openOrderModal(id, name, code, price);
}

function handleCardWhatsApp(btn) {
  const name = btn.getAttribute("data-name");
  const code = btn.getAttribute("data-code");
  const price = btn.getAttribute("data-price");
  quickWhatsApp(name, code, price);
}

function orderViaWhatsApp() {
  if (!currentOrderProduct) return;
  const name = document.getElementById("orderCustName")?.value || "কাস্টমার";
  const phone = document.getElementById("orderCustPhone")?.value || "";
  const address = document.getElementById("orderCustAddress")?.value || "";

  let msg = `*নতুন অর্ডার — স্মার্ট কম্পিউটার শপ*\n\n`;
  msg += `*পণ্য:* ${currentOrderProduct.name}\n`;
  if (currentOrderProduct.code) msg += `*কোড:* #${currentOrderProduct.code}\n`;
  msg += `*মূল্য:* ৳${Number(currentOrderProduct.price).toLocaleString("en-US")}\n\n`;
  if (name) msg += `*কাস্টমারের নাম:* ${name}\n`;
  if (phone) msg += `*ফোন:* ${phone}\n`;
  if (address) msg += `*ঠিকানা:* ${address}\n`;

  const waUrl = `https://wa.me/8801742192026?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank");
}

function quickWhatsApp(name, code, price) {
  let msg = `*স্মার্ট কম্পিউটার শপ*\nহ্যালো, আমি এই পণ্যটি অর্ডার করতে চাই:\n*${name}*\nকোড: #${code || "N/A"}\nমূল্য: ৳${Number(price).toLocaleString("en-US")}`;
  const waUrl = `https://wa.me/8801742192026?text=${encodeURIComponent(msg)}`;
  window.open(waUrl, "_blank");
}

async function handleDirectOrder(e) {
  e.preventDefault();
  const name = document.getElementById("orderCustName")?.value || "গ্রাহক";
  const phone = document.getElementById("orderCustPhone")?.value || "";
  const address = document.getElementById("orderCustAddress")?.value || "";

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: currentOrderProduct.id,
        productName: currentOrderProduct.name,
        productCode: currentOrderProduct.code,
        price: currentOrderProduct.price,
        name,
        phone,
        address
      })
    });
    const data = await res.json();
    if (res.ok) {
      closeOrderModal();
      showToast(`🎉 ধন্যবাদ ${name}! আপনার অর্ডারটি #${data.order.id} সফলভাবে গ্রহণ করা হয়েছে।`);
    } else {
      showToast(data.error || "অর্ডার গ্রহণ করা সম্ভব হয়নি।");
    }
  } catch (err) {
    closeOrderModal();
    showToast(`ধন্যবাদ ${name}! আপনার অর্ডারটি গ্রহণ করা হয়েছে।`);
  }
}

// 4. Live Fast Search Debouncer
let searchTimeout = null;

function setupLiveSearch(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();

    searchTimeout = setTimeout(async () => {
      await performLiveSearch(q);
    }, 250);
  });
}

async function performLiveSearch(q) {
  const grid = document.getElementById("productGrid");
  const info = document.getElementById("resultsInfo");
  if (!grid) return;

  try {
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    const products = data.products || [];

    if (info) {
      if (q) {
        info.innerHTML = `<div style="background: rgba(0,210,255,0.1); border: 1px solid rgba(0,210,255,0.3); padding: 8px 14px; border-radius: 8px; font-size: 13px; color: var(--accent-cyan);">'${escapeHtml(q)}' এর জন্য ${products.length} টি পণ্য পাওয়া গেছে।</div>`;
      } else {
        info.innerHTML = "";
      }
    }

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>কোনো পণ্য পাওয়া যায়নি</h3>
          <p style="margin-top: 8px;">অন্য কোনো নাম অথবা কোড দিয়ে সার্চ করুন।</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => renderProductCardHtml(p)).join("");
  } catch (e) {
    console.error("Live search failed:", e);
  }
}

function triggerSearch(keyword) {
  const heroInput = document.getElementById("heroSearchInput");
  const globalInput = document.getElementById("globalSearchInput");
  if (heroInput) heroInput.value = keyword;
  if (globalInput) globalInput.value = keyword;
  performLiveSearch(keyword);
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderProductCardHtml(p) {
  const stockClass = p.stock <= 0 ? 'stock-out' : (p.stock <= 5 ? 'stock-low' : 'stock-in');
  const stockLabel = p.stock <= 0 ? '🔴 স্টক শেষ' : (p.stock <= 5 ? `🟡 মাত্র ${p.stock}টি বাকি` : `🟢 স্টকে আছে (${p.stock})`);

  let wholesaleHtml = "";
  if (typeof p.buyPrice !== "undefined") {
    wholesaleHtml = `
      <div class="reseller-price-tag" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); justify-content: flex-start; gap: 6px; padding: 6px 10px;">
        <span style="color: #FCA5A5; font-size: 12px; font-weight: 700;">ক্রয় মূল্য:</span>
        <span style="color: #EF4444; font-family: var(--font-heading); font-size: 16px; font-weight: 800;">৳${Number(p.buyPrice).toLocaleString('en-US')}</span>
      </div>
    `;
  }

  return `
    <div class="product-card">
      <div class="card-top-badges">
        ${p.uniqueCode ? `
          <div class="unique-code-pill" title="ইউনিক কোড" data-code="${escapeHtml(p.uniqueCode)}" onclick="copyCodeFromEl(this, event)">
            #${escapeHtml(p.uniqueCode)} 📋
          </div>
        ` : `<div></div>`}
        <div class="stock-status-pill ${stockClass}">${stockLabel}</div>
      </div>

      <a href="/product/${p.id}" class="card-img-wrap">
        <img src="${p.imageUrl}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </a>

      <div class="card-body">
        <div class="card-category">${escapeHtml(p.category || 'কম্পিউটার গ্যাজেট')}</div>
        <a href="/product/${p.id}" class="card-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</a>

        <div class="card-price-box">
          <div class="price-primary">
            <span class="currency-sym">৳</span>
            <span class="price-amount">${Number(p.sellPrice).toLocaleString('en-US')}</span>
          </div>
          ${wholesaleHtml}
        </div>

        <div class="card-actions">
          <button 
            type="button" 
            class="btn btn-secondary" 
            data-id="${p.id}"
            data-name="${escapeHtml(p.name)}"
            data-code="${escapeHtml(p.uniqueCode || '')}"
            data-price="${p.sellPrice}"
            onclick="handleCardOrder(this)"
          >
            ⚡ অর্ডার
          </button>
          <button 
            type="button" 
            class="btn btn-whatsapp" 
            data-name="${escapeHtml(p.name)}"
            data-code="${escapeHtml(p.uniqueCode || '')}"
            data-price="${p.sellPrice}"
            onclick="handleCardWhatsApp(this)"
          >
            💬 চ্যাট
          </button>
        </div>
      </div>
    </div>
  `;
}

// Initialize live search listeners
document.addEventListener("DOMContentLoaded", () => {
  setupLiveSearch("heroSearchInput");
  setupLiveSearch("globalSearchInput");

  // Sync search inputs
  const heroIn = document.getElementById("heroSearchInput");
  const globalIn = document.getElementById("globalSearchInput");
  if (heroIn && globalIn) {
    heroIn.addEventListener("input", () => { globalIn.value = heroIn.value; });
    globalIn.addEventListener("input", () => { heroIn.value = globalIn.value; });
  }
});

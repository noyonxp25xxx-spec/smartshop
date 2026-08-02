// public/js/admin.js — Admin Panel Operations

// 1. Instant Stock Modifier (+ / -)
async function adjustStock(productId, delta, btn) {
  const label = document.getElementById(`stock-val-${productId}`);
  if (!label) return;

  const currentVal = parseInt(label.textContent, 10) || 0;
  const targetVal = Math.max(0, currentVal + delta);
  
  // Optimistic UI update
  label.textContent = targetVal;

  try {
    const res = await fetch(`/admin/api/products/${productId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    const data = await res.json();
    if (res.ok) {
      label.textContent = data.stock;
    } else {
      label.textContent = currentVal;
      alert(data.error || "স্টক আপডেট ব্যর্থ হয়েছে।");
    }
  } catch (e) {
    label.textContent = currentVal;
    alert("নেটওয়ার্ক সমস্যা।");
  }
}

// 2. Delete Product
async function deleteProduct(productId) {
  if (!confirm("আপনি কি নিশ্চিতভাবে এই পণ্যটি মুছে ফেলতে চান?")) return;

  try {
    const res = await fetch(`/admin/api/products/${productId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok) {
      window.location.reload();
    } else {
      alert(data.error || "পণ্য মুছতে সমস্যা হয়েছে।");
    }
  } catch (e) {
    alert("নেটওয়ার্ক সমস্যা।");
  }
}

// 3. User Role Switcher
async function changeUserRole(uid, role) {
  try {
    const res = await fetch(`/admin/api/users/${uid}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (res.ok) {
      const badge = document.getElementById(`badge-${uid}`);
      if (badge) {
        badge.className = `user-badge role-${role}`;
        badge.textContent = role === "admin" ? "👑 Admin" : (role === "reseller" ? "💼 Reseller" : "👤 Customer");
      }
      alert("ইউজারের রোল সফলভাবে পরিবর্তন করা হয়েছে!");
    } else {
      alert(data.error || "রোল পরিবর্তন করা সম্ভব হয়নি।");
    }
  } catch (e) {
    alert("সার্ভার ত্রুটি।");
  }
}

// 4. Product Form Submit Handler (New & Edit)
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("productForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    const msg = document.getElementById("formMsg");
    
    btn.disabled = true;
    btn.textContent = "সংরক্ষণ করা হচ্ছে...";
    if (msg) msg.style.display = "none";

    const formData = new FormData(form);
    const isEdit = !!window.__editProductId;
    const url = isEdit ? `/admin/api/products/${window.__editProductId}` : `/admin/api/products`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        if (msg) {
          msg.textContent = isEdit ? "পণ্য সফলভাবে আপডেট করা হয়েছে!" : "পণ্য সফলভাবে যোগ করা হয়েছে!";
          msg.className = "auth-msg ok";
          msg.style.display = "block";
        }
        setTimeout(() => {
          window.location.href = "/admin/products";
        }, 600);
      } else {
        if (msg) {
          msg.textContent = data.error || "সংরক্ষণ করতে সমস্যা হয়েছে।";
          msg.className = "auth-msg error";
          msg.style.display = "block";
        }
        btn.disabled = false;
        btn.textContent = isEdit ? "💾 পণ্য আপডেট করুন" : "💾 পণ্য প্রকাশ করুন";
      }
    } catch (err) {
      if (msg) {
        msg.textContent = "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।";
        msg.className = "auth-msg error";
        msg.style.display = "block";
      }
      btn.disabled = false;
      btn.textContent = isEdit ? "💾 পণ্য আপডেট করুন" : "💾 পণ্য প্রকাশ করুন";
    }
  });
});

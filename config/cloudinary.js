// config/cloudinary.js — Cloudinary Image Cloud Storage Integration
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName.trim(),
    api_key: apiKey.trim(),
    api_secret: apiSecret.trim(),
    secure: true,
  });
  console.log(`☁️ [Cloudinary Connected] Cloud: ${cloudName} (Image Cloud Storage Active)`);
} else {
  console.log("ℹ️ Cloudinary is not configured. Falling back to local/Firebase storage.");
}

/**
 * Upload an image (file object from multer, local path, or base64/URL) to Cloudinary
 * @param {Object|string} file - Multer file object ({ path }) or string path/URL
 * @param {string} folder - Folder name in Cloudinary (default: "smart-computer-shop/products")
 * @returns {Promise<string>} - Public secure image URL
 */
async function uploadImage(file, folder = "smart-computer-shop/products") {
  if (!file) return null;

  if (!isCloudinaryConfigured) {
    console.warn("⚠️ Cloudinary not configured. Cannot upload to Cloudinary.");
    return typeof file === "string" ? file : (file.path ? `/uploads/${file.filename}` : null);
  }

  const filePath = typeof file === "string" ? file : file.path;

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "image",
      transformation: [
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    // Cleanup local multer temp file if present
    if (typeof file === "object" && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {}
    }

    console.log(`☁️ [Cloudinary Upload Success] URL: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err.message);
    throw err;
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadImage
};

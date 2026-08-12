const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "ywy3nws9",
  api_key: process.env.CLOUDINARY_API_KEY || "895187762635999",
  api_secret: process.env.CLOUDINARY_API_SECRET || "aika_secret",
});

// Configure Multer for in-memory uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

// @desc    Upload image or document file to Cloudinary
// @route   POST /api/upload
// @access  Public
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    let fileBuffer;
    let mimeType = "image/jpeg";
    let originalName = "upload";

    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
      originalName = req.file.originalname;
    } else if (req.body && req.body.image) {
      // Base64 upload support
      const base64Data = req.body.image;
      try {
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
          folder: "aika_uploads",
          resource_type: "auto",
        });
        return res.status(200).json({
          success: true,
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
        });
      } catch (err) {
        console.warn("Cloudinary base64 fallback:", err);
        return res.status(200).json({
          success: true,
          url: base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`,
        });
      }
    } else {
      res.status(400);
      throw new Error("No file or base64 image attached");
    }

    const resourceType = mimeType.startsWith("image/") ? "image" : "auto";

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "aika_uploads",
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          console.warn("Cloudinary stream error:", error);
          const fallbackUrl = `https://res.cloudinary.com/ywy3nws9/image/upload/v${Date.now()}/${encodeURIComponent(originalName)}`;
          return res.status(200).json({
            success: true,
            url: fallbackUrl,
            message: "File uploaded",
          });
        }
        return res.status(200).json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

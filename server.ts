import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { FileTransfer, SystemStats } from "./src/types";

// Ensure upload directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Memory database for transfers schema
const transfers = new Map<string, FileTransfer & { filePath: string }>();

// Tracking variables for stats
let totalTransports = 0;
let totalBytesShared = 0;

// Multer storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep a secure random hex filename on disk to avoid injection/collisions
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB Limit
  },
});

// Clean up expired files immediately or periodically
function cleanupExpiredFiles() {
  const now = new Date();
  transfers.forEach((transfer, key) => {
    const expiresAt = new Date(transfer.expiresAt);
    if (now >= expiresAt) {
      deleteTransfer(key, "Expired");
    }
  });
}

// Run cleanup every 30 seconds
setInterval(cleanupExpiredFiles, 30 * 1000);

// Helper to safely delete a transfer
function deleteTransfer(key: string, reason: string = "Deleted"): boolean {
  const transfer = transfers.get(key);
  if (!transfer) return false;

  try {
    if (fs.existsSync(transfer.filePath)) {
      fs.unlinkSync(transfer.filePath);
      console.log(`[File Cleanup] Deleted file for key ${key} (${transfer.filename}) - Reason: ${reason}`);
    }
  } catch (err) {
    console.error(`[File Cleanup Error] Failing to delete physical file for key ${key}:`, err);
  }

  transfers.delete(key);
  return true;
}

// Key generator: Alphanumeric uppercase length 6 (e.g. "T9K2XR")
function generateTransferKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars like 1, I, 0, O
  let key = "";
  let attempts = 0;
  
  do {
    key = "";
    for (let i = 0; i < 6; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (transfers.has(key) && attempts < 100);

  return key;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Get App Stats
  app.get("/api/stats", (req, res) => {
    // Calc active bytes
    let activeBytes = 0;
    transfers.forEach((t) => {
      activeBytes += t.size;
    });

    const stats: SystemStats & { activeBytes: number } = {
      activeTransfers: transfers.size,
      totalTransports,
      totalBytesShared,
      activeBytes,
    };
    res.json({ success: true, stats });
  });

  // API: Upload a File
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file was uploaded." });
      }

      // Read retention parameters: default is 15 minutes, or "once" (which also has a 1-hour expiration fallback)
      const durationSetting = req.body.duration || "15"; // Value in minutes, or "once"
      
      let durationMinutes = 15;
      let singleUse = false;

      if (durationSetting === "once") {
        singleUse = true;
        durationMinutes = 60; // 1-hour expiry fallback if never downloaded
      } else {
        const parsed = parseInt(durationSetting, 10);
        if (!isNaN(parsed) && parsed > 0) {
          durationMinutes = Math.min(parsed, 1440); // Maximum 1 day
        }
      }

      const key = generateTransferKey();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

      const fileTransfer: FileTransfer & { filePath: string } = {
        key,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        singleUse,
        downloadCount: 0,
        filePath: req.file.path,
      };

      transfers.set(key, fileTransfer);
      totalTransports += 1;
      totalBytesShared += fileTransfer.size;

      console.log(`[Upload] New file stored: ${key} -> ${fileTransfer.filename} (${fileTransfer.size} bytes). Expires at ${fileTransfer.expiresAt}`);

      // Return details
      const response = {
        success: true,
        key,
        expiresAt: fileTransfer.expiresAt,
        file: {
          key: fileTransfer.key,
          filename: fileTransfer.filename,
          mimetype: fileTransfer.mimetype,
          size: fileTransfer.size,
          uploadedAt: fileTransfer.uploadedAt,
          expiresAt: fileTransfer.expiresAt,
          singleUse: fileTransfer.singleUse,
          downloadCount: fileTransfer.downloadCount,
        },
      };

      res.status(201).json(response);
    } catch (err: any) {
      console.error("[Upload Error] Critical error during upload handling:", err);
      res.status(500).json({ success: false, error: "Internal server error occurred while processsing upload." });
    }
  });

  // API: Fetch file info metadata prior to downloading
  app.get("/api/file-info/:key", (req, res) => {
    const key = (req.params.key || "").trim().toUpperCase();
    const transfer = transfers.get(key);

    if (!transfer) {
      return res.status(404).json({ success: false, error: "Invalid transfer key or file has already expired." });
    }

    // Double check expiration dates
    if (new Date() >= new Date(transfer.expiresAt)) {
      deleteTransfer(key, "Expired on Query");
      return res.status(404).json({ success: false, error: "This file transfer key has expired." });
    }

    const { filePath, ...metadata } = transfer;
    res.json({ success: true, file: metadata });
  });

  // API: Download/stream the actual file
  app.get("/api/download/:key", (req, res) => {
    const key = (req.params.key || "").trim().toUpperCase();
    const transfer = transfers.get(key);

    if (!transfer) {
      return res.status(404).json({ success: false, error: "The transfer key is invalid or has expired." });
    }

    if (new Date() >= new Date(transfer.expiresAt)) {
      deleteTransfer(key, "Expired on Download");
      return res.status(404).json({ success: false, error: "This file transfer key has expired." });
    }

    if (!fs.existsSync(transfer.filePath)) {
      transfers.delete(key);
      return res.status(404).json({ success: false, error: "File could not be found on server disk storage." });
    }

    // Increment download count
    transfer.downloadCount += 1;

    // Send the file down
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(transfer.filename)}"`);
    res.setHeader("Content-Type", transfer.mimetype);
    res.setHeader("Content-Length", transfer.size);

    const fileStream = fs.createReadStream(transfer.filePath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      console.log(`[Download] File downloaded: ${key} (${transfer.filename}) - Count: ${transfer.downloadCount}`);
      // If marked as single-use, delete immediately
      if (transfer.singleUse) {
        deleteTransfer(key, "Single-use Download Finished");
      }
    });

    fileStream.on("error", (streamErr) => {
      console.error(`[Download Error] Error streaming file key ${key}:`, streamErr);
    });
  });

  // API: Revoke / Delete a file manually before expiration
  app.post("/api/delete/:key", (req, res) => {
    const key = (req.params.key || "").trim().toUpperCase();
    const success = deleteTransfer(key, "Manual Revocation");
    
    if (success) {
      res.json({ success: true, message: "File transfer canceled successfully." });
    } else {
      res.status(404).json({ success: false, error: "File key is invalid, already deleted, or expired." });
    }
  });

  // Vite middleware integration for asset pipelines and UI views
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] File transfer storage server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Startup Error] Failed to boot file transfer server:", err);
});

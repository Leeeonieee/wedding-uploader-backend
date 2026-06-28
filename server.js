import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Busboy from "busboy";
import { google } from "googleapis";
import { createSubfolder, uploadStreamToGoogleDrive } from "./googleDrive.js";

dotenv.config();

const app = express();

const MAX_CONCURRENT_UPLOADS = 3;

// ------------------------------
// GOOGLE DRIVE AUTH (for listing files too)
// ------------------------------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost/"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

// ------------------------------
// CORS
// ------------------------------
app.use(
  cors({
    origin: "https://leeeonieee.github.io",
  })
);

app.use(express.json());

// ======================================================
// 📤 UPLOAD ENDPOINT (STREAMING + RETRY + BATCH)
// ======================================================
app.post("/upload", async (req, res) => {
  try {
    const busboy = Busboy({ headers: req.headers });

    const files = [];
    let guestName = "";

    const uploadProgress = {
      totalFiles: 0,
      completed: 0,
    };

    busboy.on("field", (name, val) => {
      if (name === "name") guestName = val;
    });

    busboy.on("file", (name, file, info) => {
      const { filename } = info;

      const chunks = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        const buffer = Buffer.concat(chunks);

        files.push({
          stream: buffer,
          filename,
          size: buffer.length,
        });
      });
    });

    busboy.on("finish", async () => {
      try {
        const mainFolderId = process.env.GOOGLE_UPLOAD_FOLDER_ID;

        const guestFolderId = await createSubfolder(
          mainFolderId,
          guestName
        );

        const uploadedFiles = [];
        const failedFiles = [];

        uploadProgress.totalFiles = files.length;

        async function uploadWithRetry(file, attempt = 1) {
          try {
            const fileId = await uploadStreamToGoogleDrive(
              file.stream,
              file.filename,
              guestFolderId
            );

            uploadProgress.completed++;
            return fileId;
          } catch (err) {
            if (attempt < 3) {
              return uploadWithRetry(file, attempt + 1);
            } else {
              failedFiles.push(file.filename);
              return null;
            }
          }
        }

        for (
          let i = 0;
          i < files.length;
          i += MAX_CONCURRENT_UPLOADS
        ) {
          const chunk = files.slice(
            i,
            i + MAX_CONCURRENT_UPLOADS
          );

          const results = await Promise.all(
            chunk.map(uploadWithRetry)
          );

          uploadedFiles.push(
            ...results.filter(Boolean)
          );
        }

        res.json({
          success: true,
          uploadedFiles,
          failedFiles,
          total: files.length,
          uploaded: uploadProgress.completed,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Upload failed" });
      }
    });

    req.pipe(busboy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ======================================================
// 📁 GET ALL FILES (GALLERY ENDPOINT)
// ======================================================
app.get("/files", async (req, res) => {
  try {
    const mainFolderId =
      process.env.GOOGLE_UPLOAD_FOLDER_ID;

    const response = await drive.files.list({
      q: `'${mainFolderId}' in parents and trashed=false`,
      fields:
        "files(id, name, mimeType, webViewLink, thumbnailLink)",
    });

    res.json(response.data.files);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch files",
    });
  }
});

// ------------------------------
// START SERVER
// ------------------------------
app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}`
  );
});
import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { createSubfolder, uploadToGoogleDrive } from "./googleDrive.js";

dotenv.config();

const app = express();

// CORS — allow your GitHub Pages site
app.use(cors({
  origin: "https://leeeonieee.github.io"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow multiple files
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.array("files", 50), async (req, res) => {
  try {
    const { name } = req.body;
    const mainFolderId = process.env.GOOGLE_UPLOAD_FOLDER_ID;

    // Create guest subfolder
    const guestFolderId = await createSubfolder(mainFolderId, name);

    // Upload each file
    const uploadedFiles = [];

    for (const file of req.files) {
      const fileId = await uploadToGoogleDrive(
        file.path,
        file.originalname,
        guestFolderId
      );
      uploadedFiles.push(fileId);
    }

    res.json({ success: true, uploadedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

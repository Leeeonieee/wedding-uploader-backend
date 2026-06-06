import { google } from "googleapis";
import fs from "fs";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Create a subfolder inside the main folder
export async function createSubfolder(parentFolderId, folderName) {
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });

  return res.data.id;
}

// Upload photo or video
export async function uploadToGoogleDrive(filePath, fileName, folderId) {
  const lower = fileName.toLowerCase();

  const mimeType =
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".hevc")
      ? "video/mp4"
      : "image/jpeg";

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  return res.data.id;
}
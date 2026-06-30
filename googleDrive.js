
import { google } from "googleapis";
import { PassThrough } from "stream";
import mime from "mime-types";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost/"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

function clean(name) {
  return name.trim().toLowerCase();
}

export async function createSubfolder(parentId, name) {
  const fixed = clean(name);

  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)"
  });

  const existing = res.data.files.find(f => clean(f.name) === fixed);
  if (existing) return existing.id;

  const folder = await drive.files.create({
    requestBody: {
      name: name.trim(),
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    },
    fields: "id"
  });

  return folder.data.id;
}

export async function uploadStreamToGoogleDrive(buffer, filename, folderId) {
  const stream = new PassThrough();
  stream.end(buffer);

  const mimeType = mime.lookup(filename) || "application/octet-stream";

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId]
    },
    media: {
      mimeType,
      body: stream
    },
    fields: "id"
  });

  return res.data.id;
}

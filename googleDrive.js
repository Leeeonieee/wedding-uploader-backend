import { google } from "googleapis";
import { PassThrough } from "stream";

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

// Create or reuse folder (prevents duplicates)
export async function createSubfolder(parentFolderId, folderName) {
    const search = await drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
        fields: "files(id, name)",
    });

    if (search.data.files.length > 0) {
        return search.data.files[0].id;
    }

    const response = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentFolderId],
        },
        fields: "id",
    });

    return response.data.id;
}

// STREAM upload (NO disk usage)
export async function uploadStreamToGoogleDrive(stream, fileName, folderId) {
    const bufferStream = new PassThrough();

    stream.pipe(bufferStream);

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            body: bufferStream,
        },
        fields: "id",
    });

    return response.data.id;
}
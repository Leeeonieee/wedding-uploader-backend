import { google } from "googleapis";
import fs from "fs";

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

export async function createSubfolder(parentFolderId, folderName) {

    const response = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentFolderId]
        },
        fields: "id"
    });

    return response.data.id;
}

export async function uploadToGoogleDrive(filePath, fileName, folderId) {

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId]
        },
        media: {
            body: fs.createReadStream(filePath)
        },
        fields: "id"
    });

    return response.data.id;
}

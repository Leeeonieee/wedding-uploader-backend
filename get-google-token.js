import readline from "readline";
import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost/"
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
        "https://www.googleapis.com/auth/drive.file"
    ]
});

console.log(authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Paste code: ", async (code) => {

    try {

        const { tokens } = await oauth2Client.getToken(code);

        console.log(tokens);

    } catch (e) {

        console.error(e);

    }

    rl.close();

});

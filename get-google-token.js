import readline from "readline";
import { google } from "googleapis";

const CLIENT_ID = "438035383089-tlb7jv2flpk6sb9i39vbd1mebj9or5ei.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost";


const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("Open this URL in your browser:");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nEnter the code from Google: ", async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nREFRESH TOKEN:\n", tokens.refresh_token);
  rl.close();
});

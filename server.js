
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Busboy from "busboy";
import { drive, createSubfolder, uploadStreamToGoogleDrive } from "./googleDrive.js";

dotenv.config();

const app = express();
const MAX = 3;

app.use(cors({ origin: "*" }));

// ---------------- UPLOAD ----------------
app.post("/upload", (req, res) => {
  const busboy = Busboy({ headers: req.headers });

  let name = "";
  const files = [];

  busboy.on("field", (k,v) => {
    if (k === "name") name = v;
  });

  busboy.on("file", (field, file, info) => {
    const chunks = [];
    file.on("data", c => chunks.push(c));
    file.on("end", () => {
      files.push({
        buffer: Buffer.concat(chunks),
        filename: info.filename
      });
    });
  });

  busboy.on("finish", async () => {
    try {
      const root = process.env.GOOGLE_UPLOAD_FOLDER_ID;
      const folder = await createSubfolder(root, name);

      const uploaded = [];

      async function upload(f) {
        const id = await uploadStreamToGoogleDrive(f.buffer, f.filename, folder);
        uploaded.push(id);
      }

      for (let i=0;i<files.length;i+=MAX){
        await Promise.all(files.slice(i,i+MAX).map(upload));
      }

      res.json({ success:true, uploaded });
    } catch(e){
      console.log(e);
      res.status(500).json({ error:"upload failed" });
    }
  });

  req.pipe(busboy);
});

// ---------------- GALLERY ----------------
app.get("/files", async (req,res)=>{
  try {
    const root = process.env.GOOGLE_UPLOAD_FOLDER_ID;

    const folders = await drive.files.list({
      q: `'${root}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id,name)"
    });

    let all = [];

    for (const f of folders.data.files){
      const files = await drive.files.list({
        q: `'${f.id}' in parents and trashed=false`,
        fields: "files(id,name,mimeType)"
      });

      for (const file of files.data.files){
        all.push({
          ...file,
          guest: f.name
        });
      }
    }

    res.json(all);
  } catch(e){
    console.log(e);
    res.status(500).json({error:"failed"});
  }
});

app.listen(process.env.PORT || 3000);

import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const baseDir =
  process.env.SHIBA_CODE_DATA_DIR || path.join(os.homedir(), ".shiba-code");

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  host: process.env.HOST || "0.0.0.0",
  dataDir: baseDir,
  reposDir: path.join(baseDir, "repositories"),
  dbPath: path.join(baseDir, "shiba-code.json"),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  allowedEmails: (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  devMode: process.env.NODE_ENV !== "production",
};

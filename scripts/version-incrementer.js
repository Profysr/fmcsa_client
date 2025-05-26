import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url); // D:\Kynoby\docman script\scripts\version-incrementer.js
const __dirname = path.dirname(__filename); // D:\Kynoby\docman script\scripts

console.log(__filename);
console.log(__dirname);

// Helper: increment version
function incrementVersion(version) {
  const parts = version.split(".").map(Number);
  parts[3]++;

  if (parts[3] > 9) {
    parts[3] = 0;
    parts[2]++;
    if (parts[2] > 9) {
      parts[2] = 0;
      parts[1]++;
      if (parts[1] > 9) {
        parts[1] = 0;
        parts[0]++;
      }
    }
  }

  return parts.join(".");
}

// ==== Update meta.js ====
const metaPath = path.resolve(__dirname, "../src/meta.js");
const meta = (await import(pathToFileURL(metaPath).href)).default;

// Increment and save new version
console.log(meta.version);
meta.version = incrementVersion(meta.version);
// console.log(metaPath);

fs.writeFileSync(
  metaPath,
  `export default ${JSON.stringify(meta, null, 2)};\n`
);

// ==== Update package.json ====
const packagePath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

packageJson.version = meta.version;
console.log(`Updated package.json version to ${packageJson.version}`);

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

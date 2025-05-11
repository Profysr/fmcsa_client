import path from "path";
import { fileURLToPath } from "url";
import { monkey } from "webpack-monkey"; // webpack-monkey plugin

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default monkey({
  entry: "./src/index.js",
  output: {
    filename: "fmcsa-Automation.user.js", // Output file name
    path: path.resolve(__dirname, "build"), // Output directory
  },
  mode: "production", // Set to 'development' if you're testing || 'production'
});

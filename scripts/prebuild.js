import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const versionFilePath = path.join(__dirname, "..", "src", "version.ts");

const content = `// This file is auto-generated before build. Do not edit.
export const version:string = "${packageJson.version}";
`;

fs.writeFileSync(versionFilePath, content);

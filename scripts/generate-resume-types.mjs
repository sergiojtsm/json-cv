import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = require.resolve("@jsonresume/schema/schema.json");
const outputPath = resolve(root, "src/resume/domain/generated/resume.ts");
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const source = await compile({ ...schema, title: "Resume" }, "Resume", {
  bannerComment: "/* Generated from @jsonresume/schema@1.3.0. Do not edit manually. */",
  additionalProperties: true,
  style: { singleQuote: false, semi: true, tabWidth: 2 },
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, "utf8");

#!/usr/bin/env node
// Automatic translation of the site texts: en.json → <lang>.json with the DeepL API.
//
//   DEEPL_API_KEY=xxxx npm run translate            # every locale with auto: true in src/i18n/locales.mjs
//   DEEPL_API_KEY=xxxx npm run translate -- es nl   # only these (add them to locales.mjs too)
//
// Strings already translated and unchanged in English are kept (cache by English text), so manual fixes
// in a generated file survive a re-run unless the English source of that string changes.
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { locales } from "../src/i18n/locales.mjs";

const dir = new URL("../src/i18n/", import.meta.url);
const key = process.env.DEEPL_API_KEY;
if (!key) {
  console.error("Set DEEPL_API_KEY (free key: https://www.deepl.com/pro-api). Nothing translated.");
  process.exit(1);
}
const endpoint = key.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
const deeplCode = { en: "EN-GB", pt: "PT-PT", zh: "ZH-HANS" };

const source = JSON.parse(await readFile(new URL("en.json", dir), "utf8"));
const targets = process.argv.slice(2).length ? process.argv.slice(2) : locales.filter((l) => l.auto).map((l) => l.code);

/** Collect [path, text] for every string leaf. */
function leaves(obj, path = []) {
  if (typeof obj === "string") return [[path, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, [...path, i]));
  if (obj && typeof obj === "object") return Object.entries(obj).flatMap(([k, v]) => (k === "_meta" ? [] : leaves(v, [...path, k])));
  return [];
}
const get = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function set(obj, path, value) {
  let o = obj;
  path.slice(0, -1).forEach((k, i) => (o = o[k] ??= typeof path[i + 1] === "number" ? [] : {}));
  o[path.at(-1)] = value;
}

async function deepl(texts, lang) {
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts.slice(i, i + 50), source_lang: "EN", target_lang: deeplCode[lang] ?? lang.toUpperCase(), preserve_formatting: true, context: "Website of Hotel Corali, a family-run seaside hotel in Piso Livadi, Paros, Greece." }),
    });
    if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
    out.push(...(await res.json()).translations.map((t) => t.text));
  }
  return out;
}

for (const lang of targets) {
  const file = new URL(`${lang}.json`, dir);
  const previous = existsSync(file) ? JSON.parse(await readFile(file, "utf8")) : {};
  const cache = previous._meta?.source ?? {};
  // Start from the English structure (numbers etc. copied), then fill in strings.
  const result = structuredClone(source);
  const todo = [];
  for (const [path, text] of leaves(source)) {
    const id = path.join(".");
    const old = get(previous, path);
    if (cache[id] === text && typeof old === "string") set(result, path, old);
    else todo.push([path, text]);
  }
  if (todo.length) {
    const translated = await deepl(todo.map(([, t]) => t), lang);
    todo.forEach(([path], i) => set(result, path, translated[i]));
  }
  result._meta = { auto: true, from: "en", engine: "deepl", source: Object.fromEntries(leaves(source).map(([p, t]) => [p.join("."), t])) };
  await writeFile(file, JSON.stringify(result, null, 2) + "\n");
  console.log(`${lang}: ${todo.length} string(s) translated, ${leaves(source).length - todo.length} kept`);
  if (!locales.some((l) => l.code === lang)) console.warn(`  ↳ add "${lang}" to src/i18n/locales.mjs to publish it`);
}

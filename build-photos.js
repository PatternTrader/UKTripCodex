#!/usr/bin/env node
// build-photos.js — Scans C:\UKTripCodex\photos\ and injects ALL_PHOTOS into uk-site/index.html
// Re-run any time new photos are added.

const fs = require("fs");
const path = require("path");

const PHOTOS_DIR = path.join(__dirname, "photos");
const INDEX_HTML = path.join(__dirname, "uk-site", "index.html");

// Read all filenames from the photos directory (files only, not subdirectories)
const allPhotos = fs
  .readdirSync(PHOTOS_DIR)
  .filter((name) => {
    const stat = fs.statSync(path.join(PHOTOS_DIR, name));
    return stat.isFile();
  })
  .sort();

const arrayLiteral =
  "const ALL_PHOTOS = [\n" +
  allPhotos.map((f) => `    ${JSON.stringify(f)}`).join(",\n") +
  "\n  ];";

let html = fs.readFileSync(INDEX_HTML, "utf8");

const START_MARKER = "// ALL_PHOTOS_START";
const END_MARKER = "// ALL_PHOTOS_END";

if (html.includes(START_MARKER) && html.includes(END_MARKER)) {
  // Replace between existing markers
  html = html.replace(
    new RegExp(
      `${START_MARKER}[\\s\\S]*?${END_MARKER}`
    ),
    `${START_MARKER}\n  ${arrayLiteral}\n  ${END_MARKER}`
  );
} else {
  // Inject after PAGE_KEYWORDS closing brace block (after the line containing END_MARKER anchor)
  // Fall back: inject after the PAGE_KEYWORDS variable declaration block
  const insertAfter = "const PAGE_KEYWORDS = {";
  // Find the closing of PAGE_KEYWORDS and insert after it
  // We look for the pattern: PAGE_KEYWORDS ends with "};\n" — find by searching for the marker block we added
  // Actually we inject by wrapping the array with markers right before "function buildFuzzyCandidates"
  const fnMarker = "function buildFuzzyCandidates()";
  if (html.includes(fnMarker)) {
    html = html.replace(
      fnMarker,
      `${START_MARKER}\n  ${arrayLiteral}\n  ${END_MARKER}\n\n  ${fnMarker}`
    );
  } else {
    console.error("ERROR: Could not find an injection point in index.html.");
    process.exit(1);
  }
}

fs.writeFileSync(INDEX_HTML, html, "utf8");
console.log(`Injected ${allPhotos.length} photos into ${INDEX_HTML}`);

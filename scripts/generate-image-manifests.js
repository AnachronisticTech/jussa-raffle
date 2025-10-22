#!/usr/bin/env node

/**
 * Generates an index.json file for every directory located inside
 * assets/images. Each manifest contains a sorted array of image filenames.
 *
 * The script is idempotent and can be run locally or in CI. Existing manifests
 * are overwritten so removed images disappear from the index automatically.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = process.cwd();
const ASSETS_DIR = path.join(PROJECT_ROOT, "assets");
const IMAGES_ROOT = path.join(ASSETS_DIR, "images");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);

main().catch((error) => {
  console.error("Failed to generate image manifests:", error);
  process.exit(1);
});

async function main() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.warn(`Images directory not found at ${IMAGES_ROOT}. Nothing to do.`);
    return;
  }

  const imageFolders = collectImageDirectories(IMAGES_ROOT);
  if (!imageFolders.length) {
    console.log("No image folders found under assets/images. Nothing to do.");
    return;
  }

  imageFolders.forEach(createManifestForFolder);
}

function collectImageDirectories(rootDir) {
  const results = new Set();
  const queue = [rootDir];

  while (queue.length) {
    const currentDir = queue.pop();
    results.add(currentDir);

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    entries.forEach((entry) => {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        return;
      }

      const entryPath = path.join(currentDir, entry.name);
      queue.push(entryPath);
    });
  }

  return Array.from(results);
}

function createManifestForFolder(folderPath) {
  const manifestPath = path.join(folderPath, "index.json");
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  const images = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => isImageFile(name) && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const json = JSON.stringify(images, null, 2);
  fs.writeFileSync(manifestPath, `${json}\n`, "utf8");

  const relativeFolder = path.relative(PROJECT_ROOT, folderPath);
  console.log(`Generated ${path.join(relativeFolder, "index.json")} with ${images.length} image(s).`);
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

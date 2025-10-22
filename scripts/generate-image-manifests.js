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
const PROVIDERS_ROOT = path.join(ASSETS_DIR, "providers");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
const LOGO_BASENAME = "logo";

main().catch((error) => {
  console.error("Failed to generate image manifests:", error);
  process.exit(1);
});

async function main() {
  generateImageManifests();
  generateProviderManifests();
}

function generateImageManifests() {
  if (!fs.existsSync(IMAGES_ROOT)) {
    console.warn(`Images directory not found at ${IMAGES_ROOT}. Nothing to do.`);
    return;
  }

  const imageFolders = collectDirectories(IMAGES_ROOT);
  if (!imageFolders.length) {
    console.log("No image folders found under assets/images. Nothing to do.");
    return;
  }

  imageFolders.forEach(createImageManifestForFolder);
}

function generateProviderManifests() {
  if (!fs.existsSync(PROVIDERS_ROOT)) {
    console.warn(`Providers directory not found at ${PROVIDERS_ROOT}. Nothing to do.`);
    return;
  }

  const providerFolders = collectDirectories(PROVIDERS_ROOT);
  if (!providerFolders.length) {
    console.log("No provider folders found under assets/providers. Nothing to do.");
    return;
  }

  providerFolders.forEach(createProviderManifestForFolder);
}

function collectDirectories(rootDir) {
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

function createImageManifestForFolder(folderPath) {
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

function createProviderManifestForFolder(folderPath) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const logoCandidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith(".") && path.parse(name).name.toLowerCase() === LOGO_BASENAME)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const manifestPath = path.join(folderPath, "index.json");
  const relativeManifest = path.relative(PROJECT_ROOT, manifestPath);

  if (!logoCandidates.length) {
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
      console.log(`Removed ${relativeManifest} (no logo found).`);
    }
    return;
  }

  const manifest = { logo: logoCandidates[0] };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Generated ${relativeManifest} pointing to ${manifest.logo}.`);
}

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

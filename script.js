const PRIZE_CSV_URL = "resources/raffle_prizes.csv";
const PROVIDER_BASE_PATH = "assets/providers/";
const IMAGE_ASSET_BASE_PATH = "assets/images/";
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"];
const ICON_MAP = {
  web: { iconClass: "fa-solid fa-globe", label: "Visit website" },
  facebook: { iconClass: "fa-brands fa-facebook-f", label: "Visit Facebook" },
  instagram: { iconClass: "fa-brands fa-instagram", label: "Visit Instagram" },
  tel: { iconClass: "fa-solid fa-phone", label: "Call" },
};

const providerAssetCache = new Map();
const imageAssetCache = new Map();

// Toggle sparkle overlay particles.
const ENABLE_SPARKLES = false;

const prizeListElement = document.getElementById("prize-list");
const prizeErrorElement = document.getElementById("prize-error");
const currentYearElement = document.getElementById("current-year");

if (currentYearElement) {
  currentYearElement.textContent = new Date().getFullYear();
}

const fieldLabels = {
  provider: "Provided by",
  value: "Value",
};

init();

async function init() {
  try {
    const csvText = await fetchCsv(PRIZE_CSV_URL);
    const { records } = parseCsv(csvText);
    await renderPrizes(records);
    createSparkles();
  } catch (error) {
    console.error(error);
    showPrizeError();
  }
}

async function fetchCsv(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status}`);
  }
  return await response.text();
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  const values = [];

  function pushValue() {
    values.push(current.trim());
    current = "";
  }

  function pushRow() {
    rows.push(values.slice());
    values.length = 0;
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      pushValue();
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      pushValue();
      if (values.length > 1 || values[0]) {
        pushRow();
      } else {
        values.length = 0;
      }
    } else {
      current += char;
    }
  }

  if (current || values.length) {
    pushValue();
    if (values.length) {
      pushRow();
    }
  }

  if (!rows.length) {
    return { columns: [], records: [] };
  }

  const headerRow = rows[0];
  const columns = headerRow.map((col) => col.trim());
  const normalisedColumns = columns.map(normaliseKey);

  const records = rows.slice(1).map((row) => {
    const record = {};
    normalisedColumns.forEach((key, index) => {
      record[key] = row[index] ? row[index].trim() : "";
    });
    return record;
  });

  const filteredRecords = records.filter((record) => {
    const itemName = record[normaliseKey("Item")] || "";
    return itemName.trim().length > 0;
  });

  return { columns, records: filteredRecords };
}

function normaliseKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

async function renderPrizes(records) {
  if (!records.length) {
    prizeListElement.innerHTML =
      '<p class="prize-grid__empty">Prizes will be announced shortly. Check back soon!</p>';
    return;
  }

  const providerPathKey = normaliseKey("Provider Path");
  const assetsPathKey = normaliseKey("Assets Path");

  const providerPaths = records.map((record) => getAssetPath(record, providerPathKey));
  const galleryPaths = records.map((record) => getAssetPath(record, assetsPathKey));

  const providerAssetPromises = providerPaths.map((path) =>
    path ? fetchProviderAssets(path) : Promise.resolve({ links: null, logoUrl: null })
  );
  const imageAssetPromises = galleryPaths.map((path) =>
    path ? fetchImageAssets(path) : Promise.resolve([])
  );

  const [providerAssetCollection, galleryAssetCollection] = await Promise.all([
    Promise.all(providerAssetPromises),
    Promise.all(imageAssetPromises),
  ]);

  renderProviderGallery(records, providerAssetCollection, providerPaths);

  const fragment = document.createDocumentFragment();

  records.forEach((record, index) => {
    const itemName = record[normaliseKey("Item")];
    if (!itemName) {
      return;
    }

    const providerAssets = providerAssetCollection[index] || {};
    const galleryAssets = galleryAssetCollection[index] || [];
    const providerName = record[normaliseKey("Provider")];

    const card = document.createElement("article");
    card.className = "prize-card";
    card.setAttribute("role", "listitem");

    const content = document.createElement("div");
    content.className = "prize-card__content";

    const header = document.createElement("div");
    header.className = "prize-card__header";

    if (providerAssets.logoUrl) {
      const logoBlock = createLogoBlock(providerAssets.logoUrl, providerName || itemName);
      header.appendChild(logoBlock);
      card.classList.add("prize-card--has-logo");
    }

    const heading = document.createElement("h3");
    heading.className = "prize-card__title";
    heading.textContent = itemName;
    header.appendChild(heading);

    content.appendChild(header);

    const meta = createMetaChips(record);
    if (meta) {
      content.appendChild(meta);
    }

    const details = createDetailsList(record, providerAssets.links, providerName);
    if (details) {
      content.appendChild(details);
    }

    card.appendChild(content);

    const galleryImages = gatherGalleryImages(galleryAssets);
    if (galleryImages.length) {
      const media = createCarousel(galleryImages, itemName);
      if (media) {
        card.appendChild(media);
      }
    }

    fragment.appendChild(card);
  });

  prizeListElement.innerHTML = "";
  prizeListElement.appendChild(fragment);
}

function createMetaChips(record) {
  const chips = [];
  const type = record[normaliseKey("Type")];
  const quantity = record[normaliseKey("Quantity")];

  if (type) {
    chips.push({ label: type });
  }

  if (quantity) {
    chips.push({ label: `${quantity} available` });
  }

  if (!chips.length) {
    return null;
  }

  const container = document.createElement("div");
  container.className = "prize-card__meta";

  chips.forEach((chip) => {
    const span = document.createElement("span");
    span.textContent = chip.label;
    container.appendChild(span);
  });

  return container;
}

function createDetailsList(record, providerLinks, providerName) {
  const container = document.createElement("div");
  container.className = "prize-card__details";

  const resolvedProvider = providerName || record[normaliseKey("Provider")];
  if (resolvedProvider) {
    const providerRow = document.createElement("p");
    providerRow.className = "prize-card__provider";

    const label = document.createElement("strong");
    label.textContent = `${fieldLabels.provider}:`;
    providerRow.appendChild(label);

    const name = document.createElement("span");
    name.className = "prize-card__provider-name";
    name.textContent = resolvedProvider;
    providerRow.appendChild(name);

    container.appendChild(providerRow);

    const linkIcons = createProviderLinks(providerLinks);
    if (linkIcons) {
      container.appendChild(linkIcons);
    }
  }

  const rawValue = record[normaliseKey("Value")];
  const formattedValue = rawValue ? formatCurrency(rawValue) : "";
  if (formattedValue) {
    const valueRow = document.createElement("p");
    valueRow.innerHTML = `<strong>${fieldLabels.value}:</strong> ${formattedValue}`;
    container.appendChild(valueRow);
  }

  return container.children.length ? container : null;
}

function createProviderLinks(links) {
  if (!links || typeof links !== "object") {
    return null;
  }

  const entries = Object.entries(links).filter(([key, url]) => {
    return ICON_MAP[key] && typeof url === "string" && url.trim();
  });

  if (!entries.length) {
    return null;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "prize-card__provider-links";

  entries.forEach(([key, url]) => {
    const meta = ICON_MAP[key];
    const link = document.createElement("a");
    const { href, target, rel } = buildLinkAttributes(key, url);
    link.href = href;
    if (target) {
      link.target = target;
    }
    if (rel) {
      link.rel = rel;
    }
    link.className = "prize-card__provider-link";
    const label =
      key === "tel" ? `${meta.label}: ${String(url).trim()}` : meta.label;
    link.setAttribute("aria-label", label);

    const icon = document.createElement("i");
    icon.className = meta.iconClass;
    icon.setAttribute("aria-hidden", "true");

    link.appendChild(icon);
    wrapper.appendChild(link);
  });

  return wrapper;
}

function createLogoBlock(url, providerName) {
  const wrapper = document.createElement("div");
  wrapper.className = "prize-card__logo";

  const img = document.createElement("img");
  img.src = url;
  img.alt = providerName ? `${providerName} logo` : "Provider logo";

  wrapper.appendChild(img);
  return wrapper;
}

function renderProviderGallery(records, providerAssetsCollection, providerPaths) {
  const section = document.getElementById("provider-section");
  const container = document.getElementById("provider-logos");
  if (!section || !container) {
    return;
  }

  const seen = new Set();
  const fragment = document.createDocumentFragment();

  records.forEach((record, index) => {
    const providerName = record[normaliseKey("Provider")];
    if (!providerName) {
      return;
    }

    const assets = providerAssetsCollection[index] || {};
    const providerPath = providerPaths[index];
    if (!providerPath) {
      return;
    }

    if (!assets.logoUrl) {
      return;
    }

    const key = `${providerPath}|${assets.logoUrl}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    const figure = document.createElement("figure");
    figure.className = "provider-logo";

    const img = document.createElement("img");
    img.src = assets.logoUrl;
    img.alt = `${providerName} logo`;
    figure.appendChild(img);

    fragment.appendChild(figure);
  });

  if (!seen.size) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";
  container.appendChild(fragment);
  section.hidden = false;
}

function gatherGalleryImages(galleryAssets) {
  const unique = new Set();
  const images = [];

  if (Array.isArray(galleryAssets)) {
    galleryAssets.forEach((url) => {
      if (url && !unique.has(url)) {
        unique.add(url);
        images.push(url);
      }
    });
  }

  return images;
}

function getAssetPath(record, key) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function createCarousel(images, itemName) {
  if (!images.length) {
    return null;
  }

  const media = document.createElement("div");
  media.className = "prize-card__media";

  const carousel = document.createElement("div");
  carousel.className = "carousel";

  const slidesWrapper = document.createElement("div");
  slidesWrapper.className = "carousel__slides";

  const slides = images.map((url, index) => {
    const slide = document.createElement("div");
    slide.className = "carousel__slide";
    if (index === 0) {
      slide.classList.add("is-active");
    }
    const img = document.createElement("img");
    img.src = url;
    img.alt = `${itemName} image ${index + 1}`;
    slide.appendChild(img);
    slidesWrapper.appendChild(slide);
    return slide;
  });

  carousel.appendChild(slidesWrapper);

  let dots = [];
  let currentIndex = 0;

  function updateActiveSlide(newIndex) {
    if (newIndex === currentIndex) {
      return;
    }
    slides[currentIndex].classList.remove("is-active");
    slides[newIndex].classList.add("is-active");

    if (dots.length) {
      dots[currentIndex].classList.remove("is-active");
      dots[currentIndex].removeAttribute("aria-current");

      dots[newIndex].classList.add("is-active");
      dots[newIndex].setAttribute("aria-current", "true");
    }

    currentIndex = newIndex;
  }

  if (images.length > 1) {
    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "carousel__control carousel__control--prev";
    prevButton.setAttribute("aria-label", "Previous image");
    prevButton.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "carousel__control carousel__control--next";
    nextButton.setAttribute("aria-label", "Next image");
    nextButton.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';

    prevButton.addEventListener("click", () => {
      const newIndex = (currentIndex - 1 + images.length) % images.length;
      updateActiveSlide(newIndex);
    });

    nextButton.addEventListener("click", () => {
      const newIndex = (currentIndex + 1) % images.length;
      updateActiveSlide(newIndex);
    });

    carousel.appendChild(prevButton);
    carousel.appendChild(nextButton);

    const dotsWrapper = document.createElement("div");
    dotsWrapper.className = "carousel__dots";

    dots = images.map((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      dot.setAttribute("aria-label", `Go to image ${index + 1}`);
      dot.dataset.index = String(index);
      if (index === 0) {
        dot.classList.add("is-active");
        dot.setAttribute("aria-current", "true");
      }
      dot.addEventListener("click", () => {
        updateActiveSlide(Number(dot.dataset.index) || 0);
      });
      dotsWrapper.appendChild(dot);
      return dot;
    });

    carousel.appendChild(dotsWrapper);
  }

  media.appendChild(carousel);
  return media;
}

function findFirstKey(record, candidates) {
  return candidates
    .map((candidate) => normaliseKey(candidate))
    .find((candidate) => Object.prototype.hasOwnProperty.call(record, candidate));
}

function showPrizeError() {
  if (!prizeErrorElement) {
    return;
  }
  prizeErrorElement.hidden = false;
}

function buildAssetUrl(basePath, filePath) {
  if (!filePath) {
    return "";
  }

  const trimmed = String(filePath).trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedBase = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (trimmed.startsWith(normalizedBase)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const segments = trimmed
    .split("/")
    .filter((segment) => segment.length > 0)
    .filter((segment) => segment !== "..")
    .map((segment) => encodeURIComponent(segment));

  let suffix = segments.join("/");
  if (suffix && trimmed.endsWith("/")) {
    suffix += "/";
  }

  if (!suffix && trimmed.endsWith("/")) {
    return normalizedBase;
  }

  if (!suffix) {
    return "";
  }

  return `${normalizedBase}${suffix}`;
}

async function fetchProviderAssets(rawPath) {
  const trimmedPath = typeof rawPath === "string" ? rawPath.trim() : "";
  if (!trimmedPath) {
    return { links: null, logoUrl: null };
  }

  const sanitizedPath = sanitizeAssetPath(trimmedPath);
  if (!sanitizedPath) {
    return { links: null, logoUrl: null };
  }

  if (providerAssetCache.has(sanitizedPath)) {
    return providerAssetCache.get(sanitizedPath);
  }

  const baseUrl = `${PROVIDER_BASE_PATH}${sanitizedPath}/`;
  const [links, manifest] = await Promise.all([
    fetchLinks(baseUrl),
    fetchProviderManifest(baseUrl),
  ]);

  let logoUrl = manifest && manifest.logo ? buildAssetUrl(baseUrl, manifest.logo) : null;
  if (!logoUrl) {
    logoUrl = await locateLogoFallback(baseUrl);
  }

  const assets = { links, logoUrl };
  providerAssetCache.set(sanitizedPath, assets);
  return assets;
}

async function fetchImageAssets(rawPath) {
  if (!rawPath) {
    return [];
  }

  const sanitizedPath = sanitizeAssetPath(rawPath);
  if (!sanitizedPath) {
    return [];
  }

  if (imageAssetCache.has(sanitizedPath)) {
    return imageAssetCache.get(sanitizedPath);
  }

  const baseUrl = `${IMAGE_ASSET_BASE_PATH}${sanitizedPath}/`;
  const images = await loadImagesFromDirectory(baseUrl);
  imageAssetCache.set(sanitizedPath, images);
  return images;
}

function sanitizeAssetPath(path) {
  return String(path)
    .trim()
    .replace(/\\/g, "/")
    .replace(/(\.\.\/|\/\.\.)/g, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

async function fetchLinks(baseUrl) {
  try {
    const url = buildAssetUrl(baseUrl, "links.json");
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      return null;
    }

    const normalised = Object.entries(data).reduce((acc, [key, value]) => {
      if (ICON_MAP[key] && typeof value === "string" && value.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});

    return Object.keys(normalised).length ? normalised : null;
  } catch (error) {
    return null;
  }
}

async function fetchProviderManifest(baseUrl) {
  try {
    const manifestUrl = buildAssetUrl(baseUrl, "index.json");
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      return null;
    }

    const logo = typeof data.logo === "string" ? data.logo.trim() : "";
    if (!logo) {
      return null;
    }

    return { logo };
  } catch (error) {
    return null;
  }
}

async function locateLogoFallback(baseUrl) {
  const extensions = ["png", "jpg", "jpeg", "svg", "webp", "gif", "avif"];
  for (const ext of extensions) {
    const candidate = buildAssetUrl(baseUrl, `logo.${ext}`);
    if (await urlExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function loadImagesFromDirectory(baseUrl) {
  const fromManifest = await fetchImageManifest(baseUrl);
  const filenames = fromManifest.length ? fromManifest : await fetchImagesFromListing(baseUrl);

  const seen = new Set();
  return filenames
    .map((name) => resolveImageUrl(baseUrl, name))
    .filter((url) => {
      if (!url) {
        return false;
      }
      const extension = url.split(".").pop()?.toLowerCase() || "";
      if (!IMAGE_EXTENSIONS.includes(extension)) {
        return false;
      }
      if (seen.has(url)) {
        return false;
      }
      seen.add(url);
      return true;
    });
}

async function fetchImageManifest(imagesUrl) {
  try {
    const manifestUrl = buildAssetUrl(imagesUrl, "index.json");
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    if (!Array.isArray(result)) {
      return [];
    }

    return result.filter((item) => typeof item === "string" && item.trim());
  } catch (error) {
    return [];
  }
}

async function fetchImagesFromListing(imagesUrl) {
  try {
    const response = await fetch(imagesUrl);
    if (!response.ok) {
      return [];
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return [];
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const anchors = Array.from(doc.querySelectorAll("a[href]"));

    return anchors
      .map((anchor) => anchor.getAttribute("href") || "")
      .map((href) => href.split("?")[0])
      .filter((href) => {
        const lowerHref = href.toLowerCase();
        if (lowerHref.startsWith("../")) {
          return false;
        }
        return IMAGE_EXTENSIONS.some((ext) => lowerHref.endsWith(`.${ext}`));
      });
  } catch (error) {
    return [];
  }
}

function resolveImageUrl(imagesUrl, candidate) {
  if (!candidate) {
    return "";
  }

  const trimmed = String(candidate).trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.startsWith(imagesUrl)) {
    return trimmed;
  }

  return buildAssetUrl(imagesUrl, trimmed);
}

async function urlExists(url) {
  try {
    const headResponse = await fetch(url, { method: "HEAD" });
    if (headResponse.ok) {
      return true;
    }

    if (headResponse.status === 405) {
      const getResponse = await fetch(url, { method: "GET" });
      return getResponse.ok;
    }

    return false;
  } catch (error) {
    return false;
  }
}

function buildLinkAttributes(key, value) {
  if (key === "tel") {
    const numeric = String(value || "")
      .trim()
      .replace(/[^\d+]/g, "");
    const href = numeric ? `tel:${numeric}` : `tel:${value}`;
    return { href, target: "", rel: "" };
  }

  const href = String(value || "").trim();
  if (!href) {
    return { href: "#", target: "", rel: "" };
  }

  return { href, target: "_blank", rel: "noopener" };
}

function formatCurrency(raw) {
  const cleaned = String(raw).trim();
  if (!cleaned) {
    return "";
  }

  const digitsOnly = cleaned.replace(/[^\d.,\-]/g, "");
  const commaCount = (digitsOnly.match(/,/g) || []).length;
  const dotCount = (digitsOnly.match(/\./g) || []).length;

  let normalized = digitsOnly;

  if (commaCount && dotCount) {
    normalized = normalized.replace(/,/g, "");
  } else if (commaCount === 1 && dotCount === 0) {
    normalized = normalized.replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const dotPositions = [];
  for (let i = 0; i < normalized.length; i += 1) {
    if (normalized[i] === ".") {
      dotPositions.push(i);
    }
  }

  if (dotPositions.length > 1) {
    const lastIndex = dotPositions[dotPositions.length - 1];
    normalized =
      normalized.slice(0, lastIndex).replace(/\./g, "") + normalized.slice(lastIndex);
  }

  const numeric = Number(normalized);

  if (Number.isNaN(numeric)) {
    return cleaned;
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function createSparkles() {
  if (!ENABLE_SPARKLES) {
    return;
  }

  if (document.querySelector(".sparkle-layer")) {
    return;
  }

  const layer = document.createElement("div");
  layer.className = "sparkle-layer";
  const sparkleCount = 28;

  for (let i = 0; i < sparkleCount; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.style.left = `${Math.random() * 100}%`;
    sparkle.style.top = `${Math.random() * 120}%`;
    sparkle.style.animationDelay = `${Math.random() * 10}s`;
    sparkle.style.animationDuration = `${10 + Math.random() * 10}s`;
    layer.appendChild(sparkle);
  }

  document.body.appendChild(layer);
}

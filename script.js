const PRIZE_CSV_URL = "resources/raffle_prizes.csv";
const IMAGE_BASE_PATH = "images/";

const prizeListElement = document.getElementById("prize-list");
const prizeErrorElement = document.getElementById("prize-error");
const currentYearElement = document.getElementById("current-year");

if (currentYearElement) {
  currentYearElement.textContent = new Date().getFullYear();
}

const fieldLabels = {
  type: "Type",
  provider: "Provided by",
  quantity: "Available",
  value: "Value",
};

const imageFieldOptions = ["image", "image_file", "image_filename", "image name"];
const linkFieldOptions = ["link", "url", "more_info", "more info"];

init();

async function init() {
  try {
    const csvText = await fetchCsv(PRIZE_CSV_URL);
    const { records } = parseCsv(csvText);
    renderPrizes(records);
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

function renderPrizes(records) {
  if (!records.length) {
    prizeListElement.innerHTML =
      '<p class="prize-grid__empty">Prizes will be announced shortly. Check back soon!</p>';
    return;
  }

  const imageKey = findFirstKey(records[0], imageFieldOptions);
  const linkKey = findFirstKey(records[0], linkFieldOptions);

  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const itemName = record[normaliseKey("Item")];
    if (!itemName) {
      return;
    }

    const card = document.createElement("article");
    card.className = "prize-card";
    card.setAttribute("role", "listitem");

    if (imageKey && record[imageKey]) {
      const image = document.createElement("img");
      image.className = "prize-card__image";
      image.src = `${IMAGE_BASE_PATH}${record[imageKey]}`;
      image.alt = `${itemName} prize image`;
      card.appendChild(image);
    }

    const heading = document.createElement("h3");
    heading.textContent = itemName;
    card.appendChild(heading);

    const meta = createMetaChips(record);
    if (meta) {
      card.appendChild(meta);
    }

    const details = createDetailsList(record);
    if (details.children.length) {
      card.appendChild(details);
    }

    if (linkKey && record[linkKey]) {
      const link = document.createElement("a");
      link.className = "prize-card__link";
      link.href = record[linkKey];
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "More about this prize";
      card.appendChild(link);
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

function createDetailsList(record) {
  const container = document.createElement("div");
  container.className = "prize-card__details";

  Object.entries(fieldLabels).forEach(([key, label]) => {
    let value = record[key];
    if (!value || key === "quantity" || key === "type") {
      return;
    }

    if (key === "value") {
      value = formatCurrency(value);
      if (!value) {
        return;
      }
    }

    const paragraph = document.createElement("p");
    paragraph.innerHTML = `<strong>${label}:</strong> ${value}`;
    container.appendChild(paragraph);
  });

  return container;
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

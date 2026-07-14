import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://planet.turingguild.com/world/solar-irradiance";
const OBSERVATIONS_PATH = new URL("./observations.md", import.meta.url);
const INCIDENTS_PATH = new URL("./incidents.md", import.meta.url);

const response = await fetch(SOURCE_URL, {
  headers: { accept: "application/json" },
});

if (!response.ok) {
  throw new Error(`Request failed with ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const solar = payload?.solarIrradiance ?? {};
const wPerM2 = Number(solar.wPerM2);
const condition = String(solar.condition ?? "");
const timestamp = new Date().toISOString();

const observationsText = await readText(OBSERVATIONS_PATH);
const incidentsText = await readText(INCIDENTS_PATH);
const previousObservation = getLastObservation(observationsText);
const openIncident = getOpenIncident(incidentsText);

const classification = classifyReading(wPerM2, openIncident);
const note = getNote(classification, openIncident);

await appendObservation(OBSERVATIONS_PATH, {
  timestamp,
  wPerM2,
  condition,
  classification,
  note,
});

await writeIncidents(INCIDENTS_PATH, incidentsText, {
  timestamp,
  wPerM2,
  condition,
  classification,
});

const reply = decideReply(previousObservation, {
  timestamp,
  wPerM2,
  classification,
});

if (reply !== "NO_REPLY") {
  console.log(reply);
}

function classifyReading(value, openIncidentState) {
  if (Number.isFinite(value) && value < 450) {
    return "INCIDENT";
  }

  if (openIncidentState) {
    return "RECOVERED";
  }

  return "NORMAL";
}

function getNote(classificationValue, openIncidentState) {
  if (classificationValue === "INCIDENT" && openIncidentState) {
    return "Incident continues.";
  }

  if (classificationValue === "INCIDENT") {
    return "Sunlight dropped below threshold.";
  }

  if (classificationValue === "RECOVERED") {
    return "Sunlight recovered above threshold.";
  }

  return "Sunlight remains within normal range.";
}

function decideReply(previous, current) {
  const previousClassification = previous?.classification ?? null;

  if (current.classification === "INCIDENT") {
    if (previousClassification !== "INCIDENT") {
      return `Discord alert: ${current.timestamp} solar irradiance at ${formatReading(current.wPerM2)} W/m2`;
    }
    return "NO_REPLY";
  }

  if (current.classification === "RECOVERED" && previousClassification === "INCIDENT") {
    return `Discord recovery: ${current.timestamp} solar irradiance back to ${formatReading(current.wPerM2)} W/m2`;
  }

  return "NO_REPLY";
}

function getLastObservation(text) {
  const rows = extractRows(text);
  if (rows.length === 0) {
    return null;
  }

  const cells = rows[rows.length - 1];
  return {
    timestamp: cells[0],
    wPerM2: Number(cells[1]),
    condition: cells[2],
    classification: cells[3],
    note: cells[4],
  };
}

function getOpenIncident(text) {
  const rows = extractRows(text);
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const cells = rows[index];
    if (cells[3] === "Open") {
      return {
        started: cells[0],
        wPerM2: Number(cells[1]),
        condition: cells[2],
        status: cells[3],
      };
    }
  }
  return null;
}

async function appendObservation(fileUrl, entry) {
  const current = await readText(fileUrl);
  const header = current.trim()
    ? current.replace(/\s*$/, "")
    : "# Observations\n\n| timestamp | wPerM2 | condition | classification | note |\n| --- | --- | --- | --- | --- |\n";
  const line = `| ${entry.timestamp} | ${formatReading(entry.wPerM2)} | ${escapeCell(entry.condition)} | ${entry.classification} | ${escapeCell(entry.note)} |`;
  await writeFile(fileUrl, `${header}\n${line}\n`, "utf8");
}

async function writeIncidents(fileUrl, existingText, current) {
  const rows = extractRows(existingText);
  const openIndex = rows.findIndex((row) => row[3] === "Open");

  if (current.classification === "INCIDENT") {
    if (openIndex >= 0) {
      rows[openIndex][4] = current.timestamp;
      rows[openIndex][5] = "Open";
      rows[openIndex][6] = "Incident continues.";
    } else {
      rows.push([
        current.timestamp,
        formatReading(current.wPerM2),
        current.condition,
        "Open",
        current.timestamp,
        "Open",
        "Sunlight remains below threshold.",
      ]);
    }
  } else if (current.classification === "RECOVERED" && openIndex >= 0) {
    rows[openIndex][4] = current.timestamp;
    rows[openIndex][5] = current.timestamp;
    rows[openIndex][3] = "Recovered";
    rows[openIndex][6] = "Sunlight recovered above threshold.";
  }

  const header = [
    "# Incidents",
    "",
    "| started | wPerM2 | condition | status | last update | recovery | note |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  await writeFile(fileUrl, `${header.join("\n")}\n${body ? `${body}\n` : ""}`, "utf8");
}

function extractRows(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => {
      if (cells.length < 5) return false;
      if (cells[0] === "timestamp" || cells[0] === "started") return false;
      return !cells.every((cell) => /^-+$/.test(cell));
    });
}

async function readText(fileUrl) {
  try {
    return await readFile(fileUrl, "utf8");
  } catch {
    return "";
  }
}

function formatReading(value) {
  return Number.isFinite(value) ? String(value) : "unknown";
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|");
}

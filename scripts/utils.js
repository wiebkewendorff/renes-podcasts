export function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

export function stripHtml(value) {
  const text = String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|section|article|blockquote|h[1-6])>/gi, " ")
    .replace(/<(p|div|li|section|article|blockquote|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return normalizeWhitespace(decodeHtmlEntities(text));
}


export function formatDuration(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let seconds = 0;
  if (/^\d+$/.test(raw)) {
    seconds = Number(raw);
  } else if (raw.includes(":")) {
    const parts = raw.split(":").map((p) => Number(p) || 0);
    while (parts.length < 3) parts.unshift(0);
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    return "";
  }
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} Std ${m} Min` : `${h} Std`;
  return `${Math.max(1, m)} Min`;
}

export function applyTitleReplacers(title, replacers) {
  if (!Array.isArray(replacers)) return title;
  let result = String(title ?? "");
  for (const rule of replacers) {
    if (!rule || !rule.pattern) continue;
    try {
      const flags = typeof rule.flags === "string" ? rule.flags : "i";
      result = result.replace(new RegExp(rule.pattern, flags), rule.replace ?? "");
    } catch {
      // ungueltiges Muster ignorieren
    }
  }
  return normalizeWhitespace(result);
}

export function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function uniqueBy(items, getKey) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(value) {
  const date = value instanceof Date ? value : parseDate(value);
  return date ? date.toISOString() : "";
}

export function resolveMaybeUrl(baseUrl, value) {
  const raw = normalizeWhitespace(value);
  if (!raw) {
    return "";
  }

  try {
    return new URL(raw, baseUrl).href;
  } catch {
    return raw;
  }
}

export function createFallbackImage(label, accent = "#4a6a8a") {
  const safeLabel = normalizeWhitespace(label) || "Feed";
  const initials = safeLabel
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-label="${safeLabel}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#f0d8b0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" rx="64" fill="url(#g)" />
      <text x="80" y="690" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function readJsonFile(filePath, fallbackValue) {
  const { readFile } = await import("node:fs/promises");

  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw error;
  }
}

export async function writeJsonFile(filePath, value) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

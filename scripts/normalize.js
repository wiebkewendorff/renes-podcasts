import { applyTitleReplacers, formatDuration, normalizeWhitespace, slugify, toIsoDate } from "./utils.js";

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeWhitespace).filter(Boolean);
  }

  const text = normalizeWhitespace(value);
  return text ? [text] : [];
}

function lowerTags(tags) {
  return asArray(tags).map((tag) => slugify(tag));
}

export function normalizeSource(input) {
  const id = slugify(input.id || input.title || input.feed || input.homepage);
  const title = normalizeWhitespace(input.title) || id;

  return {
    id,
    title,
    type: normalizeWhitespace(input.type || "rss").toLowerCase(),
    homepage: normalizeWhitespace(input.homepage),
    feed: normalizeWhitespace(input.feed),
    language: normalizeWhitespace(input.language || "de"),
    category: asArray(input.category),
    tags: lowerTags(input.tags),
    image: normalizeWhitespace(input.image),
    titleReplace: Array.isArray(input.titleReplace) ? input.titleReplace : [],
    enabled: input.enabled !== false,
    maxEpisodes: Number.isFinite(Number(input.maxEpisodes)) ? Math.max(1, Math.trunc(Number(input.maxEpisodes))) : 10,
  };
}

export function normalizeEntry(source, entry, index) {
  const date = toIsoDate(entry.date) || new Date().toISOString();
  const url = normalizeWhitespace(entry.url || entry.link || source.homepage || source.feed);
  const title = applyTitleReplacers(normalizeWhitespace(entry.title), source.titleReplace) || `${source.title} ${index + 1}`;
  const sourceTags = lowerTags(source.tags);
  const entryTags = lowerTags(entry.tags);
  const category = [...new Set([...asArray(source.category), ...asArray(entry.category)])];
  const tags = [...new Set([...sourceTags, ...entryTags])];
  const rawId = normalizeWhitespace(entry.id || url || `${source.id}-${date}-${title}`);

  return {
    id: `${source.id}:${slugify(rawId)}`,
    source: source.id,
    sourceTitle: source.title,
    type: source.type,
    title,
    summary: normalizeWhitespace(entry.summary || entry.description),
    date,
    url,
    image: normalizeWhitespace(entry.image || source.image),
    audio: normalizeWhitespace(entry.audio),
    duration: formatDuration(entry.duration),
    tags,
    category,
    language: source.language,
  };
}

export function compareByDateDesc(left, right) {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

export function buildSearchIndex(entries) {
  return entries.map((entry) => ({
    id: entry.id,
    source: entry.source,
    title: entry.title,
    summary: entry.summary,
    date: entry.date,
    url: entry.url,
    tags: entry.tags,
    category: entry.category,
    text: [entry.title, entry.summary, entry.sourceTitle, ...entry.tags, ...entry.category]
      .map(normalizeWhitespace)
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}

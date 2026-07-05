import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";
import { parseAtom } from "./atom.js";
import { parseJsonFeed } from "./jsonfeed.js";
import { buildSearchIndex, compareByDateDesc, normalizeEntry, normalizeSource } from "./normalize.js";
import { parseRss } from "./rss.js";
import { createFallbackImage, readJsonFile, uniqueBy, writeJsonFile } from "./utils.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const apiDir = path.join(repoRoot, "api");
const feedsPath = path.join(repoRoot, "config", "feeds.json");
const requestTimeoutMs = 20000;

async function readFeedText(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(source.feed, {
      signal: controller.signal,
      headers: {
        "user-agent": "selected-podcasts/1.0 (+https://wiebkewendorff.github.io/selected-podcasts/)",
        accept: "application/feed+json, application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseByType(source, raw) {
  if (source.type === "atom") {
    return parseAtom(raw, source.feed);
  }

  if (source.type === "jsonfeed") {
    return parseJsonFeed(raw, source.feed);
  }

  return parseRss(raw, source.feed);
}

async function collectEntries(sources) {
  const entries = [];

  for (const source of sources) {
    if (!source.enabled || !source.feed) {
      continue;
    }

    try {
      const raw = await readFeedText(source);
      const parsed = parseByType(source, raw)
        .sort(compareByDateDesc)
        .slice(0, source.maxEpisodes)
        .map((entry, index) => normalizeEntry(source, entry, index));

      entries.push(...parsed);
    } catch (error) {
      console.warn(`Skipping ${source.id}: ${error.message}`);
    }
  }

  return uniqueBy(entries, (entry) => entry.url || entry.id).sort(compareByDateDesc);
}

function publicSource(source) {
  return {
    id: source.id,
    title: source.title,
    type: source.type,
    homepage: source.homepage,
    feed: source.feed,
    language: source.language,
    category: source.category,
    tags: source.tags,
    image: source.image || createFallbackImage(source.title),
    enabled: source.enabled,
    maxEpisodes: source.maxEpisodes,
  };
}

async function writeSourceFiles(entries) {
  const bySource = Map.groupBy(entries, (entry) => entry.source);

  for (const [sourceId, sourceEntries] of bySource) {
    await writeJsonFile(path.join(apiDir, "sources", `${sourceId}.json`), sourceEntries);
  }
}

async function writeTagFiles(entries) {
  const tagMap = new Map();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      const current = tagMap.get(tag) || [];
      current.push(entry);
      tagMap.set(tag, current);
    }
  }

  for (const [tag, tagEntries] of tagMap) {
    await writeJsonFile(path.join(apiDir, "tags", `${tag}.json`), tagEntries.sort(compareByDateDesc));
  }
}

async function cleanGeneratedDirectories() {
  await rm(path.join(apiDir, "sources"), { recursive: true, force: true });
  await rm(path.join(apiDir, "tags"), { recursive: true, force: true });
  await mkdir(path.join(apiDir, "sources"), { recursive: true });
  await mkdir(path.join(apiDir, "tags"), { recursive: true });
}

async function main() {
  const sourceConfig = await readJsonFile(feedsPath, []);
  if (!Array.isArray(sourceConfig)) {
    throw new Error("config/feeds.json must contain an array of source definitions.");
  }

  const sources = sourceConfig.map(normalizeSource);
  const entries = await collectEntries(sources);

  await cleanGeneratedDirectories();
  await writeJsonFile(path.join(apiDir, "feeds.json"), sources.map(publicSource));
  await writeJsonFile(path.join(apiDir, "podcasts.json"), entries);
  await writeJsonFile(path.join(apiDir, "latest.json"), entries.slice(0, 10));
  await writeJsonFile(path.join(apiDir, "latest-5.json"), entries.slice(0, 5));
  await writeJsonFile(path.join(apiDir, "latest-10.json"), entries.slice(0, 10));
  await writeJsonFile(path.join(apiDir, "latest-20.json"), entries.slice(0, 20));
  await writeJsonFile(path.join(apiDir, "search-index.json"), buildSearchIndex(entries));
  await writeSourceFiles(entries);
  await writeTagFiles(entries);

  console.log(`Wrote ${entries.length} entries to ${path.relative(repoRoot, apiDir)}`);
}

await main();

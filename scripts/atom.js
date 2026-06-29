import { escapeRegExp, parseDate, resolveMaybeUrl, stripHtml } from "./utils.js";

function blockPattern(tagName) {
  const name = escapeRegExp(tagName);
  return new RegExp(String.raw`<${name}\b[\s\S]*?<\/${name}>`, "gi");
}

function textPattern(tagName) {
  const name = escapeRegExp(tagName);
  return new RegExp(String.raw`<${name}\b[^>]*>([\s\S]*?)<\/${name}>`, "i");
}

function textValue(block, names) {
  for (const name of names) {
    const match = block.match(textPattern(name));
    if (match) {
      const value = stripHtml(match[1]);
      if (value) {
        return value;
      }
    }
  }

  return "";
}



function htmlValue(block, names) {
  for (const name of names) {
    const match = block.match(textPattern(name));
    if (match) {
      const cdata = /<\!\[CDATA\[([\s\S]*?)\]\]>/gi;
      const raw = match[1].replace(cdata, (_, c) => c).trim();
      if (raw) return raw;
    }
  }
  return "";
}
function attrValue(tag, attributeName) {
  const match = tag.match(new RegExp(String.raw`${escapeRegExp(attributeName)}\s*=\s*(["'])(.*?)\1`, "i"));
  return match ? stripHtml(match[2]) : "";
}

function atomLink(block, feedUrl, preferredRel = "alternate") {
  const links = block.match(/<link\b[^>]*\/?>/gi) ?? [];
  const preferred = links.find((tag) => (attrValue(tag, "rel") || "alternate") === preferredRel) || links[0];
  return preferred ? resolveMaybeUrl(feedUrl, attrValue(preferred, "href")) : "";
}

function enclosure(block, feedUrl) {
  const links = block.match(/<link\b[^>]*\/?>/gi) ?? [];
  const media = links.find((tag) => attrValue(tag, "rel") === "enclosure");
  return media ? resolveMaybeUrl(feedUrl, attrValue(media, "href")) : "";
}

export function parseAtom(xml, feedUrl) {
  const feed = (String(xml).match(/<feed\b[\s\S]*?<\/feed>/i) ?? [String(xml)])[0];
  const feedImage = resolveMaybeUrl(feedUrl, textValue(feed, ["logo", "icon"]));

  return [...feed.matchAll(blockPattern("entry"))].map(([block]) => ({
    id: textValue(block, ["id"]) || atomLink(block, feedUrl),
    title: textValue(block, ["title"]),
    summary: htmlValue(block, ["content", "summary"]),
    date: parseDate(textValue(block, ["published", "updated", "issued"])),
    url: atomLink(block, feedUrl),
    audio: enclosure(block, feedUrl),
    image: feedImage,
    tags: [],
    category: [],
  }));
}

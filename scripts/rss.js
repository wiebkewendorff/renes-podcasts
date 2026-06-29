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
function attrValue(block, names, attributeName) {
  for (const name of names) {
    const tagMatch = block.match(new RegExp(String.raw`<${escapeRegExp(name)}\b([^>]*)\/?>`, "i"));
    if (!tagMatch) {
      continue;
    }

    const attrMatch = tagMatch[1].match(new RegExp(String.raw`${escapeRegExp(attributeName)}\s*=\s*(["'])(.*?)\1`, "i"));
    if (attrMatch) {
      return stripHtml(attrMatch[2]);
    }
  }

  return "";
}

export function parseRss(xml, feedUrl) {
  const channel = (String(xml).match(/<channel\b[\s\S]*?<\/channel>/i) ?? [String(xml)])[0];
  const feedImage = resolveMaybeUrl(feedUrl, attrValue(channel, ["itunes:image"], "href") || textValue(channel, ["url", "logo", "icon"]));

  return [...channel.matchAll(blockPattern("item"))].map(([block]) => ({
    id: textValue(block, ["guid"]) || textValue(block, ["link"]),
    title: textValue(block, ["title"]),
    summary: htmlValue(block, ["content:encoded", "description", "summary", "subtitle"]),
    date: parseDate(textValue(block, ["pubDate", "published", "updated", "dc:date"])),
    url: resolveMaybeUrl(feedUrl, textValue(block, ["link"])),
    audio: resolveMaybeUrl(feedUrl, attrValue(block, ["enclosure", "media:content"], "url")),
    duration: textValue(block, ["itunes:duration", "duration"]),
    image: resolveMaybeUrl(feedUrl, attrValue(block, ["media:thumbnail", "media:content"], "url") || attrValue(block, ["itunes:image"], "href") || feedImage),
    tags: [],
    category: [],
  }));
}

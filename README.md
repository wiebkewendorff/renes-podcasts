# selected-podcasts (Ausgewählte Podcasts)

`selected-podcasts` ist ein statischer Podcast- und Feed-Aggregator fuer GitHub Pages.

Das barrierearme Frontend in `app/` richtet sich an aeltere Nutzer (grosse runde Flaechen, ein Player, wenig Klicks). Daneben dient die erzeugte JSON-API unter `api/` anderen Webseiten zur direkten Nutzung per `fetch()`. Eine ausfuehrliche Projekt- und Design-Dokumentation liegt in `docs/README.md`.

## API-Endpunkte

Nach `npm run update` werden diese Dateien erzeugt:

```text
api/
├── feeds.json
├── podcasts.json
├── latest.json
├── latest-5.json
├── latest-10.json
├── latest-20.json
├── search-index.json
├── sources/
│   └── zeitzeichen.json
└── tags/
    ├── bildung.json
    ├── geschichte.json
    └── zeitgeschichte.json
```

Beispiele:

```js
fetch("https://wiebkewendorff.github.io/selected-podcasts/api/latest.json");
fetch("https://wiebkewendorff.github.io/selected-podcasts/api/latest-5.json");
fetch("https://wiebkewendorff.github.io/selected-podcasts/api/sources/zeitzeichen.json");
fetch("https://wiebkewendorff.github.io/selected-podcasts/api/tags/geschichte.json");
```

## Datenformat

Alle Feed-Typen werden auf ein gemeinsames Format normalisiert:

```json
{
  "id": "zeitzeichen:example-id",
  "source": "zeitzeichen",
  "sourceTitle": "WDR Zeitzeichen",
  "type": "rss",
  "title": "Episode title",
  "summary": "Bereinigte Zusammenfassung ohne HTML.",
  "date": "2026-06-28T04:00:33.000Z",
  "url": "https://example.com/episode",
  "image": "https://example.com/image.jpg",
  "audio": "https://example.com/audio.mp3",
  "tags": ["geschichte"],
  "category": ["Geschichte"],
  "language": "de"
}
```

## Quellen konfigurieren

Quellen werden in `config/feeds.json` gepflegt (Eingabe). Die normalisierte oeffentliche Liste landet als `api/feeds.json`:

```json
{
  "id": "zeitzeichen",
  "title": "WDR Zeitzeichen",
  "type": "rss",
  "homepage": "https://www1.wdr.de/mediathek/audio/zeitzeichen/zeitzeichen-podcast-100.html",
  "feed": "https://www1.wdr.de/mediathek/audio/zeitzeichen/zeitzeichen-podcast-100.podcast",
  "language": "de",
  "category": ["Geschichte", "Bildung"],
  "tags": ["geschichte", "bildung"],
  "image": "https://example.com/cover.jpg",
  "enabled": true,
  "maxEpisodes": 10
}
```

Ein neuer Podcast braucht im Normalfall nur einen weiteren Eintrag in dieser Datei.

Unterstuetzte Typen:

- `rss`
- `atom`
- `jsonfeed`

Weitere Typen wie `youtube`, `mastodon` oder `github-releases` koennen spaeter als eigene Adapter in `scripts/` ergaenzt werden, ohne das API-Format zu aendern.

## Einrichtung

```bash
npm install
npm run update
npm run dev
```

`npm run dev` startet einen kleinen lokalen HTTP-Server fuer das Repo-Root und liefert `app/index.html` unter `/`.

Designer koennen die Episoden-Karte ohne Code im `<template id="episode-card-template">` in `app/index.html` anpassen. Hintergrund und Layout-Begruendungen: `docs/README.md`.

## GitHub Pages

1. Repository zu GitHub pushen.
2. In **Settings > Pages** die Quelle auf **Deploy from a branch** setzen.
3. Branch auswaehlen.
4. Ordner **/ (root)** auswaehlen.
5. Speichern.

Die geplante Pages-URL ist:

```text
https://wiebkewendorff.github.io/selected-podcasts/
```

Die API liegt dann unter:

```text
https://wiebkewendorff.github.io/selected-podcasts/api/
```

## GitHub Action

`.github/workflows/update.yml` laeuft taeglich und kann manuell gestartet werden.

Der Workflow:

- verwendet Node 22
- fuehrt `npm install` aus
- startet `npm run update`
- committed nur, wenn sich Dateien unter `api/` geaendert haben

## Architektur

```text
scripts/fetch.js       Orchestriert Download, Normalisierung und API-Ausgabe
scripts/rss.js         RSS-Adapter
scripts/atom.js        Atom-Adapter
scripts/jsonfeed.js    JSON-Feed-Adapter
scripts/normalize.js   Gemeinsames internes Format und Suchindex
scripts/utils.js       JSON, Text, Datum, URL und Slug-Helfer
```

Die Demo-Website verwendet ausschliesslich `fetch("./api/latest.json")`.
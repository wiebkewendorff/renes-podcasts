### GitHub Actions

Bei GitHub-Workflow-Dateien muss der Schlüssel

```yaml
"on":
```

anstelle von

```yaml
on:
```

verwendet werden.

Grund:
Einige YAML-Parser und KI-Editoren interpretieren `on` nach YAML 1.1 als Boolean und erzeugen dadurch ungültige Workflows. Die Anführungszeichen vermeiden dieses Problem zuverlässig.
## Projektstruktur (standardisiert)

- JSON-API liegt im Root unter `api/` (nicht mehr `docs/api`); auf GitHub Pages: `.../selected-podcasts/api/...`.
- Eingabe-Quellen werden in `config/feeds.json` gepflegt; `scripts/fetch.js` schreibt die öffentliche Liste als `api/feeds.json`.
- Frontend liegt in `app/` und ist das einzige UI; relative API-URL `../api/latest-20.json` für lokal und Pages.
- GitHub Pages deployt aus dem Repo-Root (`/`). `.nojekyll` verhindert Jekyll-Filterung der JSON-Ordner.
- Root-`index.html` ist nur eine Weiterleitung auf `app/`. `scripts/dev-server.js` serviert das Repo-Root.

## Barrierefreiheit (Zielgruppe: ältere Nutzer)

- Große, runde Bedienelemente (Themen + Play/Stop), hohe Schriftkontraste, wenig Information auf einmal.
- Multimodales Feedback: kurzer Klick-/Stopp-Ton via Web Audio; AudioContext erst bei User-Geste starten/resumen.
- Klare Rücksprung-Möglichkeit (Zurück-Button) aus dem Detailbereich.

## App-Frontend Spezifikation (app/)

- `app/index.html` enthält ein editierbares `<template id="episode-card-template">` für die Episoden-Karte; Designer ändern HTML, Code bleibt unberührt. Platzhalter `data-field="title|meta|summary|image|link"` und die Buttons müssen erhalten bleiben.
- `app/app.js` klont das Template (kein innerHTML-Markup mehr), bindet Play/Stop, Auto-Expand (Bild+Beschreibung), Zufall-Sequenz-Autoplay und Sound-Feedback.
- Themenfarben sind in `index.html` (style) und `app.js` (`colors`) gespiegelt; Zufall-Farbe `#e3be4d`.
- Responsiv: Themen 2x2 unter 1200/760px; Detailbereich bricht Play/Stop unter den Titel (<900px).
- Zielgruppe: ältere Nutzer mit Zittern + Information-Overload; große runde Ziele, ein Player, wenig Klicks, Zufall spielt sofort.
- Dokumentation liegt in `docs/README.md` (kein Deploy-Ordner mehr, nur Projektdoku).

# Renès Podcasts – Dokumentation

Ein kleines, barrierearmes Hörfenster in die Welt. Diese Web-App spielt
ausgewählte Podcast-Episoden ab und ist gezielt für Menschen gestaltet, die
mit klassischer Computer-Bedienung überfordert sind.

## 1. Projektvorstellung

Die App ist im Rahmen eines Kunst-/Design-Projektes entstanden. Ausgangspunkt
war ein Altenheimbewohner, der geistig sehr interessiert und neugierig ist,
aber an zwei Hürden scheitert:

- **Motorik:** Zittern erschwert präzises Klicken und Treffen kleiner Ziele.
- **Kognitive Überforderung:** Zu viele Informationen, Menüs und Optionen auf
  einmal („Information Overload“) führen zu Abbruch und Frust.

Ziel ist daher ein „kleines Fenster nach draußen“: wenige, sehr große,
farbcodierte Flächen; ein einziger, klarer Player; kaum Text; kein Suchen.
Ein Klick genügt, um ein Thema zu wählen und zu hören.

## 2. Gestaltungs- und Technik-Entscheidungen (begründet)

### Große, runde Flächen
Themen- und Play/Stop-Buttons sind große Kreise (160–220 px). Große Ziele
sind bei Handzittern viel leichter zu treffen (Fitts’sches Gesetz). Runde,
farbige Flächen wirken zudem freundlich und sind ohne Lesen erkennbar.

### Farbcodierung statt Text
Jedes Thema hat eine eigene Farbe; der Detailbereich übernimmt diese Farbe.
So entsteht ein räumlicher/farblicher Wiedererkennungswert ohne Leselast.

### Nur ein Player (Fokus)
Es läuft immer nur eine Episode. Andere Karten werden während der Wiedergabe
abgeblendet (`.disabled`), damit kein paralleles, verwirrendes Audio entsteht.

### Multimodales Feedback
Jeder Klick erzeugt einen kurzen Ton (Web Audio). Wichtig: der `AudioContext`
wird erst bei der ersten Geste erzeugt/`resume()`-t (Browser-Autoplay-Sperre).

### Sanftes Auto-Scrolling
`scroll-behavior: smooth` führt ruhig zum Detailbereich, damit der räumliche
Bezug erhalten bleibt und nichts „springt“.

### Zufall = sofort hören
Der „zufall“-Button wählt direkt mehrere zufällige Episoden und spielt sie
nacheinander automatisch ab. Bei Müdigkeit muss nichts gesucht werden.

### Klarer Rückweg
Ein großer runder „zurück“-Button bringt jederzeit zur Themenauswahl zurück.

### Kontraste
Texte sind weiß auf dunkler Kartenfläche; helle Buttons (kunst/zufall) tragen
dunkle Schrift. Fokus-Outlines (gelb) unterstützen Tastatur-Bedienung.

### Responsiv
Themen werden auf großen Screens als 3x2 und auf schmalen Screens in zwei
Spalten angeordnet; im Detailbereich rutscht der Play/Stop-Button unter den
Titel, statt abgeschnitten zu werden.

## 3. Wo kann ich am Layout etwas ändern?

- **Karten-Aufbau (ohne Code):** `app/index.html`, `<template id="episode-card-template">`.
  Reihenfolge/Texte frei ändern; die Platzhalter mit `data-field="title|meta|summary|image|link"`
  und die beiden Buttons müssen erhalten bleiben.
- **Farben/Größen:** `app/app.css`. Themenfarben stehen im `style`-Attribut der
  Buttons in `index.html` und gespiegelt in `app/app.js` (`colors`). Button-Größen
  unter `.cat-btn`, `.play-stop-btn`, `.random-btn`, Breakpoints am Dateiende.
- **Texte/Logo/Titel:** direkt im Markup von `app/index.html`.


## 4a. Feeds konfigurieren (config/feeds.json)

Die Datei `config/feeds.json` definiert alle Podcast-Quellen, die die App
abspielt. Ein Beispiel-Eintrag:

```json
{
  "id": "zeitzeichen",
  "title": "WDR Zeitzeichen",
  "type": "rss",
  "homepage": "https://www1.wdr.de/mediathek/audio/zeitzeichen/zeitzeichen-podcast-100.html",
  "feed": "https://www1.wdr.de/mediathek/audio/zeitzeichen/zeitzeichen-podcast-100.podcast",
  "language": "de",
  "category": ["Geschichte", "Bildung"],
  "tags": ["geschichte", "bildung", "zeitgeschichte"],
  "image": "https://...",
  "enabled": true,
  "maxEpisodes": 10,
  "titleReplace": [
    { "pattern": "^\\s*Serie\\s+Klassik\\s+drastisch\\s+#\\d+:\\s*", "replace": "" }
  ]
}
```

**Felder:**
- `id`: eindeutiger Bezeichner (ohne Leerzeichen, Bindestriche ok)
- `title`: Name des Podcasts (wird in der App gezeigt)
- `type`: `"rss"`, `"atom"` oder `"jsonfeed"`
- `feed`: die Feed-URL (RSS, Atom oder JSON Feed)
- `homepage`: optionale Projekt-Homepage
- `language`: Sprache (default `"de"`)
- `category`: Array von Kategorien (Großbuchstaben, z. B. `["Musik", "Kultur"]`)
- `tags`: Array von Tags (Kleinbuchstaben, werden mit Themen in `config/topics.json` abgeglichen)
- `image`: optionale Cover-URL; wird als Fallback in Episoden gezeigt
- `enabled`: `true`/`false` – deaktiviert diese Quelle ohne sie zu löschen
- `maxEpisodes`: wie viele neueste Episoden pro Abruf verarbeiten (default 10)
- `titleReplace`: optionales Array von Regex-Regeln zum Kürzen von Titeln (s. u.)

### Titel kürzen mit titleReplace

Viele Feeds enthalten serientypische Präfixe wie „Serie Klassik drastisch #79:"
oder senderinterne Marker wie „| Spektrum". Die `titleReplace`-Regeln schneiden
diese Teile automatisch ab:

```json
"titleReplace": [
  { "pattern": "^\\s*Serie\\s+Klassik\\s+drastisch\\s+#\\d+:\\s*", "replace": "", "flags": "i" }
]
```

**Aufbau einer Regel:**
- `pattern`: Regex-Muster (z. B. `"^\\|\\s*"` entfernt alles vor dem ersten `|`)
- `replace`: was eingesetzt wird (meist leer `""` zum Löschen)
- `flags`: optional, Regex-Flags (default `"i"` = case-insensitive)

Beispiele:
- `{ "pattern": "^\\s*Serie\\s+Klassik\\s+drastisch\\s+#\\d+:\\s*", "replace": "" }`
  → „Serie Klassik drastisch #79: Georg Friedrich Händel" wird zu „Georg Friedrich Händel"
- `{ "pattern": "^.*\\|\\s*", "replace": "" }`
  → „detektor.fm – Spektrum | Künstliches Leben" wird zu „Künstliches Leben"

Die Regeln werden in der Reihenfolge angewendet, bevor der Titel in die API geschrieben wird.

### Episode-Dauer

Die App versucht, die Episoden-Dauer aus den Feed-Metadaten auszulesen
(`itunes:duration` in RSS/Atom). Diese wird formatiert als z. B. „28 Min"
oder „1 Std 14 Min" und unter dem Quellentitel angezeigt. Dauer ist nicht
erforderlich – fehlt sie, wird sie einfach nicht gezeigt.

## 4. Weitere Feeds hinzufügen

1. Eintrag in `config/feeds.json` ergänzen (RSS/Atom/JSON-Feed), z. B. `tags`
   passend zu den Themen-Buttons setzen.
2. `npm run update` erzeugt die JSON-API neu in `api/`.
3. Lokal prüfen mit `npm run dev` → http://localhost:4173/.
Auf GitHub läuft der Build automatisch via `.github/workflows/update.yml`.

## 5. Lokal starten

```bash
npm install
npm run update
npm run dev
```

## 6. Themen steuern (config/topics.json)

`api/latest-20.json` enthielt nur die 20 neuesten Episoden über alle Feeds –
fehlende Themen blieben leer. Stattdessen lädt die App jetzt `api/podcasts.json`
(voller Datensatz) und 4–8 Wunsch-Topics aus `config/topics.json`:

```json
{ "id": "geschichte", "label": "geschichte", "color": "#3b52ab", "tags": ["geschichte", "zeitgeschichte"] }
```

Es werden immer 4 Buttons gezeigt: bevorzugt Topics mit Episoden; fehlt Inhalt,
rückt das nächste gefüllte Topic nach; reichen die Wunsch-Topics nicht, ergänzt
die App zufällige vorhandene Feed-Tags. So gibt es unter jedem Button Inhalte.

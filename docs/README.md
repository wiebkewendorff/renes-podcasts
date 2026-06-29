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
Themen werden auf schmalen Screens als 2x2 angeordnet; im Detailbereich
rutscht der Play/Stop-Button unter den Titel, statt abgeschnitten zu werden.

## 3. Wo kann ich am Layout etwas ändern?

- **Karten-Aufbau (ohne Code):** `app/index.html`, `<template id="episode-card-template">`.
  Reihenfolge/Texte frei ändern; die Platzhalter mit `data-field="title|meta|summary|image|link"`
  und die beiden Buttons müssen erhalten bleiben.
- **Farben/Größen:** `app/app.css`. Themenfarben stehen im `style`-Attribut der
  Buttons in `index.html` und gespiegelt in `app/app.js` (`colors`). Button-Größen
  unter `.cat-btn`, `.play-stop-btn`, `.random-btn`, Breakpoints am Dateiende.
- **Texte/Logo/Titel:** direkt im Markup von `app/index.html`.

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

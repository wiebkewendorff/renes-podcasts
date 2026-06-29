# Git-Workflow für generierte Inhalte

## Problem
- `npm run update` generiert `api/` Dateien mit fremden Inhalten (WDR, NDR, detektor.fm, etc.)
- Diese Dateien stehen in `.gitignore` (urheberrechtlich geschützt)
- GitHub Actions generiert sie auch → Merge-Konflikte zwischen lokal und Remote

## Lösung: Richtige Workflow

### ✅ Normal (was du tun solltest)
```bash
git pull                  # Hol dir die neuesten Code-Änderungen
npm run update           # Generiere API lokal (nur zum Testen)
# Test die App ...
git status               # Zeigt NICHTS in api/ (durch .gitignore)
git push                 # Nur Code-Änderungen gehen auf GitHub
```

GitHub Actions macht dann automatisch `npm run update` auf dem Server.

### ❌ Problem (was Konflikte verursacht)
```bash
npm run update
git add api/             # Oder git add --force api/
git commit               # Diese Commits verursachen Konflikte!
```

## Falls Konflikt auftritt
```bash
git reset --hard origin/main   # Zum Remote-Stand zurück
npm run update                  # Lokal regenerieren zum Testen
# Test ...
git status                      # Should show no api/ changes
```

## Merksatz
- **Lokal**: `npm run update` ist OK, committen ist NICHT OK
- **Remote**: GitHub Actions committet sie automatisch
- **Ergebnis**: Keine Konflikte, Inhalte sind nicht in Git-History

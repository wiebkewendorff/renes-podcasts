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
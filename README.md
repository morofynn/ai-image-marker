# AI Image Marker

Ein kleines, frameworkfreies Script zur unaufdringlichen Kennzeichnung KI-generierter Bilder. Der Marker lebt in einem separaten Overlay und verändert weder das Bild noch dessen umgebendes Layout.

## Einbindung

```html
<script src="https://cdn.jsdelivr.net/gh/DEIN-GITHUB-NAME/ai-image-marker@main/ai-image-marker.js" defer></script>
```

Anschließend Bilder mit `data-ai` markieren:

```html
<img src="bild.jpg" alt="Beschreibung" data-ai>
```

Optional kann der Text angepasst werden:

```html
<img src="bild.jpg" alt="Beschreibung" data-ai data-ai-label="Mit KI erstellt">
```

Aus Kompatibilitätsgründen wird auch `marker="ai"` unterstützt.

## Verhalten

- 15 × 15 px großer weißer Marker am oberen rechten Bildrand
- öffnet sich bei Klick oder Tastaturbedienung für zwei Sekunden
- verändert keine bestehenden Bild-, Link-, Grid-, Flex- oder Positionierungsregeln
- funktioniert auch in `overflow: hidden`-Containern und bei dynamisch eingefügten Bildern
- berücksichtigt Scrollen, verschachtelte Scrollcontainer, Größenänderungen und responsive Layouts
- zugänglich per Tastatur und `aria-label`
- respektiert `prefers-reduced-motion`

## API

Normalerweise ist kein manueller Aufruf nötig. Nach speziellen DOM-Änderungen kann neu synchronisiert werden:

```js
window.AIImageMarker.refresh();
```

## Lokal testen

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080/demo.html` öffnen.

## Lizenz

MIT

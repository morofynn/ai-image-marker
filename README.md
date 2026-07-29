# AI Image Marker

Ein kleines, frameworkfreies Script zur unaufdringlichen Kennzeichnung KI-generierter Bilder. Der Marker lebt in einem separaten Overlay und verändert weder das Bild noch dessen umgebendes Layout.

## Einbindung

```html
<script src="https://cdn.jsdelivr.net/gh/morofynn/ai-image-marker@main/ai-image-marker.js" defer></script>
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

- 12 × 12 px großer weißer Marker exakt in der Bildmitte
- öffnet sich bei Hover für die Hover-Dauer sowie bei Klick oder Tastaturbedienung für zwei Sekunden
- verändert keine bestehenden Bild-, Link-, Grid-, Flex- oder Positionierungsregeln
- funktioniert auch in `overflow: hidden`-Containern und bei dynamisch eingefügten Bildern
- berücksichtigt Scrollen, verschachtelte Scrollcontainer, Größenänderungen und responsive Layouts
- beobachtet nur relevante Bildattribute und bleibt dadurch auch auf animationsreichen Seiten performant
- blendet Marker beim Scrollen vollständig aus und positioniert sie 500 ms nach Scrollende neu
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

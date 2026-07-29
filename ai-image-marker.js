(function () {
  'use strict';

  if (window.AIImageMarker) return;

  const SELECTOR = 'img[data-ai], img[marker="ai"]';
  const DEFAULT_LABEL = 'KI-generiert';
  const markers = new Map();
  let scheduled = false;

  const style = document.createElement('style');
  style.dataset.aiImageMarker = '';
  style.textContent = `
    .ai-image-marker {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 15px;
      height: 15px;
      min-width: 15px;
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(145deg, #fff 0%, #f3f3f0 58%, #d7d7d3 100%);
      box-shadow:
        0 2px 5px rgb(0 0 0 / 22%),
        inset 1px 1px 2px rgb(255 255 255 / 100%),
        inset -1px -2px 2px rgb(0 0 0 / 13%);
      color: #3d3d3d;
      font: 600 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
      cursor: pointer;
      pointer-events: auto;
      opacity: 1;
      transform: translate(-50%, -50%);
      transform-origin: center;
      transition: width 180ms ease, padding 180ms ease, opacity 120ms ease;
      -webkit-font-smoothing: antialiased;
    }

    .ai-image-marker__label {
      all: initial;
      display: block;
      max-width: 0;
      overflow: hidden;
      color: #3d3d3d;
      font: inherit;
      white-space: nowrap;
      opacity: 0;
      transition: max-width 180ms ease, opacity 120ms ease;
    }

    .ai-image-marker[data-open="true"] {
      width: var(--ai-marker-open-width, 86px);
      padding: 0 8px;
    }

    .ai-image-marker[data-open="true"] .ai-image-marker__label {
      max-width: 180px;
      opacity: 1;
    }

    .ai-image-marker:focus-visible {
      outline: 2px solid #1a73e8;
      outline-offset: 2px;
    }

    .ai-image-marker[hidden] { display: none !important; }

    @media (prefers-reduced-motion: reduce) {
      .ai-image-marker,
      .ai-image-marker__label { transition: none; }
    }
  `;

  function schedulePositioning() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(positionAll);
  }

  function positionAll() {
    scheduled = false;
    for (const [image, record] of markers) {
      if (!image.isConnected || !image.matches(SELECTOR)) {
        removeMarker(image);
        continue;
      }

      const rect = image.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 &&
        rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight;

      if (record.visible !== visible) {
        record.visible = visible;
        record.button.hidden = !visible;
      }
      if (!visible) continue;

      const x = Math.round((rect.left + rect.width * 0.5) * 2) / 2;
      const y = Math.round((rect.top + rect.height * 0.5) * 2) / 2;
      if (record.x !== x) {
        record.x = x;
        record.button.style.left = `${x}px`;
      }
      if (record.y !== y) {
        record.y = y;
        record.button.style.top = `${y}px`;
      }
    }
  }

  function close(record) {
    clearTimeout(record.timer);
    record.timer = 0;
    record.button.dataset.open = 'false';
    record.button.setAttribute('aria-expanded', 'false');
  }

  function toggle(record) {
    const willOpen = record.button.dataset.open !== 'true';
    clearTimeout(record.timer);
    record.button.dataset.open = String(willOpen);
    record.button.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) record.timer = setTimeout(() => close(record), 2000);
  }

  function addMarker(image) {
    if (markers.has(image)) {
      const current = markers.get(image);
      const nextLabel = image.dataset.aiLabel || DEFAULT_LABEL;
      if (current.label !== nextLabel) {
        current.label = nextLabel;
        current.button.setAttribute('aria-label', nextLabel);
        current.labelNode.textContent = nextLabel;
      }
      return;
    }

    const label = image.dataset.aiLabel || DEFAULT_LABEL;
    const button = document.createElement('button');
    const labelNode = document.createElement('span');
    button.type = 'button';
    button.className = 'ai-image-marker';
    button.dataset.open = 'false';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-expanded', 'false');
    labelNode.className = 'ai-image-marker__label';
    labelNode.textContent = label;
    button.append(labelNode);
    document.body.append(button);

    const record = {
      button,
      label,
      labelNode,
      timer: 0,
      resizeObserver: null,
      visible: null,
      x: null,
      y: null
    };
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggle(record);
    });

    if ('ResizeObserver' in window) {
      record.resizeObserver = new ResizeObserver(schedulePositioning);
      record.resizeObserver.observe(image);
    }

    markers.set(image, record);
  }

  function removeMarker(image) {
    const record = markers.get(image);
    if (!record) return;
    clearTimeout(record.timer);
    record.resizeObserver?.disconnect();
    record.button.remove();
    markers.delete(image);
  }

  function scan(root = document) {
    if (root.nodeType === 1 && root.matches?.(SELECTOR)) addMarker(root);
    root.querySelectorAll?.(SELECTOR).forEach(addMarker);
    schedulePositioning();
  }

  function refresh() {
    scan(document);
    for (const image of markers.keys()) {
      if (!image.matches(SELECTOR)) removeMarker(image);
    }
  }

  function init() {
    (document.head || document.documentElement).append(style);
    scan();

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target.closest?.('.ai-image-marker')) continue;

        if (mutation.type === 'attributes') {
          const image = mutation.target;
          if (image.matches(SELECTOR)) addMarker(image);
          else removeMarker(image);
          continue;
        }

        mutation.addedNodes.forEach(scan);
        schedulePositioning();
      }
    });
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ai', 'data-ai-label', 'marker']
    });

    addEventListener('scroll', schedulePositioning, { passive: true, capture: true });
    addEventListener('resize', schedulePositioning, { passive: true });
    addEventListener('load', schedulePositioning, { capture: true });

    window.AIImageMarker = Object.freeze({ refresh });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

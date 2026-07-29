(function () {
  'use strict';

  if (window.AIImageMarker) return;

  const SELECTOR = 'img[data-ai], img[marker="ai"]';
  const DEFAULT_LABEL = 'KI-generiert';
  const markers = new Map();
  const motionGroups = new Map();
  let scheduled = false;
  let scrolling = false;
  let scrollEndTimer = 0;
  let motionCheckTimer = 0;

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
      width: 12px;
      height: 12px;
      min-width: 12px;
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
      font: 600 10px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      white-space: nowrap;
      cursor: pointer;
      pointer-events: auto;
      opacity: .8;
      transform: translate(-50%, -50%);
      transform-origin: center;
      transition: width 180ms ease, padding 180ms ease, opacity 240ms ease;
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
      width: var(--ai-marker-open-width, 78px);
      padding: 0 7px;
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

    .ai-image-marker[data-moving="true"] {
      opacity: 0;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .ai-image-marker,
      .ai-image-marker__label { transition: none; }
    }
  `;

  function schedulePositioning() {
    if (scrolling) return;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(positionAll);
  }

  function setRecordMoving(record, reason, moving) {
    if (moving) {
      if (record.motionReasons.size === 0) close(record);
      record.motionReasons.add(reason);
    } else {
      record.motionReasons.delete(reason);
    }
    record.button.dataset.moving = String(record.motionReasons.size > 0);
  }

  function setMarkersMoving(moving) {
    for (const record of markers.values()) {
      setRecordMoving(record, 'scroll', moving);
    }
  }

  function scheduleMotionCheck() {
    if (motionCheckTimer) return;
    motionCheckTimer = setTimeout(checkMotionGroups, 120);
  }

  function checkMotionGroups() {
    motionCheckTimer = 0;
    const now = Date.now();
    const stoppedGroups = [];
    let hasMovingGroups = false;

    for (const group of motionGroups.values()) {
      if (!group.moving) continue;
      if (now - group.lastChange < 500) {
        hasMovingGroups = true;
        continue;
      }
      group.moving = false;
      stoppedGroups.push(group);
    }

    if (stoppedGroups.length) {
      scheduled = false;
      requestAnimationFrame(() => {
        positionAll();
        requestAnimationFrame(() => {
          for (const group of stoppedGroups) {
            for (const record of group.records) {
              setRecordMoving(record, group, false);
            }
          }
        });
      });
    }

    if (hasMovingGroups) scheduleMotionCheck();
  }

  function findMotionRoot(image) {
    let node = image;
    let groupedCandidate = null;
    while (node && node !== document.documentElement) {
      if (motionGroups.has(node)) return node;
      const css = getComputedStyle(node);
      if (css.transform !== 'none' || (css.translate && css.translate !== 'none')) return node;
      if (!groupedCandidate && node !== image && node.querySelectorAll(SELECTOR).length > 1) {
        groupedCandidate = node;
      }
      node = node.parentElement;
    }
    return groupedCandidate;
  }

  function attachMotionTracking(image, record) {
    const root = findMotionRoot(image);
    if (!root) return;

    let group = motionGroups.get(root);
    if (!group) {
      group = {
        root,
        records: new Set(),
        moving: false,
        lastChange: 0,
        observer: null
      };
      group.observer = new MutationObserver(() => {
        group.lastChange = Date.now();
        if (!group.moving) {
          group.moving = true;
          for (const item of group.records) setRecordMoving(item, group, true);
        }
        scheduleMotionCheck();
      });
      group.observer.observe(root, { attributes: true, attributeFilter: ['style'] });
      motionGroups.set(root, group);
    }

    group.records.add(record);
    record.motionGroup = group;
    if (group.moving) setRecordMoving(record, group, true);
  }

  function refreshMotionTracking() {
    for (const [image, record] of markers) {
      if (!record.motionGroup && image.isConnected) attachMotionTracking(image, record);
    }
  }


  function handleScroll() {
    if (!scrolling) {
      scrolling = true;
      setMarkersMoving(true);
    }

    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(() => {
      scrolling = false;
      scheduled = false;
      requestAnimationFrame(() => {
        positionAll();
        requestAnimationFrame(() => {
          if (!scrolling) setMarkersMoving(false);
        });
      });
    }, 500);
  }

  function positionAll() {
    scheduled = false;
    if (scrolling) return;

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

      const x = Math.round((rect.left + rect.width * record.xPercent / 100) * 2) / 2;
      const y = Math.round((rect.top + rect.height * record.yPercent / 100) * 2) / 2;
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

  function open(record, autoClose) {
    clearTimeout(record.timer);
    record.timer = 0;
    record.button.dataset.open = 'true';
    record.button.setAttribute('aria-expanded', 'true');
    if (autoClose) record.timer = setTimeout(() => close(record), 2000);
  }

  function readPercent(image, attribute) {
    const value = Number.parseFloat(image.getAttribute(attribute));
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 50;
  }

  function addMarker(image) {
    if (markers.has(image)) {
      const current = markers.get(image);
      const nextLabel = image.dataset.aiLabel || DEFAULT_LABEL;
      const nextXPercent = readPercent(image, 'data-ai-x');
      const nextYPercent = readPercent(image, 'data-ai-y');
      if (current.label !== nextLabel) {
        current.label = nextLabel;
        current.button.setAttribute('aria-label', nextLabel);
        current.labelNode.textContent = nextLabel;
      }
      if (current.xPercent !== nextXPercent || current.yPercent !== nextYPercent) {
        current.xPercent = nextXPercent;
        current.yPercent = nextYPercent;
        schedulePositioning();
      }
      return;
    }

    const label = image.dataset.aiLabel || DEFAULT_LABEL;
    const xPercent = readPercent(image, 'data-ai-x');
    const yPercent = readPercent(image, 'data-ai-y');
    const button = document.createElement('button');
    const labelNode = document.createElement('span');
    button.type = 'button';
    button.className = 'ai-image-marker';
    button.dataset.open = 'false';
    button.dataset.moving = 'false';
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
      motionGroup: null,
      motionReasons: new Set(),
      hovered: false,
      xPercent,
      yPercent,
      visible: null,
      x: null,
      y: null
    };
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      open(record, !record.hovered);
    });
    button.addEventListener('mouseenter', () => {
      record.hovered = true;
      open(record, false);
    });
    button.addEventListener('mouseleave', () => {
      record.hovered = false;
      close(record);
    });

    if ('ResizeObserver' in window) {
      record.resizeObserver = new ResizeObserver(schedulePositioning);
      record.resizeObserver.observe(image);
    }

    markers.set(image, record);
    attachMotionTracking(image, record);
    if (scrolling) setRecordMoving(record, 'scroll', true);
  }

  function removeMarker(image) {
    const record = markers.get(image);
    if (!record) return;
    clearTimeout(record.timer);
    record.resizeObserver?.disconnect();
    if (record.motionGroup) {
      const group = record.motionGroup;
      group.records.delete(record);
      if (group.records.size === 0) {
        group.observer.disconnect();
        motionGroups.delete(group.root);
      }
    }
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
      attributeFilter: ['data-ai', 'data-ai-label', 'data-ai-x', 'data-ai-y', 'marker']
    });

    addEventListener('scroll', handleScroll, { passive: true, capture: true });
    addEventListener('resize', schedulePositioning, { passive: true });
    addEventListener('load', () => {
      refreshMotionTracking();
      schedulePositioning();
    }, { capture: true, once: true });
    setTimeout(refreshMotionTracking, 500);

    window.AIImageMarker = Object.freeze({ refresh });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

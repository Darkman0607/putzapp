/* U04 V1.0.3 - pure sanitation/estimated room state, no sensor-derived claims. */
(function (root) {
  'use strict';
  const clamp = value => Math.min(100, Math.max(0, Math.round(Number(value))));
  const validScore = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
  const score = (v, fallback = 50) => validScore(v) ? clamp(v) : fallback;
  function sanitize(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const areas = Array.isArray(source.areas) ? source.areas : [];
    const used = new Set();
    return {
      base: score(source.base),
      override: validScore(source.override) ? clamp(source.override) : null,
      areas: areas.slice(0, 50).filter(a => a && typeof a === 'object').map(a => ({
        id: typeof a.id === 'string' && a.id.length < 120 ? a.id : '',
        name: String(a.name || '').trim().slice(0, 55),
        score: score(a.score),
        tasks: (Array.isArray(a.tasks) ? a.tasks : []).slice(0,30).filter(t => t && typeof t === 'object' && typeof t.id === 'string').map(t => ({id:t.id.slice(0,120),text:String(t.text || '').trim().slice(0,90),done:t.done === true})).filter(t=>t.id && t.text)
      })).filter(a => a.id && a.name && !used.has(a.id) && used.add(a.id))
    };
  }
  // The baseline represents all unrecorded surfaces together as ONE neutral share.
  // Each separately tracked area contributes one equally weighted share.
  // A manual room override takes precedence until an area changes.
  function roomScore(raw) {
    const clean = sanitize(raw);
    if (clean.override !== null) return clean.override;
    const total = clean.base + clean.areas.reduce((sum, area) => sum + area.score, 0);
    return Math.round(total / (clean.areas.length + 1));
  }
  function stateColor(percent) {
    const n = score(percent);
    if (n < 35) return '#c35862';
    if (n < 65) return '#c68c49';
    if (n < 85) return '#388fb0';
    return '#178d6d';
  }
  function updateArea(raw, id, changes) {
    const next = sanitize(raw), item = next.areas.find(x => x.id === id);
    if (!item) return null;
    if (Object.hasOwn(changes, 'name')) {
      const name = String(changes.name || '').trim().slice(0,55);
      if (!name) return null;
      item.name = name;
    }
    if (Object.hasOwn(changes, 'score')) {
      if (!validScore(changes.score)) return null;
      item.score = clamp(changes.score);
    }
    next.override = null;
    return next;
  }
  const api = Object.freeze({sanitize, roomScore, stateColor, updateArea, validScore, clamp});
  root.PutzmanagerClean = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

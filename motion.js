/* ============================================================
   Titus AI Skill Library, motion + rendering engine
   ============================================================ */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

// ============================================================
// Domain configuration. Add a key here to introduce a new
// domain. Order in this object is the render order.
// ============================================================
const DOMAIN_CONFIG = {
  'document-creation':    { label: 'Document Creation' },
  'candidate-evaluation': { label: 'Candidate Evaluation' },
  'partner-intelligence': { label: 'Partner Intelligence' },
  'skill-operations':     { label: 'Skill Operations' },
  'automation':           { label: 'Automation' },
  'internal-tools':       { label: 'Internal Tools' },
};

const STATUS_LABELS = { live: 'Live', beta: 'Beta', deprecated: 'Deprecated' };
const ROADMAP_PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
const CHANGELOG_TYPE_LABELS = {
  launch: 'Launch', added: 'Added', updated: 'Updated', renamed: 'Renamed', deprecated: 'Deprecated'
};

// ============================================================
// DOM helpers
// ============================================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

async function loadJSON(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn(`Could not load ${path}:`, e);
    return [];
  }
}

// ============================================================
// Atmospheric orb canvas
// Several radial gradients composited additively, drifting
// slowly. Pointer-reactive offset for parallax.
// ============================================================
class OrbField {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.orbs = [
      { x: 0.18, y: 0.22, r: 0.48, color: [0, 57, 104], a: 0.85, vx: 0.00006, vy: 0.00009, par: 0.04 },
      { x: 0.78, y: 0.18, r: 0.36, color: [169, 208, 255], a: 0.42, vx: -0.00009, vy: 0.00007, par: 0.03 },
      { x: 0.55, y: 0.82, r: 0.52, color: [0, 57, 104], a: 0.55, vx: 0.00008, vy: -0.00005, par: 0.05 },
      { x: 0.92, y: 0.62, r: 0.22, color: [244, 198, 3], a: 0.32, vx: -0.00007, vy: 0.00006, par: 0.06 },
      { x: 0.08, y: 0.72, r: 0.28, color: [169, 208, 255], a: 0.28, vx: 0.00005, vy: -0.00008, par: 0.04 },
    ];
    this.pointer = { x: 0.5, y: 0.5 };
    this.pointerSmooth = { x: 0.5, y: 0.5 };
    this.scrollY = 0;
    this.t = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    if (FINE_POINTER && !REDUCED_MOTION) {
      window.addEventListener('pointermove', (e) => {
        this.pointer.x = e.clientX / window.innerWidth;
        this.pointer.y = e.clientY / window.innerHeight;
      }, { passive: true });
    }
    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY;
    }, { passive: true });
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.w = w;
    this.h = h;
    this.ctx.scale(this.dpr, this.dpr);
  }

  tick(now) {
    this.t = now;
    this.pointerSmooth.x += (this.pointer.x - this.pointerSmooth.x) * 0.04;
    this.pointerSmooth.y += (this.pointer.y - this.pointerSmooth.y) * 0.04;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    const scrollOffset = (this.scrollY / window.innerHeight) * 0.08;

    for (let i = 0; i < this.orbs.length; i++) {
      const orb = this.orbs[i];
      orb.x += orb.vx;
      orb.y += orb.vy;
      if (orb.x < 0.05 || orb.x > 0.95) orb.vx *= -1;
      if (orb.y < 0.05 || orb.y > 0.95) orb.vy *= -1;

      const breathe = 0.06 * Math.sin(now * 0.0006 + i * 1.7);
      const offsetX = (this.pointerSmooth.x - 0.5) * orb.par;
      const offsetY = (this.pointerSmooth.y - 0.5) * orb.par - scrollOffset * (i % 2 === 0 ? 1 : -1);

      const cx = (orb.x + offsetX) * this.w;
      const cy = (orb.y + offsetY) * this.h;
      const radius = (orb.r + breathe) * Math.min(this.w, this.h);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const [r, g, b] = orb.color;
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${orb.a})`);
      grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${orb.a * 0.3})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(this.tick);
  }
}

// ============================================================
// Custom cursor
// ============================================================
class Cursor {
  constructor() {
    this.dot = $('.cursor-dot');
    this.ring = $('.cursor-ring');
    this.glow = $('#cursor-glow');
    if (!this.dot || !this.ring) return;

    this.mx = window.innerWidth / 2;
    this.my = window.innerHeight / 2;
    this.rx = this.mx;
    this.ry = this.my;
    this.gx = this.mx;
    this.gy = this.my;
    this.visible = false;

    document.addEventListener('pointermove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      this.dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      if (!this.visible) {
        this.dot.style.opacity = '1';
        this.ring.style.opacity = '1';
        if (this.glow) this.glow.style.opacity = '1';
        this.visible = true;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      this.dot.style.opacity = '0';
      this.ring.style.opacity = '0';
      if (this.glow) this.glow.style.opacity = '0';
      this.visible = false;
    });

    document.addEventListener('mouseenter', () => {
      this.dot.style.opacity = '1';
      this.ring.style.opacity = '1';
      if (this.glow) this.glow.style.opacity = '1';
      this.visible = true;
    });

    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('a, button, [data-cursor="hover"], details summary, .filter-chip')) {
        this.ring.classList.add('cursor-ring--hover');
        this.ring.classList.remove('cursor-ring--text');
      } else if (t.closest('p, h1, h2, h3, h4, .skill-card__triggers li, input, textarea')) {
        this.ring.classList.remove('cursor-ring--hover');
        this.ring.classList.add('cursor-ring--text');
      } else {
        this.ring.classList.remove('cursor-ring--hover');
        this.ring.classList.remove('cursor-ring--text');
      }
    });

    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  tick() {
    this.rx += (this.mx - this.rx) * 0.18;
    this.ry += (this.my - this.ry) * 0.18;
    this.gx += (this.mx - this.gx) * 0.06;
    this.gy += (this.my - this.gy) * 0.06;
    this.ring.style.transform = `translate(${this.rx}px, ${this.ry}px)`;
    if (this.glow) this.glow.style.transform = `translate(${this.gx}px, ${this.gy}px) translate(-50%, -50%)`;
    requestAnimationFrame(this.tick);
  }
}

// ============================================================
// Magnetic buttons
// ============================================================
function magnetize(node, strength = 0.25) {
  let rect;
  node.addEventListener('pointerenter', () => { rect = node.getBoundingClientRect(); });
  node.addEventListener('pointermove', (e) => {
    if (!rect) rect = node.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    node.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });
  node.addEventListener('pointerleave', () => {
    node.style.transform = '';
    rect = null;
  });
}

// ============================================================
// Scroll reveals
// ============================================================
function setupReveals() {
  const items = $$('[data-reveal]');
  if (REDUCED_MOTION) {
    items.forEach(el => el.classList.add('is-revealed'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => obs.observe(el));
}

// ============================================================
// Counter animations
// ============================================================
const counterRegistry = new Map();
function setCounter(key, value) {
  counterRegistry.set(key, value);
  const els = $$(`[data-counter="${key}"]`);
  for (const el of els) {
    animateCounter(el, value);
  }
}

function animateCounter(node, target) {
  if (REDUCED_MOTION) {
    node.textContent = String(target);
    return;
  }
  const start = parseInt(node.textContent, 10) || 0;
  const duration = 1100;
  const startTime = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const v = Math.round(start + (target - start) * ease(t));
    node.textContent = String(v);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
// Typewriter for hero panel footer
// ============================================================
function typewriter(node, text, speed = 60) {
  if (REDUCED_MOTION) {
    node.textContent = text;
    return;
  }
  node.textContent = '';
  let i = 0;
  function step() {
    if (i < text.length) {
      node.textContent += text[i++];
      setTimeout(step, speed);
    }
  }
  setTimeout(step, 1500);
}

// ============================================================
// Constellation canvas (directory empty state)
// Floating nodes for each domain, connected by faint lines.
// Hovering a node brightens it.
// ============================================================
class Constellation {
  constructor(canvas, labels) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.labels = labels;
    this.nodes = [];
    this.pointer = { x: -1000, y: -1000 };
    this.t = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - rect.left;
      this.pointer.y = e.clientY - rect.top;
    });
    canvas.addEventListener('pointerleave', () => {
      this.pointer.x = -1000;
      this.pointer.y = -1000;
    });
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.w = rect.width;
    this.h = rect.height;
    this.ctx.scale(this.dpr, this.dpr);
    this.layoutNodes();
  }

  layoutNodes() {
    this.nodes = [];
    const n = this.labels.length;
    const cx = this.w / 2;
    const cy = this.h * 0.32;
    const radius = Math.min(this.w * 0.32, this.h * 0.28);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      this.nodes.push({
        baseX: cx + Math.cos(angle) * radius,
        baseY: cy + Math.sin(angle) * radius,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        phase: Math.random() * Math.PI * 2,
        amp: 4 + Math.random() * 4,
        label: this.labels[i],
      });
    }
  }

  tick(now) {
    this.t = now;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    const tt = now * 0.0009;
    for (const node of this.nodes) {
      node.x = node.baseX + Math.cos(tt + node.phase) * node.amp;
      node.y = node.baseY + Math.sin(tt + node.phase * 1.3) * node.amp;
    }

    // Draw connecting lines
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 280;
        if (dist > maxDist) continue;
        const alpha = (1 - dist / maxDist) * 0.25;

        // Pulse along line
        const pulse = (Math.sin(now * 0.001 + i * 0.7 + j * 0.3) + 1) * 0.5;
        ctx.strokeStyle = `rgba(169, 208, 255, ${alpha * (0.4 + pulse * 0.6)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Draw nodes + labels
    for (const node of this.nodes) {
      const dx = this.pointer.x - node.x;
      const dy = this.pointer.y - node.y;
      const distToPointer = Math.sqrt(dx * dx + dy * dy);
      const isHover = distToPointer < 60;
      const baseRadius = 5;
      const radius = isHover ? 9 : baseRadius;

      // Glow
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 24);
      glow.addColorStop(0, isHover ? 'rgba(244, 198, 3, 0.6)' : 'rgba(169, 208, 255, 0.3)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = isHover ? '#f4c603' : '#a9d0ff';
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.strokeStyle = isHover ? '#f4c603' : 'rgba(169, 208, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.font = isHover
        ? '500 12px JetBrains Mono, ui-monospace, monospace'
        : '400 11px JetBrains Mono, ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHover ? '#f4c603' : 'rgba(244, 246, 250, 0.6)';
      ctx.fillText(node.label.toUpperCase(), node.x, node.y + 18);
    }

    requestAnimationFrame(this.tick);
  }
}

// ============================================================
// Empty states
// ============================================================
function emptyState({ title, body, hint }) {
  const wrap = el('div', { class: 'empty' });
  wrap.appendChild(el('p', { class: 'empty__title' }, title));
  wrap.appendChild(el('p', { class: 'empty__body' }, body));
  if (hint) wrap.appendChild(el('p', { class: 'empty__hint' }, hint));
  return wrap;
}

function constellationEmptyState() {
  const wrap = el('div', { class: 'constellation' });
  const canvas = el('canvas', { class: 'constellation__canvas' });
  wrap.appendChild(canvas);
  const copy = el('div', { class: 'constellation__copy' });
  copy.appendChild(el('p', { class: 'constellation__title' }, 'Six domains, awaiting first skill registrations.'));
  copy.appendChild(el('p', { class: 'constellation__body' }, 'Skills will populate the directory as they ship. Hover the nodes above to see the domains we are mapping for.'));
  copy.appendChild(el('p', { class: 'constellation__hint' }, '// directory online / 0 skills indexed'));
  wrap.appendChild(copy);

  // Defer canvas init until DOM has size
  requestAnimationFrame(() => {
    const labels = Object.values(DOMAIN_CONFIG).map(d => d.label);
    new Constellation(canvas, labels);
  });

  return wrap;
}

// ============================================================
// Skills directory
// ============================================================
function renderSkills(skills) {
  const root = $('#directory-content');
  const filtersRoot = $('#directory-filters');
  root.innerHTML = '';
  filtersRoot.innerHTML = '';

  setCounter('skills-total', skills.length);
  setCounter('skills-live', skills.filter(s => s.status === 'live').length);
  setCounter('domain-count', Object.keys(DOMAIN_CONFIG).length);

  if (!skills.length) {
    filtersRoot.style.display = 'none';
    root.appendChild(constellationEmptyState());
    return;
  }
  filtersRoot.style.display = '';

  // Group skills by domain
  const byDomain = {};
  for (const skill of skills) {
    const d = skill.domain || 'internal-tools';
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push(skill);
  }

  // Filter chips
  const allChip = el('button', {
    class: 'filter-chip', type: 'button', 'aria-pressed': 'true', 'data-domain': 'all'
  });
  allChip.textContent = 'All';
  allChip.appendChild(el('span', { class: 'filter-chip__count' }, String(skills.length)));
  filtersRoot.appendChild(allChip);

  for (const key of Object.keys(DOMAIN_CONFIG)) {
    const items = byDomain[key];
    if (!items || !items.length) continue;
    const chip = el('button', {
      class: 'filter-chip', type: 'button', 'aria-pressed': 'false', 'data-domain': key
    });
    chip.textContent = DOMAIN_CONFIG[key].label;
    chip.appendChild(el('span', { class: 'filter-chip__count' }, String(items.length)));
    filtersRoot.appendChild(chip);
  }

  const groupsWrap = el('div');
  root.appendChild(groupsWrap);

  function renderGroups(activeDomain) {
    groupsWrap.innerHTML = '';
    const orderedKeys = Object.keys(DOMAIN_CONFIG).filter(k => byDomain[k] && byDomain[k].length);
    for (const k of Object.keys(byDomain)) {
      if (!orderedKeys.includes(k)) orderedKeys.push(k);
    }
    const keysToRender = activeDomain === 'all'
      ? orderedKeys
      : orderedKeys.filter(k => k === activeDomain);

    for (const domainKey of keysToRender) {
      const items = byDomain[domainKey];
      const label = (DOMAIN_CONFIG[domainKey] && DOMAIN_CONFIG[domainKey].label) || domainKey;
      const group = el('div', { class: 'domain-group' });
      const head = el('div', { class: 'domain-group__head' }, [
        el('h3', { class: 'domain-group__title', html: `${label}` }),
        el('span', { class: 'domain-group__count' }, `${items.length.toString().padStart(2, '0')} ${items.length === 1 ? 'skill' : 'skills'}`),
      ]);
      group.appendChild(head);
      const grid = el('div', { class: 'skill-grid' });
      for (const skill of items) grid.appendChild(renderSkillCard(skill));
      group.appendChild(grid);
      groupsWrap.appendChild(group);
    }
  }

  filtersRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-chip');
    if (!btn) return;
    for (const c of filtersRoot.querySelectorAll('.filter-chip')) {
      c.setAttribute('aria-pressed', c === btn ? 'true' : 'false');
    }
    renderGroups(btn.dataset.domain);
  });

  renderGroups('all');
}

function renderSkillCard(skill) {
  const status = (skill.status || 'live').toLowerCase();
  const card = el('article', { class: 'skill-card' });

  const head = el('div', { class: 'skill-card__head' }, [
    el('h4', { class: 'skill-card__name' }, skill.name || 'unnamed-skill'),
    el('span', { class: `badge badge--${status}` }, STATUS_LABELS[status] || status),
  ]);
  card.appendChild(head);

  if (skill.purpose) {
    card.appendChild(el('p', { class: 'skill-card__purpose' }, skill.purpose));
  }

  const triggers = Array.isArray(skill.trigger_phrases) ? skill.trigger_phrases.filter(Boolean) : [];
  if (triggers.length) {
    card.appendChild(el('p', { class: 'skill-card__triggers-label' }, '// trigger phrases'));
    const list = el('ul', { class: 'skill-card__triggers' });
    for (const t of triggers) list.appendChild(el('li', {}, `"${t}"`));
    card.appendChild(list);
  }

  const domainLabel = (DOMAIN_CONFIG[skill.domain] && DOMAIN_CONFIG[skill.domain].label) || skill.domain || '';
  const foot = el('div', { class: 'skill-card__foot' });
  foot.appendChild(el('span', {}, domainLabel));
  if (skill.added_date) foot.appendChild(el('span', {}, formatDate(skill.added_date)));
  card.appendChild(foot);

  return card;
}

// ============================================================
// Decision trees
// ============================================================
function renderDecisionTrees(trees) {
  const root = $('#decision-trees-content');
  root.innerHTML = '';

  if (!trees.length) {
    root.appendChild(emptyState({
      title: 'No comparisons published yet.',
      body: 'When two skills overlap, a short comparison will live here to settle which one to use.',
      hint: '// 0 comparisons indexed'
    }));
    return;
  }

  const wrap = el('div', { class: 'tree-list' });
  for (const tree of trees) {
    const details = el('details', { class: 'tree-card' });
    const summary = el('summary', { class: 'tree-card__summary' }, [
      tree.question || 'Untitled comparison',
      el('span', { class: 'tree-card__chevron', html:
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5l4 4 4-4"/></svg>'
      })
    ]);
    details.appendChild(summary);

    const body = el('div', { class: 'tree-card__body' });
    if (tree.context) body.appendChild(el('p', { style: 'color: var(--fg-2); margin: 16px 0 0; font-size: 15px; font-weight: 300;' }, tree.context));

    const options = Array.isArray(tree.options) ? tree.options : [];
    if (options.length) {
      const comp = el('div', { class: 'tree-comparison' });
      for (const opt of options) {
        const o = el('div', { class: 'tree-option' });
        o.appendChild(el('p', { class: 'tree-option__name' }, opt.skill || ''));
        o.appendChild(el('p', { class: 'tree-option__rule' }, opt.use_when || ''));
        comp.appendChild(o);
      }
      body.appendChild(comp);
    }
    details.appendChild(body);
    wrap.appendChild(details);
  }
  root.appendChild(wrap);
}

// ============================================================
// Roadmap
// ============================================================
function renderRoadmap(items) {
  const root = $('#roadmap-content');
  root.innerHTML = '';

  setCounter('roadmap-count', items.length);
  setCounter('roadmap-total', items.length);

  if (!items.length) {
    root.appendChild(emptyState({
      title: 'Roadmap is being shaped.',
      body: 'Skills in design, build, or testing will land here as they enter the pipeline.',
      hint: '// 0 in flight'
    }));
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const da = a.target_date || '9999-12-31';
    const db = b.target_date || '9999-12-31';
    return da.localeCompare(db);
  });

  const list = el('div', { class: 'roadmap-list' });
  for (const item of sorted) {
    const row = el('div', { class: 'roadmap-item' });
    row.appendChild(el('span', { class: 'roadmap-item__when' }, formatTargetDate(item.target_date)));
    const main = el('div', { class: 'roadmap-item__main' });
    main.appendChild(el('h3', {}, item.name || 'Unnamed'));
    const sub = [];
    if (item.category) sub.push(item.category);
    if (item.description) sub.push(item.description);
    if (sub.length) main.appendChild(el('p', {}, sub.join(' / ')));
    row.appendChild(main);

    const priority = (item.priority || 'medium').toLowerCase();
    row.appendChild(el('span', {
      class: `roadmap-item__priority roadmap-item__priority--${priority}`
    }, ROADMAP_PRIORITY_LABELS[priority] || priority));
    list.appendChild(row);
  }
  root.appendChild(list);
}

// ============================================================
// Changelog
// ============================================================
function renderChangelog(items) {
  const root = $('#changelog-content');
  root.innerHTML = '';

  if (!items.length) {
    root.appendChild(emptyState({
      title: 'No changes logged yet.',
      body: 'Library changes will appear here in reverse chronological order.',
      hint: '// log empty'
    }));
    return;
  }

  const sorted = [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const list = el('div', { class: 'changelog-list' });
  for (const item of sorted) {
    const type = (item.type || 'updated').toLowerCase();
    const row = el('div', { class: 'changelog-item' });
    row.appendChild(el('span', { class: 'changelog-item__date' }, formatDate(item.date)));
    row.appendChild(el('span', { class: `changelog-item__type changelog-item__type--${type}` }, CHANGELOG_TYPE_LABELS[type] || type));
    row.appendChild(el('span', { class: 'changelog-item__note' }, item.note || ''));
    list.appendChild(row);
  }
  root.appendChild(list);
}

// ============================================================
// Date formatting
// ============================================================
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTargetDate(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ============================================================
// Init
// ============================================================
async function init() {
  // Background atmosphere
  if (!REDUCED_MOTION) {
    const orbCanvas = $('#orb-canvas');
    if (orbCanvas) new OrbField(orbCanvas);
  }

  // Cursor
  if (FINE_POINTER && !REDUCED_MOTION) {
    document.body.classList.add('cursor-active');
    new Cursor();
  } else {
    $$('.cursor-dot, .cursor-ring').forEach(el => el.style.display = 'none');
  }

  // Magnetic CTAs
  if (FINE_POINTER && !REDUCED_MOTION) {
    $$('[data-magnetic]').forEach(node => magnetize(node, 0.22));
  }

  // Scroll reveals
  setupReveals();

  // Hero panel typewriter
  const tw = $('[data-typewriter]');
  if (tw) typewriter(tw, '// awaiting first skill registration_', 50);

  // Load data
  const [skills, trees, roadmap, changelog] = await Promise.all([
    loadJSON('skills.json'),
    loadJSON('decision-trees.json'),
    loadJSON('roadmap.json'),
    loadJSON('changelog.json'),
  ]);

  renderSkills(skills);
  renderDecisionTrees(trees);
  renderRoadmap(roadmap);
  renderChangelog(changelog);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

"use strict";

/* ============================================================
   Data loading
   ============================================================ */
const DATA = { sucos: null, posts: null, munis: null };

async function loadData() {
  const [sucos, posts, munis] = await Promise.all([
    fetch("data/sucos.geojson").then(r => r.json()),
    fetch("data/admin_posts.geojson").then(r => r.json()),
    fetch("data/municipalities.geojson").then(r => r.json()),
  ]);
  DATA.sucos = sucos.features;
  DATA.posts = posts.features;
  DATA.munis = munis.features;
}

/* ============================================================
   Small utilities
   ============================================================ */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function buildDisplayNames(features, disambigKey) {
  const byName = {};
  features.forEach(f => {
    (byName[f.properties.name] ??= []).push(f);
  });
  const map = {};
  for (const [name, list] of Object.entries(byName)) {
    if (list.length === 1) {
      map[list[0].properties.id] = name;
      continue;
    }
    list.forEach(f => {
      const extra = disambigKey ? f.properties[disambigKey] : null;
      map[f.properties.id] = extra ? `${name} (${extra})` : name;
    });
    const seen = {};
    list.forEach(f => { seen[map[f.properties.id]] = (seen[map[f.properties.id]] || 0) + 1; });
    list.forEach(f => {
      if (seen[map[f.properties.id]] > 1) {
        map[f.properties.id] = `${name} (${f.properties.muni_name}, ${f.properties.id})`;
      }
    });
  }
  return map;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ============================================================
   Shared map renderer (D3 geo, viewBox-scaled, zoom/pan)
   ============================================================ */
function renderMap({ svgEl, features, boundaryFeatures, fitFeatures, shapeClass, onClick }) {
  const W = 1000, H = 1000;
  const fitObj = { type: "FeatureCollection", features: fitFeatures || features };
  const projection = d3.geoMercator().fitSize([W, H], fitObj);
  const pathGen = d3.geoPath(projection);

  const svg = d3.select(svgEl)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  svg.selectAll("*").remove();

  const zoomLayer = svg.append("g").attr("class", "zoom-layer");
  const shapesLayer = zoomLayer.append("g").attr("class", "shapes-layer");

  shapesLayer.selectAll("path")
    .data(features, d => d.properties.id)
    .join("path")
    .attr("class", shapeClass || "suco-shape")
    .attr("data-id", d => d.properties.id)
    .attr("d", pathGen)
    .on("click", onClick || null);

  if (boundaryFeatures && boundaryFeatures.length) {
    zoomLayer.append("g").attr("class", "boundary-layer")
      .selectAll("path")
      .data(boundaryFeatures)
      .join("path")
      .attr("class", "boundary-line")
      .attr("d", pathGen);
  }

  const zoom = d3.zoom()
    .scaleExtent([1, 24])
    .translateExtent([[-W * 0.5, -H * 0.5], [W * 1.5, H * 1.5]])
    .on("zoom", (event) => zoomLayer.attr("transform", event.transform));
  svg.call(zoom);

  return { svg, zoom, shapesLayer, pathGen, projection };
}

function resetZoom(mapCtx) {
  mapCtx.svg.transition().duration(300).call(mapCtx.zoom.transform, d3.zoomIdentity);
}

/* ============================================================
   Municipality picker
   ============================================================ */
let pickerCtx = null;

function openPicker() {
  showScreen("screen-picker");
  const displayNames = buildDisplayNames(DATA.munis, null);
  const list = document.getElementById("picker-list");
  list.innerHTML = "";
  const sorted = [...DATA.munis].sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  sorted.forEach(f => {
    const btn = document.createElement("button");
    btn.className = "picker-list-item";
    btn.textContent = displayNames[f.properties.id];
    btn.dataset.id = f.properties.id;
    btn.addEventListener("click", () => startMunicipalityQuiz(f));
    btn.addEventListener("mouseenter", () => setMuniHover(f.properties.id, true));
    btn.addEventListener("mouseleave", () => setMuniHover(f.properties.id, false));
    list.appendChild(btn);
  });

  pickerCtx = renderMap({
    svgEl: document.getElementById("picker-map"),
    features: DATA.munis,
    shapeClass: "muni-shape",
    onClick: (event, d) => startMunicipalityQuiz(d),
  });

  pickerCtx.shapesLayer.selectAll("path")
    .append("title")
    .text(d => displayNames[d.properties.id]);

  pickerCtx.shapesLayer.selectAll("path")
    .on("mouseenter", (event, d) => setMuniHover(d.properties.id, true))
    .on("mouseleave", (event, d) => setMuniHover(d.properties.id, false));

  // label each municipality
  pickerCtx.shapesLayer.selectAll("path").each(function (d) {
    const [x, y] = pickerCtx.pathGen.centroid(d);
    if (isFinite(x) && isFinite(y)) {
      d3.select(this.parentNode).append("text")
        .attr("class", "muni-label")
        .attr("x", x).attr("y", y)
        .text(d.properties.name);
    }
  });
}

function setMuniHover(id, on) {
  document.querySelectorAll(`.picker-list-item[data-id="${id}"]`).forEach(el => el.classList.toggle("hover", on));
  document.querySelectorAll(`#picker-map path[data-id="${id}"]`).forEach(el => el.classList.toggle("hover", on));
}

function startMunicipalityQuiz(muniFeature) {
  const sucos = DATA.sucos.filter(f => f.properties.muni_id === muniFeature.properties.id);
  startQuiz({
    features: sucos,
    boundaryFeatures: [muniFeature],
    fitFeatures: [muniFeature],
    groupBy: { idKey: "post_id", nameKey: "post_name" },
    forceGroup: true,
    groupUnitLabel: "Admin Post",
    typePlaceholder: "Type a suco name…",
    contextKey: "post_name",
    contextLabel: "Admin Post",
    title: `${muniFeature.properties.name} sucos`,
  });
}

/* ============================================================
   Answer-mode toggle (click vs. type)
   ============================================================ */
let currentAnswerMode = localStorage.getItem("tlq_answerMode") || "click";

function setAnswerMode(mode) {
  currentAnswerMode = mode;
  localStorage.setItem("tlq_answerMode", mode);
  document.getElementById("toggle-click").classList.toggle("active", mode === "click");
  document.getElementById("toggle-type").classList.toggle("active", mode === "type");
}

/* ============================================================
   Name matching helpers (for type mode)
   ============================================================ */
function normalizeName(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-\u2013\u2014']/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Small edit-distance tolerance so close/alternate spellings (Vemasse/Vemase,
// Gariuai/Fariuai, Uatuhaco/Uataco, Uai-/Wai- variants, etc.) still count.
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function fuzzyThreshold(len) {
  if (len <= 7) return 1;
  if (len <= 11) return 2;
  return 3;
}

// A few sucos/admin posts carry an official dual name joined by "/"
// (e.g. "Barique/Natarbora", "Tapo/Memo") — either half is a fully
// correct answer on its own, not just a fuzzy near-miss.
const nameVariantsCache = {};
function nameVariants(id) {
  if (nameVariantsCache[id]) return nameVariantsCache[id];
  const raw = featuresById[id].properties.name;
  const parts = raw.includes("/") ? raw.split("/").map(p => p.trim()).filter(Boolean) : [];
  const variants = [...new Set([normalizeName(raw), ...parts.map(normalizeName)])];
  nameVariantsCache[id] = variants;
  return variants;
}

// Exact match only — used for live auto-accept while typing, where a
// still-incomplete word could otherwise look like a fuzzy match to some
// unrelated candidate before the player has finished typing it.
function exactMatchInGroup(normInput, ids) {
  return ids.find(id => nameVariants(id).includes(normInput)) || null;
}

// Exact match first; falls back to a fuzzy match against the given group's
// ids, but only when there's a single unambiguous closest candidate. Meant
// for deliberate submission (Enter), not live keystroke-by-keystroke input.
// Word spacing is stripped before the distance check so "Uai Oli" vs.
// "Uaiolo" is judged purely on spelling, not on where the gap falls.
function findMatchInGroup(normInput, ids) {
  const exact = exactMatchInGroup(normInput, ids);
  if (exact) return exact;
  const inputStripped = normInput.replace(/\s/g, "");
  let bestId = null, bestDist = Infinity, tieCount = 0;
  for (const id of ids) {
    let candidateBest = Infinity;
    for (const variant of nameVariants(id)) {
      const candStripped = variant.replace(/\s/g, "");
      const threshold = fuzzyThreshold(Math.max(inputStripped.length, candStripped.length));
      const dist = levenshteinDistance(inputStripped, candStripped);
      if (dist <= threshold && dist < candidateBest) candidateBest = dist;
    }
    if (candidateBest < Infinity) {
      if (candidateBest < bestDist) { bestDist = candidateBest; bestId = id; tieCount = 1; }
      else if (candidateBest === bestDist) tieCount++;
    }
  }
  return (bestId && tieCount === 1) ? bestId : null;
}

/* ============================================================
   Quiz engine
   ============================================================ *
   game.groupQueue: [{ label, total, ids: [...] }, ...]
     - front of the queue is the active group
     - flat (ungrouped) quizzes use a single group covering everything
   game.flatSkipStyle: true => Skip reveals just the current single
     target (old behavior). false => Skip defers the rest of the
     current group to the back of the queue (forced reveal if a
     deferred item is skipped a second time).
   ============================================================ */
let game = null; // active quiz state
let gameMapCtx = null;
let toastTimer = null;
let lastQuizConfig = null;
let featuresById = {};

function buildGroups(features, groupBy) {
  if (!groupBy) {
    return [{ label: null, total: features.length, ids: shuffle(features.map(f => f.properties.id)) }];
  }
  const byKey = {};
  features.forEach(f => {
    const key = f.properties[groupBy.idKey];
    const label = f.properties[groupBy.nameKey];
    (byKey[key] ??= { label, ids: [] }).ids.push(f.properties.id);
  });
  const groups = Object.values(byKey).map(g => ({ label: g.label, ids: shuffle(g.ids), total: g.ids.length }));
  return shuffle(groups);
}

// Builds the Jetpunk-style answers checklist: every target in the quiz,
// grouped and alphabetized for easy scanning, starting blank and filling
// in as each one is resolved (see fillAnswerRow).
function buildAnswersPanel(features, groupBy) {
  const panelEl = document.getElementById("answers-list");
  panelEl.innerHTML = "";

  let groups;
  if (groupBy) {
    const byKey = {};
    features.forEach(f => {
      const key = f.properties[groupBy.idKey];
      const label = f.properties[groupBy.nameKey];
      (byKey[key] ??= { label, items: [] }).items.push(f);
    });
    groups = Object.values(byKey);
    groups.forEach(g => g.items.sort((a, b) => a.properties.name.localeCompare(b.properties.name)));
    groups.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    groups = [{ label: null, items: [...features].sort((a, b) => a.properties.name.localeCompare(b.properties.name)) }];
  }

  groups.forEach(g => {
    const groupEl = document.createElement("div");
    groupEl.className = "answers-group";
    if (g.label) {
      const labelEl = document.createElement("div");
      labelEl.className = "answers-group-label";
      labelEl.textContent = g.label;
      groupEl.appendChild(labelEl);
    }
    const itemsEl = document.createElement("div");
    itemsEl.className = "answers-items";
    g.items.forEach(f => {
      const row = document.createElement("div");
      row.className = "answer-row";
      row.dataset.id = f.properties.id;
      itemsEl.appendChild(row);
    });
    groupEl.appendChild(itemsEl);
    panelEl.appendChild(groupEl);
  });
}

function fillAnswerRow(id, status) {
  const row = document.querySelector(`.answer-row[data-id="${id}"]`);
  if (!row) return;
  row.textContent = game.displayNames[id] || featuresById[id].properties.name;
  row.classList.add(status);
}

function startQuiz(config) {
  lastQuizConfig = config;
  const {
    features, boundaryFeatures, fitFeatures, groupBy, forceGroup, noGroup, groupUnitLabel, title,
    typePlaceholder, contextKey, contextLabel,
  } = config;
  const disambigKey = groupBy ? groupBy.nameKey : null;
  const displayNames = buildDisplayNames(features, disambigKey);
  featuresById = Object.fromEntries(features.map(f => [f.properties.id, f]));

  const useGrouping = !noGroup && (!!forceGroup || currentAnswerMode === "type");

  game = {
    title,
    total: features.length,
    groupQueue: useGrouping ? buildGroups(features, groupBy) : buildGroups(features, null),
    grouped: useGrouping,
    flatSkipStyle: !useGrouping,
    groupUnitLabel: groupUnitLabel || "group",
    typePlaceholder: typePlaceholder || "Type a name…",
    contextKey: contextKey || null,
    contextLabel: contextLabel || "",
    deferredIds: new Set(),
    foundIds: new Set(),
    missedIds: new Set(),
    missClicks: 0,
    displayNames,
    answerMode: currentAnswerMode,
    startTime: Date.now(),
    timerHandle: null,
    ended: false,
  };

  buildAnswersPanel(features, groupBy);
  showScreen("screen-game");

  gameMapCtx = renderMap({
    svgEl: document.getElementById("game-map"),
    features,
    boundaryFeatures,
    fitFeatures,
    shapeClass: "suco-shape",
    onClick: handleMapClick,
  });
  d3.select("#game-map").classed("type-mode", game.answerMode === "type");

  document.getElementById("stat-misses").textContent = "0 misses";
  document.getElementById("type-input").placeholder = game.typePlaceholder;
  updateProgressStat();
  refreshPromptDisplay();

  clearInterval(game.timerHandle);
  game.timerHandle = setInterval(updateTimerStat, 500);
  updateTimerStat();

  if (game.answerMode === "type") {
    document.getElementById("type-input").focus();
  }
}

function currentGroup() {
  return game.groupQueue[0];
}

function currentTargetId() {
  const grp = currentGroup();
  return grp ? grp.ids[0] : null;
}

function refreshPromptDisplay() {
  if (!game || game.ended) return;
  const grp = currentGroup();
  if (!grp) return;

  const promptClick = document.getElementById("prompt-click");
  const promptType = document.getElementById("prompt-type");
  const isType = game.answerMode === "type";
  promptClick.classList.toggle("visible", !isType);
  promptType.classList.toggle("visible", isType);

  const badge = document.getElementById("map-context-badge");
  if (isType) {
    const found = grp.total - grp.ids.length;
    const label = grp.label ? `${grp.label} — ${found}/${grp.total}` : `${found}/${grp.total}`;
    document.getElementById("group-label").textContent = label;
    const input = document.getElementById("type-input");
    input.value = "";
    input.focus();
    badge.classList.remove("visible");
  } else {
    const id = grp.ids[0];
    document.getElementById("prompt-name").textContent = game.displayNames[id] || "?";
    if (game.contextKey) {
      const ctx = featuresById[id].properties[game.contextKey];
      badge.innerHTML = `${game.contextLabel}: <strong></strong>`;
      badge.querySelector("strong").textContent = ctx;
      badge.classList.add("visible");
    } else {
      badge.classList.remove("visible");
    }
  }

  const skipBtn = document.getElementById("btn-skip");
  skipBtn.textContent = game.flatSkipStyle ? "Skip" : `Skip rest of ${game.groupUnitLabel}`;
}

function updateProgressStat() {
  document.getElementById("stat-progress").textContent = `${game.foundIds.size} / ${game.total}`;
}

function updateTimerStat() {
  if (!game) return;
  document.getElementById("stat-timer").textContent = formatTime(Date.now() - game.startTime);
}

function showToast(msg, kind) {
  const el = document.getElementById("toast");
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.className = `toast show ${kind === "good" ? "toast-good" : "toast-bad"}`;
  toastTimer = setTimeout(() => el.classList.remove("show"), 900);
}

function registerMiss() {
  game.missClicks++;
  document.getElementById("stat-misses").textContent = `${game.missClicks} ${game.missClicks === 1 ? "miss" : "misses"}`;
}

// Marks `id` as correctly found, removes it from the active group,
// and advances to the next group if the current one is now empty.
function markFound(id) {
  const el = document.querySelector(`#game-map path[data-id="${id}"]`);
  if (el) el.classList.add("found");
  game.foundIds.add(id);
  updateProgressStat();
  fillAnswerRow(id, "found");

  const grp = currentGroup();
  const idx = grp.ids.indexOf(id);
  if (idx !== -1) grp.ids.splice(idx, 1);

  if (grp.ids.length === 0) {
    const completedLabel = grp.label;
    game.groupQueue.shift();
    if (game.groupQueue.length === 0) {
      endQuiz();
      return;
    }
    if (game.grouped && completedLabel) {
      showToast(`${completedLabel} complete! Next: ${game.groupQueue[0].label}`, "good");
    } else {
      showToast(`Correct — ${game.displayNames[id]}`, "good");
    }
  } else {
    showToast(`Correct — ${game.displayNames[id]}`, "good");
  }
  refreshPromptDisplay();
}

function handleMapClick(event, d) {
  if (!game || game.ended || game.answerMode === "type") return;
  const id = d.properties.id;
  if (game.foundIds.has(id)) return; // already resolved, ignore

  const targetId = currentTargetId();
  const shapeEl = event.currentTarget;

  if (id === targetId) {
    shapeEl.classList.add("found");
    markFound(id);
  } else {
    game.missedIds.add(targetId);
    registerMiss();
    shapeEl.classList.add("wrong");
    setTimeout(() => shapeEl.classList.remove("wrong"), 350);
    showToast(`Not quite — try again`, "bad");
  }
}

function handleTypeSubmit() {
  const input = document.getElementById("type-input");
  const norm = normalizeName(input.value);
  if (!norm) return;
  const grp = currentGroup();
  const match = findMatchInGroup(norm, grp.ids);
  if (match) {
    markFound(match);
  } else {
    registerMiss();
    input.classList.add("wrong-flash");
    setTimeout(() => input.classList.remove("wrong-flash"), 300);
    input.value = "";
  }
}

function skipFlat() {
  const grp = currentGroup();
  const id = grp.ids.shift();
  if (id === undefined) return;
  game.missedIds.add(id);
  game.foundIds.add(id);
  const el = document.querySelector(`#game-map path[data-id="${id}"]`);
  if (el) el.classList.add("missed-reveal");
  fillAnswerRow(id, "missed");
  updateProgressStat();
  showToast(`Skipped — that was ${game.displayNames[id]}`, "bad");
  if (grp.ids.length === 0) {
    endQuiz();
  } else {
    refreshPromptDisplay();
  }
}

function skipGroup() {
  const grp = currentGroup();
  if (!grp || grp.ids.length === 0) return;
  const toDefer = [];
  grp.ids.forEach(id => {
    if (game.deferredIds.has(id)) {
      game.missedIds.add(id);
      game.foundIds.add(id);
      const el = document.querySelector(`#game-map path[data-id="${id}"]`);
      if (el) el.classList.add("missed-reveal");
      fillAnswerRow(id, "missed");
    } else {
      game.deferredIds.add(id);
      toDefer.push(id);
    }
  });
  const label = grp.label;
  game.groupQueue.shift();
  if (toDefer.length > 0) {
    game.groupQueue.push({ label, ids: shuffle(toDefer), total: toDefer.length });
  }
  updateProgressStat();
  showToast(`Skipped rest of ${label} — saved for later`, "bad");
  if (game.groupQueue.length === 0) {
    endQuiz();
  } else {
    refreshPromptDisplay();
  }
}

function skipCurrent() {
  if (!game || game.ended) return;
  if (game.flatSkipStyle) {
    skipFlat();
  } else {
    skipGroup();
  }
}

function giveUp() {
  if (!game || game.ended) return;
  game.groupQueue.forEach(grp => {
    grp.ids.forEach(id => {
      game.missedIds.add(id);
      game.foundIds.add(id);
      const el = document.querySelector(`#game-map path[data-id="${id}"]`);
      if (el) el.classList.add("missed-reveal");
      fillAnswerRow(id, "missed");
    });
  });
  game.groupQueue = [];
  updateProgressStat();
  endQuiz();
}

function pbStorageKey(title, answerMode) {
  return `tlq_pb_${title}_${answerMode}`;
}

function loadPB(title, answerMode) {
  try {
    return JSON.parse(localStorage.getItem(pbStorageKey(title, answerMode)));
  } catch {
    return null;
  }
}

function maybeSavePB(title, answerMode, run) {
  const existing = loadPB(title, answerMode);
  const better = !existing || run.accuracy > existing.accuracy ||
    (run.accuracy === existing.accuracy && run.timeMs < existing.timeMs);
  if (better) localStorage.setItem(pbStorageKey(title, answerMode), JSON.stringify(run));
  return { better, best: better ? run : existing };
}

function endQuiz() {
  game.ended = true;
  clearInterval(game.timerHandle);
  const elapsed = Date.now() - game.startTime;
  const correctCount = game.total - game.missedIds.size;
  const accuracy = Math.round((correctCount / game.total) * 100);

  document.getElementById("end-title").textContent = game.title ? `${game.title} — complete!` : "Quiz complete!";
  document.getElementById("end-found").textContent = `${correctCount} / ${game.total}`;
  document.getElementById("end-accuracy").textContent = `${accuracy}%`;
  document.getElementById("end-time").textContent = formatTime(elapsed);

  const { better, best } = maybeSavePB(game.title, game.answerMode, { accuracy, timeMs: elapsed, date: Date.now() });
  const pbEl = document.getElementById("end-personal-best");
  if (better) {
    pbEl.innerHTML = `<span class="pb-new">🏆 New personal best!</span> ${best.accuracy}% in ${formatTime(best.timeMs)}`;
  } else {
    pbEl.textContent = `Personal best: ${best.accuracy}% in ${formatTime(best.timeMs)}`;
  }

  const list = document.getElementById("end-missed-list");
  list.innerHTML = "";
  list.classList.toggle("empty", game.missedIds.size === 0);
  [...game.missedIds]
    .map(id => game.displayNames[id])
    .sort((a, b) => a.localeCompare(b))
    .forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      list.appendChild(li);
    });
  document.getElementById("end-missed-count").textContent = game.missedIds.size;

  setupLeaderboardSubmit(game.title, game.answerMode, accuracy, elapsed);

  showScreen("screen-end");
}

function quitGame() {
  if (game) clearInterval(game.timerHandle);
  game = null;
  showScreen("screen-home");
}

function setupLeaderboardSubmit(title, answerMode, accuracy, timeMs) {
  const submitWrap = document.getElementById("end-leaderboard-submit");
  const nameInput = document.getElementById("end-name-input");
  const btn = document.getElementById("btn-submit-score");
  const status = document.getElementById("end-submit-status");
  status.textContent = "";
  status.className = "end-submit-status";

  if (!Leaderboard.isAvailable()) {
    submitWrap.style.display = "none";
    return;
  }
  submitWrap.style.display = "";
  btn.disabled = false;
  nameInput.value = localStorage.getItem("tlq_playerName") || "";

  btn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      status.textContent = "Enter a name first";
      status.className = "end-submit-status err";
      return;
    }
    btn.disabled = true;
    status.textContent = "Submitting…";
    localStorage.setItem("tlq_playerName", name);
    const res = await Leaderboard.submitScore({
      name, modeKey: title, answerMode, accuracy, timeMs,
      found: game.total - game.missedIds.size, total: game.total,
    });
    if (res.ok) {
      status.textContent = "✓ Submitted!";
      status.className = "end-submit-status ok";
    } else {
      status.textContent = "Couldn't submit — try again";
      status.className = "end-submit-status err";
      btn.disabled = false;
    }
  };
}

/* ============================================================
   Leaderboard screen
   ============================================================ */
let leaderboardAnswerMode = "click";

function populateLeaderboardModeSelect() {
  const select = document.getElementById("leaderboard-mode-select");
  select.innerHTML = "";
  const fixed = ["Municipalities", "Whole Country", "Administrative Posts"];
  const muniTitles = [...DATA.munis]
    .map(f => `${f.properties.name} sucos`)
    .sort((a, b) => a.localeCompare(b));
  [...fixed, ...muniTitles].forEach(title => {
    const opt = document.createElement("option");
    opt.value = title;
    opt.textContent = title;
    select.appendChild(opt);
  });
}

function setLeaderboardAnswerMode(mode) {
  leaderboardAnswerMode = mode;
  document.querySelectorAll("#leaderboard-answer-toggle .toggle-opt").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  loadLeaderboardList();
}

function openLeaderboardScreen(prefillKey, prefillMode) {
  showScreen("screen-leaderboard");
  const select = document.getElementById("leaderboard-mode-select");
  if (prefillKey) select.value = prefillKey;
  setLeaderboardAnswerMode(prefillMode || leaderboardAnswerMode);
}

async function loadLeaderboardList() {
  const listEl = document.getElementById("leaderboard-list");
  const emptyEl = document.getElementById("leaderboard-empty");
  const unavailableEl = document.getElementById("leaderboard-unavailable");
  listEl.innerHTML = "";
  emptyEl.classList.remove("visible");
  unavailableEl.classList.remove("visible");

  if (!Leaderboard.isAvailable()) {
    unavailableEl.classList.add("visible");
    return;
  }

  const modeKey = document.getElementById("leaderboard-mode-select").value;
  const rows = await Leaderboard.fetchScores(modeKey, leaderboardAnswerMode, 20);
  if (!rows.length) {
    emptyEl.classList.add("visible");
    return;
  }
  rows.forEach((r, i) => {
    const li = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "lb-rank";
    rank.textContent = `${i + 1}`;
    const name = document.createElement("span");
    name.className = "lb-name";
    name.textContent = r.name;
    const acc = document.createElement("span");
    acc.className = "lb-accuracy";
    acc.textContent = `${r.accuracy}%`;
    const time = document.createElement("span");
    time.className = "lb-time";
    time.textContent = formatTime(r.timeMs);
    li.append(rank, name, acc, time);
    listEl.appendChild(li);
  });
}

/* ============================================================
   Color scheme (light / dark) toggle
   ============================================================ */
function setColorScheme(mode) {
  if (mode === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("tlq_colorScheme", mode);
  document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
    btn.textContent = mode === "dark" ? "☀ Light" : "🌙 Dark";
  });
}

/* ============================================================
   Wiring
   ============================================================ */
function wireUI() {
  setAnswerMode(currentAnswerMode);
  document.getElementById("toggle-click").addEventListener("click", () => setAnswerMode("click"));
  document.getElementById("toggle-type").addEventListener("click", () => setAnswerMode("type"));

  setColorScheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  document.querySelectorAll(".theme-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setColorScheme(current === "dark" ? "light" : "dark");
    });
  });

  document.getElementById("btn-easy").addEventListener("click", () => {
    startQuiz({
      features: DATA.munis,
      noGroup: true,
      typePlaceholder: "Type a municipality…",
      title: "Municipalities",
    });
  });

  document.getElementById("btn-country").addEventListener("click", () => {
    startQuiz({
      features: DATA.sucos,
      boundaryFeatures: DATA.munis,
      groupBy: { idKey: "post_id", nameKey: "post_name" },
      forceGroup: false,
      groupUnitLabel: "Admin Post",
      typePlaceholder: "Type a suco name…",
      contextKey: "post_name",
      contextLabel: "Admin Post",
      title: "Whole Country",
    });
  });

  document.getElementById("btn-posts").addEventListener("click", () => {
    startQuiz({
      features: DATA.posts,
      boundaryFeatures: DATA.munis,
      groupBy: { idKey: "muni_id", nameKey: "muni_name" },
      forceGroup: false,
      groupUnitLabel: "Municipality",
      typePlaceholder: "Type an administrative post…",
      contextKey: "muni_name",
      contextLabel: "Municipality",
      title: "Administrative Posts",
    });
  });

  document.getElementById("btn-muni-picker").addEventListener("click", openPicker);
  document.getElementById("btn-picker-back").addEventListener("click", () => showScreen("screen-home"));

  document.getElementById("btn-skip").addEventListener("click", skipCurrent);
  document.getElementById("btn-give-up").addEventListener("click", giveUp);
  document.getElementById("btn-zoom-reset").addEventListener("click", () => gameMapCtx && resetZoom(gameMapCtx));
  document.getElementById("btn-game-quit").addEventListener("click", quitGame);

  const typeInput = document.getElementById("type-input");
  typeInput.addEventListener("input", () => {
    if (!game || game.ended || game.answerMode !== "type") return;
    const norm = normalizeName(typeInput.value);
    if (!norm) return;
    const grp = currentGroup();
    const match = exactMatchInGroup(norm, grp.ids);
    if (match) markFound(match);
  });
  typeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      handleTypeSubmit();
    }
  });

  document.getElementById("btn-play-again").addEventListener("click", () => {
    if (!lastQuizConfig) return showScreen("screen-home");
    startQuiz(lastQuizConfig);
  });
  document.getElementById("btn-end-home").addEventListener("click", () => showScreen("screen-home"));

  document.getElementById("btn-open-leaderboard").addEventListener("click", () => openLeaderboardScreen());
  document.getElementById("btn-view-leaderboard").addEventListener("click", () => {
    openLeaderboardScreen(game ? game.title : null, game ? game.answerMode : null);
  });
  document.getElementById("btn-leaderboard-back").addEventListener("click", () => showScreen("screen-home"));
  document.getElementById("leaderboard-mode-select").addEventListener("change", loadLeaderboardList);
  document.querySelectorAll("#leaderboard-answer-toggle .toggle-opt").forEach(btn => {
    btn.addEventListener("click", () => setLeaderboardAnswerMode(btn.dataset.mode));
  });
}

(async function init() {
  await loadData();
  populateLeaderboardModeSelect();
  wireUI();
})();

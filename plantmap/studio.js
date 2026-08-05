(() => {
  'use strict';

  const TYPES = [
    { id: 'canopy', color: '#2F6B45', fill: 'rgba(47,107,69,.45)', zh: '乔木冠层', en: 'Canopy', zhHint: '遮阴 / 主景树群', enHint: 'Shade / feature mass' },
    { id: 'shrub', color: '#5B8F5A', fill: 'rgba(91,143,90,.45)', zh: '灌木下层', en: 'Shrub', zhHint: '屏障 / 围合', enHint: 'Buffer / enclosure' },
    { id: 'ground', color: '#8FBF7A', fill: 'rgba(143,191,122,.42)', zh: '地被', en: 'Groundcover', zhHint: '林下覆盖', enHint: 'Understory cover' },
    { id: 'lawn', color: '#C5D96A', fill: 'rgba(197,217,106,.42)', zh: '草坪开敞', en: 'Lawn / open', zhHint: '活动与留白', enHint: 'Program / void' },
    { id: 'edge', color: '#3D8B8B', fill: 'rgba(61,139,139,.42)', zh: '水边湿地', en: 'Edge / wetland', zhHint: '驳岸 / 雨水', enHint: 'Water / ecology' },
    { id: 'keep', color: '#8A7A4B', fill: 'rgba(138,122,75,.18)', zh: '保留现状', en: 'Existing keep', zhHint: '现有植被保留', enHint: 'Retain on site', dashed: true }
  ];

  const I18N = {
    zh: {
      base: '底图', upload: '上传场地底图', clearBase: '清除底图',
      tools: '工具', draw: '绘制分区', select: '选择', pan: '平移',
      drawHint: '单击加点，双击或 Enter 闭合多边形，Esc 取消。选中后可一键圆角。',
      legend: '种植图例', note: '概念备注',
      notePh: '例如：南侧密植乔木遮阴；中部草坪保持开敞。',
      zones: '分区列表', deleteZone: '删除选中分区',
      roundZone: '一键圆角', sharpZone: '取消圆角',
      emptyTitle: '先放一张场地底图', emptyBody: '上传总平或截图，然后在上面画种植概念区。',
      ready: '就绪', drawing: '绘制中…', selected: '已选中',
      saved: '项目已保存', exported: 'PNG 已导出', imported: '项目已导入',
      needPoly: '至少需要 3 个点', deleted: '分区已删除',
      needSelect: '请先选中一个分区', rounded: '已圆角', sharpened: '已取消圆角'
    },
    en: {
      base: 'Base plan', upload: 'Upload site plan', clearBase: 'Clear base',
      tools: 'Tools', draw: 'Draw zone', select: 'Select', pan: 'Pan',
      drawHint: 'Click to add points. Double-click or Enter to close. Esc cancels. Select a zone to round corners.',
      legend: 'Planting legend', note: 'Concept note',
      notePh: 'e.g. Dense canopy on the south edge; lawn kept open in the center.',
      zones: 'Zones', deleteZone: 'Delete selected',
      roundZone: 'Round corners', sharpZone: 'Sharp corners',
      emptyTitle: 'Drop a site plan to start', emptyBody: 'Upload a plan image, then paint planting concept zones.',
      ready: 'Ready', drawing: 'Drawing…', selected: 'Selected',
      saved: 'Project saved', exported: 'PNG exported', imported: 'Project imported',
      needPoly: 'Need at least 3 points', deleted: 'Zone deleted',
      needSelect: 'Select a zone first', rounded: 'Corners rounded', sharpened: 'Corners sharpened'
    }
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  let lang = localStorage.getItem('pm_lang') || 'zh';
  let tool = 'draw';
  let activeType = 'canopy';
  let baseImage = null;
  let baseDataUrl = '';
  let zones = [];
  let selectedId = null;
  let draft = [];
  let view = { x: 0, y: 0, scale: 1 };
  let panning = false;
  let panStart = null;
  let spacePan = false;

  const canvas = $('#board');
  const ctx = canvas.getContext('2d');
  const wrap = $('#canvasWrap');

  function t(key) { return (I18N[lang] || I18N.zh)[key] || key; }
  function typeMeta(id) { return TYPES.find((x) => x.id === id) || TYPES[0]; }
  function uid() { return `z_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`; }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.remove('on'), 1800);
  }

  function applyLang() {
    $$('[data-i]').forEach((node) => {
      const key = node.getAttribute('data-i');
      if (I18N[lang][key] != null) node.textContent = I18N[lang][key];
    });
    const note = $('#note');
    note.placeholder = t('notePh');
    $('#langBtn').textContent = lang === 'zh' ? 'EN' : '中文';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('pm_lang', lang);
    renderLegend();
    renderZoneList();
    setStatus(t('ready'));
  }

  function setStatus(text) {
    $('#statusText').textContent = text;
    $('#zoomText').textContent = `${Math.round(view.scale * 100)}%`;
  }

  function renderLegend() {
    $('#legend').innerHTML = TYPES.map((type) => {
      const label = lang === 'zh' ? type.zh : type.en;
      const hint = lang === 'zh' ? type.zhHint : type.enHint;
      return `<button type="button" class="legend-item ${type.id} ${activeType === type.id ? 'on' : ''}" data-type="${type.id}">
        <span class="legend-swatch" style="background:${type.color}"></span>
        <span><b>${label}</b><small>${hint}</small></span>
      </button>`;
    }).join('');
    $$('.legend-item').forEach((btn) => {
      btn.onclick = () => {
        activeType = btn.dataset.type;
        tool = 'draw';
        syncTools();
        renderLegend();
      };
    });
  }

  function renderZoneList() {
    const list = $('#zoneList');
    if (!zones.length) {
      list.innerHTML = `<div class="zone-row"><b>${lang === 'zh' ? '暂无分区' : 'No zones yet'}</b></div>`;
      return;
    }
    list.innerHTML = zones.map((z, i) => {
      const meta = typeMeta(z.type);
      const label = lang === 'zh' ? meta.zh : meta.en;
      const r = Number(z.cornerRadius) || 0;
      const tip = r > 0
        ? (lang === 'zh' ? `圆角 ${Math.round(r)}` : `R${Math.round(r)}`)
        : `${z.points.length} pts`;
      return `<div class="zone-row ${selectedId === z.id ? 'on' : ''}" data-id="${z.id}">
        <b>${i + 1}. ${label}</b><span>${tip}</span>
      </div>`;
    }).join('');
    $$('.zone-row[data-id]').forEach((row) => {
      row.onclick = () => {
        selectedId = row.dataset.id;
        tool = 'select';
        syncTools();
        renderZoneList();
        draw();
        setStatus(t('selected'));
      };
    });
  }

  function syncTools() {
    $$('.tool').forEach((btn) => btn.classList.toggle('on', btn.dataset.tool === tool));
    canvas.classList.toggle('pan', tool === 'pan' || spacePan);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - view.x) / view.scale,
      y: (sy - view.y) / view.scale
    };
  }

  function fitBase() {
    if (!baseImage) return;
    const rect = wrap.getBoundingClientRect();
    const pad = 48;
    const scale = Math.min(
      (rect.width - pad * 2) / baseImage.width,
      (rect.height - pad * 2) / baseImage.height
    );
    view.scale = Math.max(0.1, scale);
    view.x = (rect.width - baseImage.width * view.scale) / 2;
    view.y = (rect.height - baseImage.height * view.scale) / 2;
  }

  function drawPolygonPath(targetCtx, points, close = true) {
    if (!points.length) return;
    targetCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) targetCtx.lineTo(points[i].x, points[i].y);
    if (close && points.length > 2) targetCtx.closePath();
  }

  /** Rounded closed polygon via quadratic curves at each vertex. */
  function drawRoundedPolygonPath(targetCtx, points, radius) {
    const n = points.length;
    if (n < 3) {
      drawPolygonPath(targetCtx, points, true);
      return;
    }
    const rWant = Math.max(0, Number(radius) || 0);
    if (rWant <= 0) {
      drawPolygonPath(targetCtx, points, true);
      return;
    }

    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const d2 = Math.hypot(next.x - curr.x, next.y - curr.y);
      if (d1 < 1e-6 || d2 < 1e-6) continue;
      const r = Math.min(rWant, d1 * 0.45, d2 * 0.45);
      const p1 = {
        x: curr.x - ((curr.x - prev.x) / d1) * r,
        y: curr.y - ((curr.y - prev.y) / d1) * r
      };
      const p2 = {
        x: curr.x + ((next.x - curr.x) / d2) * r,
        y: curr.y + ((next.y - curr.y) / d2) * r
      };
      if (i === 0) targetCtx.moveTo(p1.x, p1.y);
      else targetCtx.lineTo(p1.x, p1.y);
      targetCtx.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y);
    }
    targetCtx.closePath();
  }

  function zonePath(targetCtx, zone) {
    const r = Number(zone.cornerRadius) || 0;
    if (r > 0) drawRoundedPolygonPath(targetCtx, zone.points, r);
    else drawPolygonPath(targetCtx, zone.points, true);
  }

  /** Sensible default radius from average edge length (planting-bed look). */
  function autoCornerRadius(points) {
    if (!points || points.length < 3) return 0;
    let sum = 0;
    let minEdge = Infinity;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      sum += len;
      if (len > 0) minEdge = Math.min(minEdge, len);
    }
    const avg = sum / points.length;
    if (!Number.isFinite(minEdge) || minEdge <= 0) return Math.max(12, avg * 0.18);
    return Math.max(8, Math.min(avg * 0.22, minEdge * 0.42));
  }

  function getSelectedZone() {
    return zones.find((z) => z.id === selectedId) || null;
  }

  function roundSelectedZone() {
    const z = getSelectedZone();
    if (!z) {
      toast(t('needSelect'));
      return;
    }
    const next = autoCornerRadius(z.points);
    // Re-click cycles: soft → softer → soft again
    const cur = Number(z.cornerRadius) || 0;
    if (cur > 0 && Math.abs(cur - next) < 1) {
      z.cornerRadius = next * 1.55;
    } else if (cur > next * 1.3) {
      z.cornerRadius = next;
    } else {
      z.cornerRadius = next;
    }
    renderZoneList();
    persist();
    draw();
    toast(t('rounded'));
  }

  function sharpenSelectedZone() {
    const z = getSelectedZone();
    if (!z) {
      toast(t('needSelect'));
      return;
    }
    z.cornerRadius = 0;
    renderZoneList();
    persist();
    draw();
    toast(t('sharpened'));
  }

  function draw() {
    const rect = wrap.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    if (baseImage) {
      ctx.drawImage(baseImage, 0, 0);
    }

    zones.forEach((z) => {
      const meta = typeMeta(z.type);
      ctx.beginPath();
      zonePath(ctx, z);
      ctx.fillStyle = meta.fill;
      ctx.fill();
      ctx.lineWidth = (selectedId === z.id ? 2.5 : 1.5) / view.scale;
      ctx.strokeStyle = meta.color;
      if (meta.dashed) ctx.setLineDash([8 / view.scale, 6 / view.scale]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);

      const c = centroid(z.points);
      if (c) {
        ctx.fillStyle = 'rgba(15,15,14,.78)';
        const label = lang === 'zh' ? meta.zh : meta.en;
        ctx.font = `${12 / view.scale}px "Space Mono", monospace`;
        ctx.fillText(label, c.x + 4 / view.scale, c.y);
      }
    });

    if (draft.length) {
      const meta = typeMeta(activeType);
      ctx.beginPath();
      drawPolygonPath(ctx, draft, false);
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 1.8 / view.scale;
      ctx.setLineDash([6 / view.scale, 5 / view.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      draft.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5 / view.scale, 0, Math.PI * 2);
        ctx.fillStyle = meta.color;
        ctx.fill();
      });
    }

    ctx.restore();
    $('#emptyState').classList.toggle('hidden', Boolean(baseImage) || zones.length > 0);
  }

  function centroid(points) {
    if (!points.length) return null;
    let x = 0; let y = 0;
    points.forEach((p) => { x += p.x; y += p.y; });
    return { x: x / points.length, y: y / points.length };
  }

  function pointInPoly(point, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x; const yi = vs[i].y;
      const xj = vs[j].x; const yj = vs[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function closeDraft() {
    if (draft.length < 3) {
      toast(t('needPoly'));
      return;
    }
    zones.push({ id: uid(), type: activeType, points: draft.slice(), cornerRadius: 0 });
    draft = [];
    selectedId = zones[zones.length - 1].id;
    renderZoneList();
    persist();
    draw();
    setStatus(t('ready'));
  }

  function persist() {
    const payload = {
      schema: 'plantmap.project.v1',
      name: $('#projectName').value.trim() || 'Untitled Planting Board',
      note: $('#note').value,
      baseDataUrl,
      zones,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('pm_project_v1', JSON.stringify(payload));
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem('pm_project_v1');
      if (!raw) return;
      const data = JSON.parse(raw);
      applyProject(data, false);
    } catch (_) { /* ignore */ }
  }

  function applyProject(data, announce) {
    $('#projectName').value = data.name || 'Untitled Planting Board';
    $('#note').value = data.note || '';
    zones = (Array.isArray(data.zones) ? data.zones : []).map((z) => ({
      ...z,
      cornerRadius: Number(z.cornerRadius) || 0,
      points: Array.isArray(z.points) ? z.points : []
    }));
    selectedId = null;
    draft = [];
    baseDataUrl = data.baseDataUrl || '';
    if (baseDataUrl) {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        fitBase();
        renderZoneList();
        draw();
        if (announce) toast(t('imported'));
      };
      img.src = baseDataUrl;
    } else {
      baseImage = null;
      renderZoneList();
      draw();
      if (announce) toast(t('imported'));
    }
  }

  function exportPng() {
    const exportCanvas = document.createElement('canvas');
    const legendW = 280;
    const pad = 32;
    const contentW = baseImage ? baseImage.width : 1600;
    const contentH = baseImage ? baseImage.height : 1000;
    exportCanvas.width = contentW + legendW + pad * 2;
    exportCanvas.height = Math.max(contentH + pad * 2, 720);
    const ex = exportCanvas.getContext('2d');

    ex.fillStyle = '#F7F4EE';
    ex.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    ex.save();
    ex.translate(pad, pad);
    if (baseImage) ex.drawImage(baseImage, 0, 0);
    else {
      ex.fillStyle = '#E8E2D8';
      ex.fillRect(0, 0, contentW, contentH);
    }
    zones.forEach((z) => {
      const meta = typeMeta(z.type);
      ex.beginPath();
      zonePath(ex, z);
      ex.fillStyle = meta.fill;
      ex.fill();
      ex.strokeStyle = meta.color;
      ex.lineWidth = 2;
      if (meta.dashed) ex.setLineDash([8, 6]);
      else ex.setLineDash([]);
      ex.stroke();
      ex.setLineDash([]);
    });
    ex.restore();

    const lx = contentW + pad + 18;
    let ly = pad;
    ex.fillStyle = '#1B1C1E';
    ex.font = '700 22px Archivo, sans-serif';
    ex.fillText($('#projectName').value || 'Planting Concept', lx, ly + 24);
    ly += 48;
    ex.fillStyle = '#7A756C';
    ex.font = '700 11px "Space Mono", monospace';
    ex.fillText('PLANTING CONCEPT LAYOUT', lx, ly);
    ly += 28;

    TYPES.forEach((type) => {
      ex.fillStyle = type.dashed ? 'transparent' : type.color;
      ex.strokeStyle = type.color;
      ex.lineWidth = 2;
      if (type.dashed) ex.setLineDash([5, 4]);
      else ex.setLineDash([]);
      ex.fillRect(lx, ly, 18, 18);
      ex.strokeRect(lx, ly, 18, 18);
      ex.setLineDash([]);
      ex.fillStyle = '#1B1C1E';
      ex.font = '600 14px Archivo, sans-serif';
      ex.fillText(lang === 'zh' ? type.zh : type.en, lx + 28, ly + 14);
      ly += 30;
    });

    ly += 12;
    ex.fillStyle = '#7A756C';
    ex.font = '700 10px "Space Mono", monospace';
    ex.fillText(lang === 'zh' ? '概念备注' : 'CONCEPT NOTE', lx, ly);
    ly += 18;
    ex.fillStyle = '#1B1C1E';
    ex.font = '500 13px Archivo, sans-serif';
    wrapText(ex, $('#note').value || '—', lx, ly, legendW - 36, 18);

    const a = document.createElement('a');
    a.download = `${($('#projectName').value || 'planting-concept').replace(/[^\w\-]+/g, '_')}.png`;
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
    toast(t('exported'));
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '';
    let yy = y;
    const chars = lang === 'zh' ? String(text).split('') : words;
    const joiner = lang === 'zh' ? '' : ' ';
    chars.forEach((word, idx) => {
      const test = line ? line + joiner + word : word;
      if (context.measureText(test).width > maxWidth && line) {
        context.fillText(line, x, yy);
        line = word;
        yy += lineHeight;
      } else line = test;
      if (idx === chars.length - 1) context.fillText(line, x, yy);
    });
  }

  function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (tool === 'pan' || spacePan || e.button === 1) {
      panning = true;
      panStart = { x: sx, y: sy, vx: view.x, vy: view.y };
      canvas.classList.add('panning');
      return;
    }

    if (tool === 'select') {
      let hit = null;
      for (let i = zones.length - 1; i >= 0; i--) {
        if (pointInPoly(world, zones[i].points)) { hit = zones[i].id; break; }
      }
      selectedId = hit;
      renderZoneList();
      draw();
      setStatus(hit ? t('selected') : t('ready'));
      return;
    }

    if (tool === 'draw') {
      draft.push(world);
      setStatus(t('drawing'));
      draw();
    }
  }

  function onPointerMove(e) {
    if (!panning || !panStart) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    view.x = panStart.vx + (sx - panStart.x);
    view.y = panStart.vy + (sy - panStart.y);
    draw();
  }

  function onPointerUp() {
    panning = false;
    panStart = null;
    canvas.classList.remove('panning');
  }

  function onDblClick() {
    if (tool === 'draw' && draft.length) closeDraft();
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const before = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    view.scale = Math.min(6, Math.max(0.15, view.scale * factor));
    view.x = sx - before.x * view.scale;
    view.y = sy - before.y * view.scale;
    setStatus(t('ready'));
    draw();
  }

  // Events
  $$('.tool').forEach((btn) => {
    btn.onclick = () => {
      tool = btn.dataset.tool;
      syncTools();
    };
  });

  $('#langBtn').onclick = () => {
    lang = lang === 'zh' ? 'en' : 'zh';
    applyLang();
    draw();
  };

  $('#uploadBtn').onclick = () => $('#baseFile').click();
  $('#baseFile').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        baseDataUrl = String(reader.result);
        fitBase();
        persist();
        draw();
        toast(lang === 'zh' ? '底图已加载' : 'Base loaded');
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  $('#clearBaseBtn').onclick = () => {
    baseImage = null;
    baseDataUrl = '';
    persist();
    draw();
  };

  $('#deleteZoneBtn').onclick = () => {
    if (!selectedId) return;
    zones = zones.filter((z) => z.id !== selectedId);
    selectedId = null;
    renderZoneList();
    persist();
    draw();
    toast(t('deleted'));
  };

  $('#roundZoneBtn').onclick = roundSelectedZone;
  $('#sharpZoneBtn').onclick = sharpenSelectedZone;

  $('#note').addEventListener('change', persist);
  $('#projectName').addEventListener('change', persist);

  $('#exportJsonBtn').onclick = () => {
    persist();
    const raw = localStorage.getItem('pm_project_v1');
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${($('#projectName').value || 'plantmap').replace(/[^\w\-]+/g, '_')}.json`;
    a.click();
    toast(t('saved'));
  };

  $('#importJsonBtn').onclick = () => $('#importJsonFile').click();
  $('#importJsonFile').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      applyProject(data.project || data, true);
      persist();
    } catch (_) {
      toast(lang === 'zh' ? '文件无效' : 'Invalid file');
    }
    e.target.value = '';
  };

  $('#exportPngBtn').onclick = exportPng;

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('dblclick', onDblClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { spacePan = true; syncTools(); }
    if (e.key === 'Enter' && tool === 'draw') closeDraft();
    if (e.key === 'Escape') { draft = []; draw(); setStatus(t('ready')); }
    if ((e.key === 'Backspace' || e.key === 'Delete') && selectedId && tool === 'select') {
      $('#deleteZoneBtn').click();
    }
    if ((e.key === 'r' || e.key === 'R') && selectedId && !e.metaKey && !e.ctrlKey) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') roundSelectedZone();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { spacePan = false; syncTools(); }
  });

  // Drag-drop upload
  wrap.addEventListener('dragover', (e) => { e.preventDefault(); });
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        baseDataUrl = String(reader.result);
        fitBase();
        persist();
        draw();
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  window.addEventListener('resize', resize);
  applyLang();
  syncTools();
  loadPersisted();
  resize();
})();

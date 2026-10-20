(() => {
  const I18N = {
    zh: {
      eyebrow: '种植概念布局',
      h1a: '把种植概念',
      h1b: '画在场地底图上',
      sub: '上传总平或场地截图，用色块标出乔木、灌木、草坪与水边种植。给汇报、对概念，不进施工图。',
      startKicker: '无需登录 · 本地保存 · PNG 导出',
      startCreating: '开始画种植概念',
      startDesc: '底图 · 种植图层 · 图例 · 导出',
      learn: '三步出图',
      learnDesc: '上传 → 分区 → 导出',
      typesLink: '种植图例',
      typesDesc: '乔木到水边，六类概念层',
      proof1: '浏览器直接用',
      proof2: '团队内部工具',
      proof3: 'PNG · JSON',
      t1: '这是什么',
      wt1: '浏览器里的',
      wt2: '种植概念板',
      wl: '不做苗木表、不做株距。只帮你把种植意图铺到底图上：哪里成林、哪里留空、哪里做屏障或遮阴，方便和老板、客户对齐。',
      t2: '图例',
      ft1: '六类种植概念层。',
      ft2: '够用就好。',
      c1t: '乔木冠层', c1d: '遮阴、天际线、主景树群。',
      c2t: '灌木 / 下层', c2d: '屏障、围合、建筑近景。',
      c3t: '地被', c3d: '林下覆盖、坡面固土。',
      c4t: '草坪 / 开敞', c4d: '活动场地与留白。',
      c5t: '水边 / 湿地', c5d: '驳岸、雨水、生态边。',
      c6t: '保留现状', c6d: '现有树木或植被保留区。',
      t3: '流程',
      ht1: '三步完成',
      ht2: '一张种植概念图。',
      s1t: '放底图', s1d: '上传总平、CAD 截图或航拍裁切。支持平移缩放对齐。',
      s2t: '画种植区', s2d: '选图例，点击描边多边形。可写一句概念备注。',
      s3t: '导出图板', s3d: '带图例导出 PNG，或保存 JSON 项目继续改。',
      enter: '进入工作室',
      t4: '内部工具',
      end1: '给团队自己用的',
      end2: '种植概念工作台。',
      endLead: '参考 EasyMap 的浏览器工具形态，聚焦 planting concept layout。数据只存本机。',
      enter2: '打开 PlantMap',
      foot: 'PlantMap · 团队内部种植概念布局工具'
    },
    en: {
      eyebrow: 'Planting Concept Layout',
      h1a: 'Paint planting intent',
      h1b: 'onto the site plan.',
      sub: 'Upload a site plan, mark canopy, shrub, lawn and edge zones. Made for concept reviews — not construction docs.',
      startKicker: 'NO ACCOUNT · LOCAL SAVE · PNG EXPORT',
      startCreating: 'Start a planting board',
      startDesc: 'Base plan · Layers · Legend · Export',
      learn: 'Three steps',
      learnDesc: 'Upload → Zone → Export',
      typesLink: 'Planting legend',
      typesDesc: 'Six concept layers from canopy to edge',
      proof1: 'BROWSER BASED',
      proof2: 'FOR INTERNAL USE',
      proof3: 'PNG · JSON',
      t1: 'What it is',
      wt1: 'A planting concept board',
      wt2: 'in the browser.',
      wl: 'No plant schedules, no spacing tables. Just put planting intent on the drawing: canopy mass, open lawn, buffers and edges — so the team can align fast.',
      t2: 'Legend',
      ft1: 'Six planting layers.',
      ft2: 'Enough for concept.',
      c1t: 'Canopy', c1d: 'Shade, skyline, feature tree mass.',
      c2t: 'Shrub / understory', c2d: 'Buffers, enclosure, building edge.',
      c3t: 'Groundcover', c3d: 'Understory cover and soft slopes.',
      c4t: 'Lawn / open', c4d: 'Program space and breathing room.',
      c5t: 'Edge / wetland', c5d: 'Water edge, rain garden, ecology.',
      c6t: 'Existing to keep', c6d: 'Trees or softscape retained on site.',
      t3: 'Workflow',
      ht1: 'Three steps to',
      ht2: 'a planting concept.',
      s1t: 'Drop a base', s1d: 'Upload a plan, CAD capture or aerial crop. Pan and zoom to align.',
      s2t: 'Paint zones', s2d: 'Pick a legend type and click a polygon. Add a short concept note.',
      s3t: 'Export board', s3d: 'PNG with legend, or save JSON and keep editing later.',
      enter: 'Enter studio',
      t4: 'Internal tool',
      end1: 'Built for our team’s',
      end2: 'planting concept work.',
      endLead: 'EasyMap-inspired browser workflow, scoped to planting concept layout. Everything stays local.',
      enter2: 'Open PlantMap',
      foot: 'PlantMap · Planting concept layouts for internal use'
    }
  };

  let lang = localStorage.getItem('pm_lang') || 'zh';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  function applyLang() {
    const pack = I18N[lang] || I18N.zh;
    $$('[data-i]').forEach((node) => {
      const key = node.getAttribute('data-i');
      if (pack[key] != null) node.textContent = pack[key];
    });
    $$('#lang button').forEach((btn) => btn.classList.toggle('on', btn.dataset.l === lang));
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    localStorage.setItem('pm_lang', lang);
  }

  $$('#lang button').forEach((btn) => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.l;
      applyLang();
    });
  });

  const snap = $('#snap');
  const pages = $$('.page');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        pages.forEach((p) => p.classList.remove('active'));
        entry.target.classList.add('active', 'seen');
      }
    });
  }, { root: snap, threshold: 0.55 });
  pages.forEach((p) => io.observe(p));

  const glow = $('#glow');
  window.addEventListener('pointermove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });

  applyLang();
})();

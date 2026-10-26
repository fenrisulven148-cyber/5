"use strict";
/* ============================================================
   ДЕВУШКА В ПОЛНЫЙ РОСТ — v3 (реалистичные пропорции + физика волос)
   • чёрные плетёные косы (verlet-цепи: гравитация, жёсткость, инерция тела)
   • прядки у лица тоже на физике
   • выраженные ключицы, шея, горло, яремная ямка, декольте
   • белая майка на тонких лямках, чёрные джинсы, белые кеды
   • голубые глаза, взрослое лицо

   Вызов (как раньше):  drawGirl(ctx, cx, footY, scale, t)
     t — время в секундах (растёт каждый кадр)
   Координаты фигуры: стопы y=0, макушка ≈ y=-640.

   Управление физикой (необязательно):
     GirlRig.wind = 40;          // боковой ветер (ед/с²), можно менять каждый кадр
     GirlRig.impulse(300);       // «толчок» косам (например при движении мыши/шаге)
     window.girlLook = {x:0.5, y:0};   // направление взгляда -1..1
   ============================================================ */

const GirlRig = (function () {
  const TAU = Math.PI * 2;
  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const C = {
    skin: '#f6d3bf', skinMid: '#ebb9a1', skinSh: '#cf9279', skinDk: '#b27058',
    edge: 'rgba(125,72,56,0.55)',
    eyeW: '#f6f7f8',
    hair: '#100e13', hairMid: '#1d1a24', hairHi: 'rgba(150,158,215,0.32)',
    tank: '#f3f1ec', tankSh: 'rgba(118,112,102,',
    jeans: '#1b1d25', jeansLt: '#2c3040',
    shoe: '#f1efea', sole: '#cfccc5', shoeDk: '#8f8c86',
    tie: '#b8374a'
  };

  /* ======================= ФИЗИКА ======================= */
  const PH = {
    ready: false, last: 0, acc: 0, prev: null,
    braid: {}, strand: []
  };

  function makeChain(n, seg, x, y) {
    const p = [];
    for (let i = 0; i < n; i++) p.push({ x: x, y: y + i * seg, px: x, py: y + i * seg });
    return { p: p, seg: seg };
  }

  function stepChain(ch, A, tgt, h, o) {
    const p = ch.p, n = p.length, L = ch.seg;
    p[0].x = A.x; p[0].y = A.y; p[0].px = A.x; p[0].py = A.y;
    const wind = RIG.wind + o.wind;
    for (let i = 1; i < n; i++) {
      const q = p[i], f = i / (n - 1);
      const vx = (q.x - q.px) * o.damp, vy = (q.y - q.py) * o.damp;
      q.px = q.x; q.py = q.y;
      q.x += vx + wind * (0.4 + f) * h * h;
      q.y += vy + o.g * h * h;
      if (tgt) {
        const T = tgt(i, f), w = o.spring * (1 - f * 0.5);
        q.x += (T.x - q.x) * w; q.y += (T.y - q.y) * w;
      }
    }
    for (let it = 0; it < o.iter; it++) {
      for (let i = 0; i < n - 1; i++) {
        const a = p[i], b = p[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-4, diff = (d - L) / d;
        if (i === 0) { b.x -= dx * diff; b.y -= dy * diff; }
        else {
          a.x += dx * diff * 0.5; a.y += dy * diff * 0.5;
          b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5;
        }
      }
      if (o.bend > 0) {
        for (let i = 2; i < n; i++) {
          const a = p[i - 2], b = p[i - 1], c = p[i];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-4;
          const k = o.bend * (1 - (i / n) * 0.65);
          c.x += (b.x + dx / d * L - c.x) * k;
          c.y += (b.y + dy / d * L - c.y) * k;
        }
      }
      if (o.side) {
        for (let i = 1; i < n; i++) {
          const q = p[i];
          if (o.side * q.x < o.minX) q.x = o.side * o.minX;
        }
      }
    }
  }

  function headWorld(lean, tilt, bob) {
    const hy = -590 + bob, py = -330;
    const dy = hy - py, c = Math.cos(lean), s = Math.sin(lean);
    return { x: -dy * s, y: py + dy * c, ang: lean + tilt };
  }
  function toWorld(H, lx, ly) {
    const c = Math.cos(H.ang), s = Math.sin(H.ang);
    lx *= 1.14; ly *= 1.1;
    return { x: H.x + lx * c - ly * s, y: H.y + lx * s + ly * c };
  }

  function physUpdate(t, H) {
    const A = {
      '-1': toWorld(H, -34, 27), '1': toWorld(H, 34, 27),
      'S-1': toWorld(H, -28, -24), 'S1': toWorld(H, 28, -24),
      'T-1': toWorld(H, -26, -22), 'T1': toWorld(H, 26, -22)
    };
    if (!PH.ready || t < PH.last || t - PH.last > 2) {
      [-1, 1].forEach(s => {
        PH.braid[s] = makeChain(14, 13, A[s].x, A[s].y);
      });
      PH.strand = [];
      [-1, 1].forEach(s => {
        PH.strand.push({ s: s, ch: makeChain(6, 8, A['S' + s].x, A['S' + s].y), root: 'S', len: 6 });
        PH.strand.push({ s: s, ch: makeChain(5, 7, A['T' + s].x, A['T' + s].y), root: 'T', len: 5 });
      });
      PH.last = t; PH.prev = A; PH.ready = true; PH.acc = 0;
    }
    const dt = Math.min(t - PH.last, 0.05);
    PH.last = t; PH.acc += dt;
    const h = 1 / 120, n = Math.floor(PH.acc / h);
    PH.acc -= n * h;
    const ambient = Math.sin(t * 0.8) * 26 + Math.sin(t * 2.3 + 1) * 10;
    for (let k = 0; k < n; k++) {
      const u = (k + 1) / n;
      const lerpA = key => ({
        x: lerp(PH.prev[key].x, A[key].x, u), y: lerp(PH.prev[key].y, A[key].y, u)
      });
      [-1, 1].forEach(s => {
        const a = lerpA(String(s));
        const ch = PH.braid[s];
        stepChain(ch, a, (i, f) => ({
          x: a.x + s * 9 * Math.min(1, i / 5),
          y: a.y + i * ch.seg * 0.985
        }), h, { g: 2700, damp: 0.988, spring: 0.010, bend: 0.11, iter: 6, side: s, minX: 21, wind: ambient });
      });
      PH.strand.forEach(st => {
        const a = lerpA(st.root + st.s);
        const ch = st.ch;
        stepChain(ch, a, (i, f) => toWorld(H, st.s * (33 + 2.2 * Math.sin(f * Math.PI) + (st.root === 'T' ? 1.2 : 0)),
          (st.root === 'S' ? -24 : -22) + i * ch.seg * 0.95),
          h, { g: 1500, damp: 0.975, spring: 0.05, bend: 0.03, iter: 4, side: 0, minX: 0, wind: ambient * 1.4 });
      });
    }
    PH.prev = A;
  }

  /* ======================= УТИЛИТЫ ======================= */
  // симметричный контур: правая половина сверху вниз, левая — зеркально
  function symPath(g, S, segs) {
    g.moveTo(S[0], S[1]);
    const pts = [S];
    segs.forEach(sg => {
      g.bezierCurveTo(sg[0], sg[1], sg[2], sg[3], sg[4], sg[5]);
      pts.push([sg[4], sg[5]]);
    });
    const E = pts[pts.length - 1];
    g.lineTo(-E[0], E[1]);
    for (let j = segs.length - 1; j >= 0; j--) {
      const sg = segs[j], P = pts[j];
      g.bezierCurveTo(-sg[2], sg[3], -sg[0], sg[1], -P[0], P[1]);
    }
    g.closePath();
  }
  function softStroke(g, color, w, fn) {
    g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); fn(); g.stroke(); g.restore();
  }
  function blob(g, x, y, rx, ry, rot, c0, c1) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
  }

  /* ======================= КОНТУРЫ ТЕЛА ======================= */
  const TORSO_S = [15.5, -575];
  const TORSO_SEGS = [
    [15.5, -562, 16, -552, 21, -540],
    [27, -532, 40, -526, 56, -519],
    [56, -505, 53, -480, 50, -452],
    [55, -440, 57, -422, 49, -405],
    [41, -394, 36, -386, 35, -372],
    [36, -358, 46, -348, 50, -332]
  ];
  const TANK_S = [0, -429];
  const TANK_SEGS = [
    [16, -429, 30, -445, 34, -462],
    [36, -462, 40, -462, 42, -462],
    [46, -460, 48, -458, 50, -452],
    [59, -442, 59, -420, 49, -405],
    [41, -394, 36, -386, 35, -372],
    [37, -358, 45, -349, 48, -339],
    [34, -337, 16, -337, 0, -337]
  ];

  function torsoPath(g) { g.beginPath(); symPath(g, TORSO_S, TORSO_SEGS); }
  function tankPath(g) { g.beginPath(); symPath(g, TANK_S, TANK_SEGS); }

  function armPath(g, closed) {
    g.beginPath();
    g.moveTo(46, -523);
    g.bezierCurveTo(62, -520, 73, -514, 78, -500);
    g.bezierCurveTo(82, -490, 83, -478, 82, -462);
    g.bezierCurveTo(81, -440, 80, -420, 77, -398);
    g.bezierCurveTo(77, -380, 76, -350, 72, -322);
    g.lineTo(69, -303);
    g.lineTo(54, -304);
    g.bezierCurveTo(56, -330, 57, -360, 58, -392);
    g.bezierCurveTo(58, -415, 55, -438, 53, -454);
    if (closed) { g.lineTo(46, -480); g.closePath(); }
  }

  /* ======================= НИЗ: ОБУВЬ И ДЖИНСЫ ======================= */
  function drawShoe(g, s) {
    g.save(); g.scale(s, 1);
    g.fillStyle = C.shoe; g.strokeStyle = 'rgba(70,66,62,0.75)'; g.lineWidth = 1.6; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(2, -42);
    g.bezierCurveTo(0, -28, -1, -14, 1, -5);
    g.bezierCurveTo(3, 3, 14, 5, 24, 3);
    g.bezierCurveTo(30, 2, 32, -5, 31, -14);
    g.bezierCurveTo(30, -24, 27, -33, 25, -42);
    g.closePath(); g.fill(); g.stroke();
    // объём
    g.save(); g.clip();
    const gr = g.createLinearGradient(0, 0, 32, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(110,105,98,0.30)');
    g.fillStyle = gr; g.fillRect(-4, -46, 40, 54);
    blob(g, 16, -12, 14, 9, 0, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)');
    g.restore();
    // подошва
    g.fillStyle = C.sole;
    g.beginPath();
    g.moveTo(0, -6); g.bezierCurveTo(2, 3, 14, 6, 24, 4);
    g.bezierCurveTo(31, 3, 33, -4, 32, -12); g.lineTo(30, -12);
    g.bezierCurveTo(31, -4, 29, 0, 24, 0);
    g.bezierCurveTo(14, 1, 5, -1, 2, -6); g.closePath(); g.fill(); g.stroke();
    // носок
    g.strokeStyle = C.shoeDk; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(4, -10); g.bezierCurveTo(10, -19, 24, -19, 30, -10); g.stroke();
    // шнурки
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(7, -35 + i * 5); g.lineTo(20, -31 + i * 5); g.stroke();
      g.beginPath(); g.moveTo(20, -35 + i * 5); g.lineTo(7, -31 + i * 5); g.stroke();
    }
    g.restore();
  }

  function drawLeg(g, s) {
    g.save(); g.scale(s, 1);
    g.beginPath();
    g.moveTo(49, -342);
    g.bezierCurveTo(57, -300, 44, -230, 35, -172);
    g.bezierCurveTo(32, -140, 31, -100, 25, -32);
    g.lineTo(4, -32);
    g.bezierCurveTo(5, -90, 5, -140, 6, -172);
    g.bezierCurveTo(5, -230, 2, -280, 0, -315);
    g.lineTo(0, -342); g.closePath();
    g.fillStyle = C.jeans; g.fill();
    g.save(); g.clip();
    // свет слева (в системе зеркала s<0 — наружу)
    const gr = g.createLinearGradient(0, 0, 56, 0);
    if (s < 0) { gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.55, 'rgba(120,130,160,0.20)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)'); }
    else { gr.addColorStop(0, 'rgba(120,130,160,0.12)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.38)'); }
    g.fillStyle = gr; g.fillRect(-2, -355, 62, 330);
    // блики на бедре и голени
    blob(g, 30, -270, 9, 52, 0.12, 'rgba(150,160,190,' + (s < 0 ? 0.28 : 0.14) + ')', 'rgba(150,160,190,0)');
    blob(g, 21, -110, 6, 40, 0.05, 'rgba(150,160,190,' + (s < 0 ? 0.22 : 0.10) + ')', 'rgba(150,160,190,0)');
    // «усы» и складки у паха и колена
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(10, -310 + i * 6); g.quadraticCurveTo(24, -298 + i * 6, 44, -306 + i * 8); g.stroke(); }
    g.strokeStyle = 'rgba(95,105,130,0.38)'; g.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(8, -180 + i * 7); g.quadraticCurveTo(20, -172 + i * 7, 33, -180 + i * 7); g.stroke(); }
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(8, -165 - i * 6); g.quadraticCurveTo(20, -158 - i * 6, 33, -166 - i * 6); g.stroke(); }
    // подворот: «гармошка» у щиколотки
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i % 2 ? 'rgba(110,120,150,0.35)' : 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(5, -56 + i * 7); g.quadraticCurveTo(15, -52 + i * 7, 29, -57 + i * 7); g.stroke();
    }
    g.restore();
    // контур + строчка
    g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1.8; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(49, -342);
    g.bezierCurveTo(57, -300, 44, -230, 35, -172);
    g.bezierCurveTo(32, -140, 31, -100, 25, -32);
    g.lineTo(4, -32);
    g.bezierCurveTo(5, -90, 5, -140, 6, -172);
    g.bezierCurveTo(5, -230, 2, -280, 0, -315);
    g.stroke();
    g.setLineDash([3, 3]); g.strokeStyle = 'rgba(150,160,185,0.45)'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(48, -340); g.bezierCurveTo(54, -300, 41, -230, 32, -172); g.bezierCurveTo(29, -140, 28, -100, 23, -36); g.stroke();
    g.setLineDash([]);
    // подворот (манжета)
    g.fillStyle = C.jeansLt; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(4, -38); g.lineTo(25, -38); g.lineTo(25.8, -29); g.lineTo(3.4, -29); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }

  function drawJeansTop(g) {
    // передний карман + ширинка (видно под майкой)
    g.strokeStyle = 'rgba(150,160,185,0.45)'; g.lineWidth = 1.1; g.setLineDash([3, 2.5]);
    [-1, 1].forEach(s => {
      g.beginPath(); g.moveTo(s * 42, -338); g.bezierCurveTo(s * 32, -332, s * 26, -322, s * 22, -310); g.stroke();
    });
    g.beginPath(); g.moveTo(0, -337); g.bezierCurveTo(0, -326, 3, -318, 7, -314); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#b79b62'; g.strokeStyle = 'rgba(60,45,20,0.8)'; g.lineWidth = 0.9;
    g.beginPath(); g.arc(0, -334, 2.6, 0, TAU); g.fill(); g.stroke();
  }

  /* ======================= ТОРС ======================= */
  function drawTorsoSkin(g, br) {
    // базовая кожа
    torsoPath(g); g.fillStyle = C.skin; g.fill();
    g.save(); torsoPath(g); g.clip();

    // общий свет слева / тень справа
    let lg = g.createLinearGradient(-58, 0, 58, 0);
    lg.addColorStop(0, 'rgba(255,240,228,0.20)');
    lg.addColorStop(0.5, 'rgba(255,240,228,0)');
    lg.addColorStop(1, 'rgba(140,80,60,0.30)');
    g.fillStyle = lg; g.fillRect(-60, -580, 120, 260);

    // боковая тень шеи и тень от подбородка
    softStroke(g, 'rgba(140,80,60,0.20)', 7, () => { g.moveTo(15, -572); g.quadraticCurveTo(16, -552, 21, -538); });
    softStroke(g, 'rgba(140,80,60,0.08)', 7, () => { g.moveTo(-15, -572); g.quadraticCurveTo(-16, -552, -21, -538); });
    blob(g, 0, -546, 22, 12, 0, 'rgba(115,58,44,0.62)', 'rgba(115,58,44,0)');

    // грудино-ключично-сосцевидные мышцы (V к яремной ямке)
    [-1, 1].forEach(s => {
      softStroke(g, 'rgba(140,82,64,0.34)', 3.6, () => { g.moveTo(s * 13.5, -566); g.quadraticCurveTo(s * 10, -540, s * 5.5, -513); });
      softStroke(g, 'rgba(255,243,233,' + (s < 0 ? 0.50 : 0.30) + ')', 1.8, () => { g.moveTo(s * 10.5, -566); g.quadraticCurveTo(s * 7.2, -540, s * 2.8, -515); });
      // трапеция
      softStroke(g, 'rgba(150,90,70,0.18)', 2.4, () => { g.moveTo(s * 17, -546); g.quadraticCurveTo(s * 28, -532, s * 46, -524); });
    });

    // горло: щитовидный хрящ + ямка
    blob(g, -0.6, -535, 4.2, 6.2, 0, 'rgba(255,240,230,0.34)', 'rgba(255,240,230,0)');
    softStroke(g, 'rgba(140,80,62,0.28)', 1.5, () => { g.moveTo(3.2, -541); g.quadraticCurveTo(4.4, -534, 2.4, -528); });
    blob(g, 0, -512, 5.4, 3.8, 0, 'rgba(100,48,36,0.62)', 'rgba(100,48,36,0)');

    // надключичные впадины
    [-1, 1].forEach(s => {
      blob(g, s * 24, -524, 13, 5.2, s * -0.18, 'rgba(135,76,58,0.38)', 'rgba(135,76,58,0)');
    });

    // КЛЮЧИЦЫ
    [-1, 1].forEach(s => {
      const clav = (dy) => () => {
        g.moveTo(s * 5, -509 + dy);
        g.bezierCurveTo(s * 14, -512 + dy, s * 26, -514 + dy, s * 35, -516 + dy);
        g.bezierCurveTo(s * 43, -518 + dy, s * 50, -520 + dy, s * 58, -517 + dy);
      };
      softStroke(g, 'rgba(150,90,70,0.16)', 9, clav(6));                       // инфраключичная впадина
      softStroke(g, 'rgba(140,80,62,' + (s < 0 ? 0.45 : 0.58) + ')', 3.6, clav(2.6)); // тень снизу
      softStroke(g, 'rgba(255,243,234,' + (s < 0 ? 0.70 : 0.45) + ')', 1.9, clav(-1.5)); // блик сверху
      softStroke(g, 'rgba(185,120,96,0.35)', 0.9, clav(0.3));                  // линия кости
      // головка ключицы у грудины
      blob(g, s * 6.5, -510, 3.2, 2.6, 0, 'rgba(255,243,234,0.45)', 'rgba(255,243,234,0)');
    });

    // грудина
    softStroke(g, 'rgba(180,115,92,0.20)', 3, () => { g.moveTo(0, -503); g.lineTo(0, -452); });

    // верх груди (над вырезом) — объём и тень в вырезе
    [-1, 1].forEach(s => {
      blob(g, s * 21, -445 + br * 0.3, 21, 17, 0, 'rgba(255,240,228,' + (s < 0 ? 0.42 : 0.22) + ')', 'rgba(255,240,228,0)');
      softStroke(g, 'rgba(140,80,62,0.30)', 2.6, () => { g.moveTo(s * 3, -452); g.quadraticCurveTo(s * 7, -440, s * 3, -432); });
    });
    blob(g, 0, -438, 4.5, 14, 0, 'rgba(120,62,48,0.50)', 'rgba(120,62,48,0)');
    g.restore();

    // контур силуэта: шея + плечевая линия
    [-1, 1].forEach(s => {
      softStroke(g, C.edge, 1.3, () => {
        g.moveTo(s * 15.5, -575);
        g.bezierCurveTo(s * 15.5, -562, s * 16, -552, s * 21, -540);
        g.bezierCurveTo(s * 27, -532, s * 40, -526, s * 48, -522);
      });
    });
  }

  function drawArm(g, s, br) {
    g.save(); g.scale(s, 1); g.translate(46, 0); g.scale(0.88, 1); g.translate(-46, 0);
    armPath(g, true); g.fillStyle = C.skin; g.fill();
    g.save(); armPath(g, true); g.clip();
    // свет: слева (s<0) освещена внешняя сторона, справа — внутренняя
    const gr = g.createLinearGradient(50, 0, 84, 0);
    if (s < 0) { gr.addColorStop(0, 'rgba(150,90,70,0.28)'); gr.addColorStop(0.5, 'rgba(255,240,228,0.16)'); gr.addColorStop(1, 'rgba(150,90,70,0.12)'); }
    else { gr.addColorStop(0, 'rgba(255,240,228,0.10)'); gr.addColorStop(0.5, 'rgba(150,90,70,0.10)'); gr.addColorStop(1, 'rgba(140,80,60,0.38)'); }
    g.fillStyle = gr; g.fillRect(44, -526, 44, 230);
    // дельтовидная, бицепс, локоть, предплечье
    blob(g, 72, -490, 9, 17, 0.25, 'rgba(255,242,232,' + (s < 0 ? 0.55 : 0.25) + ')', 'rgba(255,242,232,0)');
    blob(g, 67, -440, 6, 24, 0.05, 'rgba(255,242,232,' + (s < 0 ? 0.28 : 0.14) + ')', 'rgba(255,242,232,0)');
    softStroke(g, 'rgba(140,80,62,0.22)', 3, () => { g.moveTo(56, -452); g.quadraticCurveTo(61, -420, 59, -394); });
    blob(g, 67, -394, 8, 7, 0, 'rgba(190,120,98,0.30)', 'rgba(190,120,98,0)');
    softStroke(g, 'rgba(140,80,62,0.35)', 1.4, () => { g.moveTo(59, -399); g.quadraticCurveTo(63, -394, 60, -388); });
    blob(g, 68, -350, 5, 24, 0.05, 'rgba(255,242,232,' + (s < 0 ? 0.24 : 0.12) + ')', 'rgba(255,242,232,0)');
    g.restore();
    // контур руки (без шва с плечом)
    softStroke(g, C.edge, 1.3, () => {
      g.moveTo(46, -523);
      g.bezierCurveTo(62, -520, 73, -514, 78, -500);
      g.bezierCurveTo(82, -490, 83, -478, 82, -462);
      g.bezierCurveTo(81, -440, 80, -420, 77, -398);
      g.bezierCurveTo(77, -380, 76, -350, 72, -322);
      g.lineTo(69, -303);
    });
    softStroke(g, C.edge, 1.3, () => {
      g.moveTo(54, -304);
      g.bezierCurveTo(56, -330, 57, -360, 58, -392);
      g.bezierCurveTo(58, -415, 55, -438, 53, -454);
    });
    // кисть: ладонь + пальцы-«капсулы» + большой палец
    const fing = [[57.5, 22], [61.2, 26], [64.8, 24], [68.2, 18]];
    g.lineCap = 'round'; g.lineJoin = 'round';
    fing.forEach((f, i) => {
      const bx = f[0], len = f[1], x2 = bx + 0.6 + i * 0.15;
      g.strokeStyle = C.edge; g.lineWidth = 5.0;
      g.beginPath(); g.moveTo(bx, -272); g.quadraticCurveTo(bx + 0.3, -272 + len * 0.5, x2, -272 + len); g.stroke();
    });
    fing.forEach((f, i) => {
      const bx = f[0], len = f[1], x2 = bx + 0.6 + i * 0.15;
      g.strokeStyle = C.skin; g.lineWidth = 3.9;
      g.beginPath(); g.moveTo(bx, -272); g.quadraticCurveTo(bx + 0.3, -272 + len * 0.5, x2, -272 + len); g.stroke();
    });
    g.fillStyle = C.skin; g.strokeStyle = C.edge; g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(54, -304); g.lineTo(69, -303);
    g.bezierCurveTo(71.5, -294, 72, -284, 71, -273);
    g.lineTo(55.5, -273);
    g.bezierCurveTo(53.5, -280, 52.5, -290, 54, -304);
    g.closePath(); g.fill();
    softStroke(g, C.edge, 1.3, () => { g.moveTo(69, -303); g.bezierCurveTo(71.5, -294, 72, -284, 71, -273); });
    softStroke(g, C.edge, 1.3, () => { g.moveTo(54, -304); g.bezierCurveTo(52.5, -290, 53.5, -280, 55.5, -273); });
    g.save();
    g.beginPath(); g.moveTo(54, -304); g.lineTo(69, -303); g.bezierCurveTo(71.5, -294, 72, -284, 71, -273); g.lineTo(55.5, -273); g.bezierCurveTo(53.5, -280, 52.5, -290, 54, -304); g.clip();
    blob(g, 62, -288, 8, 15, 0, 'rgba(255,242,232,' + (s < 0 ? 0.40 : 0.16) + ')', 'rgba(255,242,232,0)');
    g.restore();
    // большой палец (спереди, у внутренней стороны)
    g.strokeStyle = C.edge; g.lineWidth = 6;
    g.beginPath(); g.moveTo(54.2, -292); g.quadraticCurveTo(51.6, -280, 52.6, -266); g.stroke();
    g.strokeStyle = C.skin; g.lineWidth = 4.8;
    g.beginPath(); g.moveTo(54.2, -292); g.quadraticCurveTo(51.6, -280, 52.6, -266); g.stroke();
    g.restore();
  }

  function drawTank(g, br) {
    // тень майки на коже
    g.save();
    g.shadowColor = 'rgba(95,52,40,0.38)'; g.shadowBlur = 6; g.shadowOffsetY = 1.5;
    tankPath(g); g.fillStyle = C.tank; g.fill();
    g.restore();
    tankPath(g); g.fillStyle = C.tank; g.fill();
    g.save(); tankPath(g); g.clip();
    const sh = a => C.tankSh + a + ')';

    // общий свет
    let lg = g.createLinearGradient(-54, 0, 54, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.45)'); lg.addColorStop(0.45, 'rgba(255,255,255,0.05)'); lg.addColorStop(1, sh(0.42));
    g.fillStyle = lg; g.fillRect(-58, -470, 116, 140);

    // рубчик ткани
    g.strokeStyle = sh(0.07); g.lineWidth = 0.8;
    for (let x = -50; x <= 50; x += 3.2) {
      g.beginPath(); g.moveTo(x, -466); g.bezierCurveTo(x * 1.1, -430, x * 0.9, -380, x * 0.8, -336); g.stroke();
    }

    // ГРУДЬ: объём в ткани
    [-1, 1].forEach(s => {
      g.save(); g.translate(s * 25, -432 + br * 0.4); g.scale(1, 0.95);
      const rg = g.createRadialGradient(s * -6, -9, 1, 0, 0, 33);
      rg.addColorStop(0, 'rgba(255,255,255,' + (s < 0 ? 0.85 : 0.60) + ')');
      rg.addColorStop(0.45, 'rgba(255,255,255,0.0)');
      rg.addColorStop(0.8, sh(s < 0 ? 0.26 : 0.42));
      rg.addColorStop(1, sh(0.10));
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 33, 0, TAU); g.fill();
      g.restore();
      // тень под грудью
      softStroke(g, sh(0.14), 8, () => { g.moveTo(s * 3, -409); g.bezierCurveTo(s * 14, -396, s * 38, -395, s * 51, -414); });
      softStroke(g, sh(0.50), 2.2, () => { g.moveTo(s * 3, -411); g.bezierCurveTo(s * 14, -399, s * 38, -398, s * 50, -416); });
      // натяжение ткани от боков к груди
      softStroke(g, sh(0.22), 1.5, () => { g.moveTo(s * 50, -441); g.bezierCurveTo(s * 42, -436, s * 36, -432, s * 31, -428); });
      softStroke(g, sh(0.18), 1.3, () => { g.moveTo(s * 51, -432); g.bezierCurveTo(s * 43, -429, s * 38, -426, s * 34, -422); });
      // складки на талии
      softStroke(g, sh(0.26), 1.6, () => { g.moveTo(s * 44, -396); g.quadraticCurveTo(s * 36, -382, s * 31, -362); });
      softStroke(g, 'rgba(255,255,255,0.55)', 1.4, () => { g.moveTo(s * 40, -394); g.quadraticCurveTo(s * 33, -380, s * 28, -362); });
    });
    // ложбинка между грудей
    const cg = g.createLinearGradient(-8, 0, 8, 0);
    cg.addColorStop(0, sh(0)); cg.addColorStop(0.5, sh(0.55)); cg.addColorStop(1, sh(0));
    g.fillStyle = cg; g.fillRect(-8, -440, 16, 36);
    // тень под грудью — мягкий градиент вниз
    const ug = g.createLinearGradient(0, -412, 0, -388);
    ug.addColorStop(0, sh(0.30)); ug.addColorStop(1, sh(0));
    g.fillStyle = ug; g.fillRect(-52, -412, 104, 24);

    // подол
    softStroke(g, sh(0.45), 1.2, () => { g.moveTo(-48, -343); g.bezierCurveTo(-34, -341, -16, -341, 0, -341); g.bezierCurveTo(16, -341, 34, -341, 48, -343); });
    g.restore();

    // край выреза + кант
    softStroke(g, 'rgba(195,190,180,0.95)', 1.6, () => {
      g.moveTo(-34, -462); g.bezierCurveTo(-30, -445, -16, -429, 0, -429); g.bezierCurveTo(16, -429, 30, -445, 34, -462);
    });
    softStroke(g, 'rgba(255,255,255,0.8)', 0.8, () => {
      g.moveTo(-33, -460); g.bezierCurveTo(-29, -444, -16, -431, 0, -431); g.bezierCurveTo(16, -431, 29, -444, 33, -460);
    });
    // контур майки
    g.save(); tankPath(g);
    g.strokeStyle = 'rgba(130,124,112,0.55)'; g.lineWidth = 1.2; g.lineJoin = 'round'; g.stroke();
    g.restore();

    // тонкие лямки
    [-1, 1].forEach(s => {
      g.beginPath();
      g.moveTo(s * 27, -529);
      g.bezierCurveTo(s * 29.5, -526, s * 33, -526, s * 35, -526);
      g.bezierCurveTo(s * 37, -505, s * 40, -480, s * 41.5, -461);
      g.lineTo(s * 33.5, -461);
      g.bezierCurveTo(s * 32, -480, s * 29, -505, s * 27, -529);
      g.closePath();
      g.fillStyle = C.tank; g.fill();
      g.strokeStyle = 'rgba(130,124,112,0.65)'; g.lineWidth = 1; g.stroke();
      softStroke(g, 'rgba(255,255,255,0.8)', 1, () => { g.moveTo(s * 30, -524); g.bezierCurveTo(s * 32, -505, s * 35, -482, s * 36, -463); });
      // тень лямки на коже
      softStroke(g, 'rgba(110,60,45,0.18)', 3, () => { g.moveTo(s * 25.5, -526); g.bezierCurveTo(s * 28, -505, s * 31, -482, s * 32.5, -463); });
    });
  }

  /* ======================= ГОЛОВА ======================= */
  function drawHead(g, t, open, gx, gy) {
    // уши
    [-1, 1].forEach(s => {
      g.save(); g.translate(s * 30.5, 4); g.rotate(s * 0.10);
      g.fillStyle = C.skin; g.strokeStyle = C.edge; g.lineWidth = 1.1;
      g.beginPath(); g.ellipse(s * 1.5, 0, 4.4, 9.6, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(160,95,76,0.55)'; g.lineWidth = 0.9;
      g.beginPath(); g.ellipse(s * 1.4, 0.4, 2.2, 6.2, 0, 0, TAU); g.stroke();
      g.fillStyle = '#e6e2da'; g.beginPath(); g.arc(s * 0.4, 9.2, 1.4, 0, TAU); g.fill();
      g.restore();
    });

    // ЛИЦО: овал со скулами и мягким подбородком
    const facePath = () => {
      g.beginPath();
      g.moveTo(0, -48);
      g.bezierCurveTo(22, -48, 31, -28, 30, -6);
      g.bezierCurveTo(30, 12, 26, 26, 17, 38);
      g.bezierCurveTo(12, 45, 6, 48.5, 0, 48.5);
      g.bezierCurveTo(-6, 48.5, -12, 45, -17, 38);
      g.bezierCurveTo(-26, 26, -30, 12, -30, -6);
      g.bezierCurveTo(-31, -28, -22, -48, 0, -48);
      g.closePath();
    };
    facePath(); g.fillStyle = C.skin; g.fill();
    g.save(); facePath(); g.clip();
    let lg = g.createLinearGradient(-30, 0, 30, 0);
    lg.addColorStop(0, 'rgba(255,242,230,0.22)'); lg.addColorStop(0.5, 'rgba(255,242,230,0)'); lg.addColorStop(1, 'rgba(150,85,65,0.34)');
    g.fillStyle = lg; g.fillRect(-32, -50, 64, 100);
    const vg = g.createRadialGradient(-3, -6, 16, 0, -4, 54);
    vg.addColorStop(0, 'rgba(160,95,75,0)'); vg.addColorStop(1, 'rgba(160,95,75,0.30)');
    g.fillStyle = vg; g.fillRect(-32, -50, 64, 100);
    // лоб, скулы, щёки, подбородок
    blob(g, -5, -30, 18, 11, 0, 'rgba(255,245,235,0.30)', 'rgba(255,245,235,0)');
    [-1, 1].forEach(s => {
      blob(g, s * 19, 8, 9, 5, s * 0.5, 'rgba(255,244,234,' + (s < 0 ? 0.40 : 0.22) + ')', 'rgba(255,244,234,0)');   // скула
      blob(g, s * 18, 17, 10, 6, 0, 'rgba(238,130,125,0.22)', 'rgba(238,130,125,0)');                                  // румянец
      blob(g, s * 12.5, -3, 11, 8, 0, 'rgba(150,95,85,0.20)', 'rgba(150,95,85,0)');                                    // глазница
      softStroke(g, 'rgba(150,90,72,0.20)', 3, () => { g.moveTo(s * 27, 8); g.quadraticCurveTo(s * 24, 28, s * 14, 40); }); // линия челюсти
    });
    blob(g, 0, 43.5, 6, 2.2, 0, 'rgba(160,95,80,0.30)', 'rgba(160,95,80,0)');
    blob(g, -1, 46, 6, 3, 0, 'rgba(255,245,235,0.28)', 'rgba(255,245,235,0)');
    g.restore();
    softStroke(g, C.edge, 1.2, () => {
      g.moveTo(-30, -6); g.bezierCurveTo(-30, 12, -26, 26, -17, 38); g.bezierCurveTo(-12, 45, -6, 48.5, 0, 48.5);
      g.bezierCurveTo(6, 48.5, 12, 45, 17, 38); g.bezierCurveTo(26, 26, 30, 12, 30, -6);
    });

    /* ---------- глаза ---------- */
    [-1, 1].forEach(s => {
      g.save(); g.translate(s * 12.6, -2); g.scale(s, 1);
      const o = open;
      const eyeP = () => {
        g.beginPath();
        g.moveTo(-7.2, 1.2);
        g.bezierCurveTo(-4.5, -6.4 * o - 0.2, 4, -7.4 * o - 0.4, 8.2, -1.6);
        g.bezierCurveTo(4.5, 3.8 * o + 1.0, -3.5, 4.4 * o + 1.1, -7.2, 1.2);
        g.closePath();
      };
      // тень века и складка
      blob(g, 1, -6, 10, 4.5, 0, 'rgba(150,95,90,0.28)', 'rgba(150,95,90,0)');
      softStroke(g, 'rgba(140,82,66,0.55)', 1.1, () => {
        g.moveTo(-5.4, -4.6); g.bezierCurveTo(-2, -9.6 * o - 0.2, 5, -9.8 * o - 0.2, 9.6, -3.4);
      });
      eyeP(); g.fillStyle = C.eyeW; g.fill();
      g.save(); eyeP(); g.clip();
      const sg = g.createLinearGradient(-7, 0, 8, 0);
      sg.addColorStop(0, 'rgba(190,150,150,0.5)'); sg.addColorStop(0.3, 'rgba(255,255,255,0)'); sg.addColorStop(0.7, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(180,150,150,0.4)');
      g.fillStyle = sg; g.fillRect(-8, -9, 17, 14);
      // радужка
      const ix = 0.4 + gx * 1.9 * 1, iy = -0.9 + gy * 1.1;
      const ig = g.createRadialGradient(ix - 0.6, iy - 1.0, 0.6, ix, iy, 4.5);
      ig.addColorStop(0, '#b5e1ff'); ig.addColorStop(0.55, '#4ba0e6'); ig.addColorStop(0.9, '#1f64ad'); ig.addColorStop(1, '#0f3763');
      g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, 4.5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(235,248,255,0.40)'; g.lineWidth = 0.5;
      for (let a = 0; a < 14; a++) {
        const an = a * TAU / 14;
        g.beginPath(); g.moveTo(ix + Math.cos(an) * 1.9, iy + Math.sin(an) * 1.9); g.lineTo(ix + Math.cos(an) * 4.0, iy + Math.sin(an) * 4.0); g.stroke();
      }
      g.strokeStyle = 'rgba(10,35,70,0.85)'; g.lineWidth = 0.8; g.beginPath(); g.arc(ix, iy, 4.45, 0, TAU); g.stroke();
      g.fillStyle = '#07101c'; g.beginPath(); g.arc(ix, iy, 1.9, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ix - 1.5, iy - 1.7, 1.15, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(ix + 1.7, iy + 1.5, 0.6, 0, TAU); g.fill();
      // тень верхнего века на глазном яблоке
      const tg = g.createLinearGradient(0, -8 * o, 0, 1.5);
      tg.addColorStop(0, 'rgba(40,22,22,0.60)'); tg.addColorStop(1, 'rgba(40,22,22,0)');
      g.fillStyle = tg; g.fillRect(-8, -9, 17, 10.5);
      g.restore();
      // слёзное мясцо
      blob(g, -6.4, 1.3, 1.4, 1.1, 0, 'rgba(226,130,125,0.75)', 'rgba(226,130,125,0)');
      // верхнее веко (ресничная линия, утолщение к внешнему углу)
      g.strokeStyle = '#1b1210'; g.lineCap = 'round';
      g.lineWidth = 1.7; g.beginPath(); g.moveTo(-7.4, 1.3); g.bezierCurveTo(-4.5, -6.6 * o - 0.2, 4, -7.6 * o - 0.4, 8.4, -1.7); g.stroke();
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(1.5, -5.2 * o - 0.1); g.bezierCurveTo(4, -6.4 * o - 0.3, 6.6, -5 * o - 0.4, 8.6, -1.9); g.stroke();
      // ресницы
      g.lineWidth = 0.9;
      [[-4.8, -4.2], [-2, -5.6], [1, -6.4], [4, -6.2], [6.6, -4.8], [8.2, -2.6]].forEach((p, i) => {
        const px = p[0], py = p[1] * o - 0.2;
        g.beginPath(); g.moveTo(px, py); g.lineTo(px + (i < 2 ? -1.4 : 0.8 + i * 0.25), py - 2.8 * o - 0.4); g.stroke();
      });
      // нижнее веко
      softStroke(g, 'rgba(190,120,105,0.55)', 0.9, () => { g.moveTo(-6, 2.4); g.bezierCurveTo(-3, 4.8 * o + 0.8, 3, 5 * o + 0.6, 7, 1.2); });
      softStroke(g, 'rgba(255,225,215,0.5)', 0.8, () => { g.moveTo(-4.5, 3.6 * o + 0.4); g.bezierCurveTo(-1, 5.6 * o + 0.8, 3, 5.6 * o + 0.6, 6, 2.6); });
      g.restore();
    });

    /* ---------- брови ---------- */
    [-1, 1].forEach(s => {
      g.save(); g.translate(s * 12.6, -2); g.scale(s, 1);
      g.save(); g.shadowColor = 'rgba(30,18,16,0.7)'; g.shadowBlur = 1.8;
      g.fillStyle = '#2a1c19';
      g.beginPath();
      g.moveTo(-7.4, -12.4);
      g.bezierCurveTo(-3, -16.6, 6, -18.8, 16.6, -13.2);
      g.bezierCurveTo(9, -15.4, 0, -14.6, -7.4, -10.2);
      g.closePath(); g.fill(); g.restore();
      g.strokeStyle = 'rgba(55,38,34,0.7)'; g.lineWidth = 0.6;
      for (let i = 0; i < 9; i++) {
        const x = -6 + i * 2.4;
        g.beginPath(); g.moveTo(x, -11.6 - Math.sin(i / 8 * Math.PI) * 3.6); g.lineTo(x + 1.6, -14 - Math.sin(i / 8 * Math.PI) * 3.4); g.stroke();
      }
      g.restore();
    });

    /* ---------- нос ---------- */
    softStroke(g, 'rgba(150,92,74,0.26)', 3.4, () => { g.moveTo(3.4, -4); g.quadraticCurveTo(4.6, 8, 6, 16.5); });
    softStroke(g, 'rgba(255,243,233,0.55)', 1.6, () => { g.moveTo(-1.2, -2); g.quadraticCurveTo(-0.8, 8, -1.2, 15.5); });
    blob(g, -0.2, 16, 3.2, 2.6, 0, 'rgba(255,240,230,0.55)', 'rgba(255,240,230,0)');
    blob(g, 0, 23.4, 7, 2.2, 0, 'rgba(150,85,70,0.36)', 'rgba(150,85,70,0)');
    [-1, 1].forEach(s => {
      softStroke(g, 'rgba(140,80,64,0.62)', 1.2, () => { g.moveTo(s * 3.8, 16.6); g.bezierCurveTo(s * 7.8, 16.4, s * 8.4, 21, s * 4.8, 22.4); });
      g.fillStyle = 'rgba(88,42,38,0.70)'; g.beginPath(); g.ellipse(s * 2.6, 22.2, 1.9, 1.1, s * -0.3, 0, TAU); g.fill();
    });
    softStroke(g, 'rgba(190,120,104,0.30)', 1, () => { g.moveTo(-2, 24.5); g.quadraticCurveTo(-2.6, 27, -2.8, 29.4); });
    softStroke(g, 'rgba(190,120,104,0.30)', 1, () => { g.moveTo(2, 24.5); g.quadraticCurveTo(2.6, 27, 2.8, 29.4); });

    /* ---------- губы (чуть приоткрыты) ---------- */
    g.fillStyle = 'rgba(70,24,28,0.88)';
    g.beginPath(); g.moveTo(-9, 33.4); g.bezierCurveTo(-5, 32.4, 5, 32.4, 9, 33.4); g.bezierCurveTo(5, 34.8, -5, 34.8, -9, 33.4); g.closePath(); g.fill();
    const ug = g.createLinearGradient(0, 29, 0, 34);
    ug.addColorStop(0, '#c4696a'); ug.addColorStop(1, '#b45558');
    g.fillStyle = ug;
    g.beginPath();
    g.moveTo(-10.4, 33.4);
    g.bezierCurveTo(-7.4, 31.4, -4.2, 29.4, -2.2, 30.3);
    g.bezierCurveTo(-1, 29.6, 1, 29.6, 2.2, 30.3);
    g.bezierCurveTo(4.2, 29.4, 7.4, 31.4, 10.4, 33.4);
    g.bezierCurveTo(6, 32.6, 3, 32.4, 0, 32.7);
    g.bezierCurveTo(-3, 32.4, -6, 32.6, -10.4, 33.4);
    g.closePath(); g.fill();
    const lgp = g.createLinearGradient(0, 34, 0, 41);
    lgp.addColorStop(0, '#d98380'); lgp.addColorStop(1, '#c6686b');
    g.fillStyle = lgp;
    g.beginPath();
    g.moveTo(-10.4, 33.4);
    g.bezierCurveTo(-8, 38.6, -3.6, 40.8, 0, 40.8);
    g.bezierCurveTo(3.6, 40.8, 8, 38.6, 10.4, 33.4);
    g.bezierCurveTo(6, 34.6, 3, 34.6, 0, 34.6);
    g.bezierCurveTo(-3, 34.6, -6, 34.6, -10.4, 33.4);
    g.closePath(); g.fill();
    blob(g, 1.6, 37.2, 4.4, 1.5, 0, 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)');
    softStroke(g, 'rgba(110,50,52,0.55)', 0.8, () => { g.moveTo(-10.6, 33.4); g.lineTo(-11.6, 32.4); });
    softStroke(g, 'rgba(110,50,52,0.55)', 0.8, () => { g.moveTo(10.6, 33.4); g.lineTo(11.6, 32.4); });
  }

  function drawHairCap(g, t) {
    g.save();
    g.shadowColor = 'rgba(60,28,22,0.40)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
    const cap = () => {
      g.beginPath();
      g.moveTo(0, -37);
      g.bezierCurveTo(10, -37, 22, -33, 27, -20);
      g.bezierCurveTo(29.5, -12, 30.5, -2, 31.5, 8);
      g.bezierCurveTo(36, 6, 40.5, -4, 39.5, -22);
      g.bezierCurveTo(37, -42, 22, -56, 0, -56);
      g.bezierCurveTo(-22, -56, -37, -42, -39.5, -22);
      g.bezierCurveTo(-40.5, -4, -36, 6, -31.5, 8);
      g.bezierCurveTo(-30.5, -2, -29.5, -12, -27, -20);
      g.bezierCurveTo(-22, -33, -10, -37, 0, -37);
      g.closePath();
    };
    const hg = g.createLinearGradient(-36, -56, 30, -10);
    hg.addColorStop(0, '#26222e'); hg.addColorStop(0.5, '#141117'); hg.addColorStop(1, '#0a090c');
    cap(); g.fillStyle = hg; g.fill();
    g.restore();
    g.save(); cap(); g.clip();
    // пряди от пробора к вискам
    g.lineCap = 'round';
    [-1, 1].forEach(s => {
      for (let i = 0; i < 9; i++) {
        const k = i / 8;
        g.strokeStyle = i % 3 === 0 ? 'rgba(160,168,225,0.30)' : 'rgba(95,100,140,0.20)';
        g.lineWidth = i % 3 === 0 ? 1.3 : 0.8;
        g.beginPath();
        g.moveTo(s * (0.6 + k * 1.2), -37.5);
        g.bezierCurveTo(s * (10 + k * 4), -43 - k * 4, s * (26 + k * 4), -38 - k * 5, s * (33 + k * 3), -14 + k * 16);
        g.stroke();
      }
    });
    // глянцевая полоса
    const sheen = g.createLinearGradient(-30, 0, 30, 0);
    sheen.addColorStop(0, 'rgba(170,178,240,0)'); sheen.addColorStop(0.3, 'rgba(170,178,240,0.35)'); sheen.addColorStop(0.7, 'rgba(170,178,240,0.12)'); sheen.addColorStop(1, 'rgba(170,178,240,0)');
    g.strokeStyle = sheen; g.lineWidth = 5; g.beginPath(); g.moveTo(-34, -30); g.quadraticCurveTo(0, -62, 34, -30); g.stroke();
    g.restore();
    softStroke(g, 'rgba(0,0,0,0.9)', 1.2, () => {
      g.moveTo(0, -37); g.bezierCurveTo(10, -37, 22, -33, 27, -20); g.bezierCurveTo(29.5, -12, 30.5, -2, 31.5, 8);
    });
    softStroke(g, 'rgba(0,0,0,0.9)', 1.2, () => {
      g.moveTo(0, -37); g.bezierCurveTo(-10, -37, -22, -33, -27, -20); g.bezierCurveTo(-29.5, -12, -30.5, -2, -31.5, 8);
    });
    // пучок волос за ухом, ведущий в косу
    [-1, 1].forEach(s => {
      g.fillStyle = '#100e13'; g.strokeStyle = 'rgba(0,0,0,0.9)'; g.lineWidth = 1;
      g.beginPath();
      g.moveTo(s * 31, 4); g.bezierCurveTo(s * 40, 2, s * 43, 16, s * 39, 29);
      g.lineTo(s * 29, 27); g.bezierCurveTo(s * 30, 18, s * 30, 10, s * 31, 4);
      g.closePath(); g.fill(); g.stroke();
      softStroke(g, 'rgba(160,168,225,0.28)', 1.2, () => { g.moveTo(s * 34, 6); g.quadraticCurveTo(s * 38, 16, s * 35, 26); });
    });
  }

  /* ======================= КОСЫ И ПРЯДИ (мировые координаты) ======================= */
  function resample(P) {
    const N = P.length, pts = [];
    for (let i = 0; i < N - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(N - 1, i + 2)];
      for (let k = 0; k < 4; k++) {
        const u = k / 4, u2 = u * u, u3 = u2 * u;
        const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        pts.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
      }
    }
    pts.push({ x: P[N - 1].x, y: P[N - 1].y });
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    return { pts: pts, cum: cum, total: cum[cum.length - 1] };
  }
  function sampleAt(R, d) {
    const { pts, cum } = R;
    d = clamp(d, 0, R.total);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1] || 1e-4, u = (d - cum[i - 1]) / seg;
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), a: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  function drawBraid(g, ch, s) {
    const R = resample(ch.p), total = R.total;
    const wAt = d => {
      const f = d / total;
      return (17.5 - 8 * Math.pow(f, 0.9)) * (0.78 + 0.22 * Math.min(1, d / 16));
    };
    // подложка (заполняет щели) + мягкая тень на тело
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.38)'; g.shadowBlur = 7; g.shadowOffsetX = -s * 1.5; g.shadowOffsetY = 2;
    g.fillStyle = '#0b0a0e';
    for (let d = 0; d <= total; d += 3) {
      const p = sampleAt(R, d), w = wAt(d);
      g.beginPath(); g.ellipse(p.x, p.y, w * 0.47, w * 0.47, 0, 0, TAU); g.fill();
    }
    g.restore();
    // плетение: перекрёстные пряди
    const step = 6.3;
    for (let d = 0, k = 0; d <= total - 3; d += step, k++) {
      const p = sampleAt(R, d), w = wAt(d), sg = k % 2 ? 1 : -1;
      g.save();
      g.translate(p.x, p.y); g.rotate(p.a + sg * 0.82);
      const rx = w * 0.72, ry = w * 0.27;
      const gr = g.createLinearGradient(0, -ry, 0, ry);
      gr.addColorStop(0, sg > 0 ? '#2b2733' : '#242029'); gr.addColorStop(0.55, '#14111a'); gr.addColorStop(1, '#0a090d');
      g.fillStyle = gr; g.strokeStyle = 'rgba(2,1,4,0.95)'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = sg > 0 ? 'rgba(165,172,235,0.38)' : 'rgba(165,172,235,0.20)'; g.lineWidth = 0.9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-rx * 0.65, -ry * 0.25); g.quadraticCurveTo(0, -ry * 0.75, rx * 0.6, -ry * 0.15); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(-rx * 0.6, ry * 0.2); g.lineTo(rx * 0.6, ry * 0.2); g.stroke();
      g.restore();
    }
    // общий блик вдоль косы (свет слева)
    g.save(); g.lineCap = 'round';
    g.strokeStyle = 'rgba(170,178,240,0.14)'; g.lineWidth = 3;
    g.beginPath();
    for (let d = 4; d <= total - 6; d += 4) {
      const p = sampleAt(R, d), w = wAt(d);
      const nx = -Math.sin(p.a), ny = Math.cos(p.a), off = -w * 0.2;
      if (d === 4) g.moveTo(p.x + nx * off, p.y + ny * off); else g.lineTo(p.x + nx * off, p.y + ny * off);
    }
    g.stroke(); g.restore();
    // резинка и кончик
    const e = sampleAt(R, total - 2), ew = wAt(total) * 0.95;
    g.save(); g.translate(e.x, e.y); g.rotate(e.a);
    g.fillStyle = C.tie; g.strokeStyle = 'rgba(60,10,20,0.9)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(0, 0, 2.6, ew * 0.58, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
    const tip = sampleAt(R, total), pre = sampleAt(R, total - 8);
    const ang = Math.atan2(tip.y - pre.y, tip.x - pre.x);
    g.save(); g.translate(tip.x, tip.y); g.lineCap = 'round';
    for (let i = -3; i <= 3; i++) {
      g.strokeStyle = i % 2 ? '#0f0d12' : '#1c1923'; g.lineWidth = 1.5 - Math.abs(i) * 0.15;
      const a2 = ang + i * 0.09, len = 15 - Math.abs(i) * 1.6;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(a2) * len * 0.5 + i * 0.5, Math.sin(a2) * len * 0.5, Math.cos(a2 + i * 0.03) * len, Math.sin(a2 + i * 0.03) * len);
      g.stroke();
    }
    g.restore();
  }

  function drawStrand(g, ch) {
    const R = resample(ch.p), total = R.total;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      let prev = null;
      for (let d = 0; d <= total; d += 2) {
        const p = sampleAt(R, d), f = d / total;
        if (prev) {
          g.strokeStyle = pass === 0 ? '#0a090c' : 'rgba(160,168,225,0.30)';
          g.lineWidth = pass === 0 ? (2.4 - f * 1.7) : (0.8 - f * 0.5);
          g.beginPath(); g.moveTo(prev.x + (pass ? -0.5 : 0), prev.y); g.lineTo(p.x + (pass ? -0.5 : 0), p.y); g.stroke();
        }
        prev = p;
      }
    }
    g.restore();
  }

  /* ======================= ГЛАВНАЯ ФУНКЦИЯ ======================= */
  function draw(g, cx, footY, scale, t) {
    g.save();
    g.translate(cx, footY);
    g.scale(scale, scale);

    const b = Math.sin(t * 1.7);
    const lean = Math.sin(t * 0.9) * 0.010 + Math.sin(t * 0.37) * 0.004;
    const tilt = Math.sin(t * 0.6) * 0.022 + Math.sin(t * 1.3 + 1) * 0.006;
    const bob = b * 0.6;
    const H = headWorld(lean, tilt, bob);
    physUpdate(t, H);

    // взгляд и моргание
    let gx = Math.sin(t * 0.31) * 0.35, gy = Math.sin(t * 0.23) * 0.2;
    const look = (typeof window !== 'undefined' && window.girlLook) || (typeof globalThis !== 'undefined' && globalThis.girlLook);
    if (look) { gx = clamp(look.x || 0, -1, 1); gy = clamp(look.y || 0, -1, 1); }
    let open = 1;
    [[4.1, 3.95, 0.16], [6.7, 6.5, 0.16]].forEach(bl => {
      const ph = t % bl[0];
      if (ph > bl[1] && ph < bl[1] + bl[2]) open = Math.min(open, Math.abs(Math.cos((ph - bl[1]) / bl[2] * Math.PI)) * 0.95 + 0.05);
    });

    // тень под ногами
    g.save();
    const sg = g.createRadialGradient(0, 4, 4, 0, 4, 70);
    sg.addColorStop(0, 'rgba(0,0,0,0.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg; g.beginPath(); g.ellipse(0, 4, 70, 13, 0, 0, TAU); g.fill();
    g.restore();

    // низ
    drawShoe(g, -1); drawShoe(g, 1);
    drawLeg(g, -1); drawLeg(g, 1);

    // верх тела — с лёгким наклоном и дыханием
    g.save();
    g.translate(0, -330); g.rotate(lean); g.translate(0, 330);

    g.save();
    g.translate(0, -400); g.scale(1 + b * 0.003, 1 + b * 0.006); g.translate(0, 400);
    drawTorsoSkin(g, b);
    drawArm(g, -1, b); drawArm(g, 1, b);
    drawTank(g, b);
    g.restore();
    drawJeansTop(g);

    g.save();
    g.translate(0, -590 + bob); g.rotate(tilt); g.scale(1.14, 1.1);
    drawHead(g, t, open, gx, gy);
    drawHairCap(g, t);
    g.restore();
    g.restore();

    // физические волосы поверх всего (мировые координаты фигуры)
    PH.strand.forEach(st => drawStrand(g, st.ch));
    [-1, 1].forEach(s => drawBraid(g, PH.braid[s], s));

    // тёплый свет лампы
    if ((typeof window !== 'undefined' && window.lampOn) || (typeof globalThis !== 'undefined' && globalThis.lampOn)) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const lg = g.createLinearGradient(0, -640, 0, 0);
      lg.addColorStop(0, 'rgba(255,240,200,0.14)'); lg.addColorStop(0.7, 'rgba(255,235,190,0.04)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.beginPath(); g.ellipse(0, -320, 90, 335, 0, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  }

  const RIG = {
    wind: 0,
    impulse: function (vx) {
      const h = 1 / 120;
      Object.keys(PH.braid).forEach(k => {
        const p = PH.braid[k].p;
        p.forEach((q, i) => { q.px -= vx * h * h * 60 * (i / p.length + 0.3); });
      });
      PH.strand.forEach(st => st.ch.p.forEach((q, i) => { q.px -= vx * h * h * 80 * (i / st.len + 0.3); }));
    },
    draw: draw
  };
  return RIG;
})();

function drawGirl(g, cx, footY, scale, t) {
  GirlRig.draw(g, cx, footY, scale, t);
}

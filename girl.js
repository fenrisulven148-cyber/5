"use strict";
/* ============================================================
   ДЕТАЛИЗИРОВАННАЯ АНИМЕ-ДЕВУШКА В ПОЛНЫЙ РОСТ — v2
   Черные волосы + две косички, белая майка без рукавов,
   выраженное декольте, ключицы, шея, черные джинсы,
   голубые глаза, более «взрослое» лицо (меньше анимешности).
   Вызывается: drawGirl(ctx, cx, footY, scale, t)
   Координаты: стопы в y=0, макушка ~y=-640.
   ============================================================ */

/* Физика кос: Verlet-интеграция + ограничения длины сегментов.
   Состояние хранится отдельно для каждого canvas-контекста. */
const _girlBraidPhysics = new WeakMap();

function _makeBraidChain(side, anchorX, anchorY, count = 19, step = 16.2) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const x = anchorX + side * Math.sin(i * 0.36) * (i * 0.12);
    const y = anchorY + i * step;
    points.push({ x, y, px: x, py: y });
  }
  return { side, points, step };
}

function _updateGirlBraids(ctx, t, sway, breath) {
  const leftAnchor  = { x: -25 + sway * 1.2, y: -610 + breath * 0.18 };
  const rightAnchor = { x:  25 + sway * 1.2, y: -610 + breath * 0.18 };
  let state = _girlBraidPhysics.get(ctx);
  if (!state) {
    state = {
      lastT: t,
      accumulator: 0,
      left: _makeBraidChain(-1, leftAnchor.x, leftAnchor.y),
      right: _makeBraidChain(1, rightAnchor.x, rightAnchor.y)
    };
    _girlBraidPhysics.set(ctx, state);
  }

  const dt = Math.max(0, Math.min(0.075, t - state.lastT));
  state.lastT = t;
  state.accumulator += dt;
  const h = 1 / 60;

  function stepChain(chain, anchor, simT) {
    const pts = chain.points;
    const root = pts[0];
    root.x = anchor.x; root.y = anchor.y;
    root.px = anchor.x; root.py = anchor.y;

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      const vx = (p.x - p.px) * 0.986;
      const vy = (p.y - p.py) * 0.986;
      p.px = p.x; p.py = p.y;
      // Гравитация, лёгкая воздушная турбулентность и запаздывание волос.
      p.x += vx + Math.sin(simT * 2.1 + i * 0.43 + chain.side) * 0.055 * (i / pts.length);
      p.y += vy + 0.19;
    }

    const rest = chain.step;
    for (let iteration = 0; iteration < 6; iteration++) {
      pts[0].x = anchor.x; pts[0].y = anchor.y;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(0.0001, Math.hypot(dx, dy));
        const correction = (d - rest) / d;
        if (i === 1) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        } else {
          a.x += dx * correction * 0.5;
          a.y += dy * correction * 0.5;
          b.x -= dx * correction * 0.5;
          b.y -= dy * correction * 0.5;
        }
      }
    }
    pts[0].x = anchor.x; pts[0].y = anchor.y;
  }

  // Фиксированный шаг не даёт косам дрожать при разном FPS.
  while (state.accumulator >= h) {
    const simT = t - state.accumulator + h;
    stepChain(state.left, leftAnchor, simT);
    stepChain(state.right, rightAnchor, simT);
    state.accumulator -= h;
  }
  // Слегка подвинуть корни и при очень коротком кадре.
  state.left.points[0].x = leftAnchor.x;
  state.left.points[0].y = leftAnchor.y;
  state.right.points[0].x = rightAnchor.x;
  state.right.points[0].y = rightAnchor.y;
  return { left: state.left.points, right: state.right.points };
}

function drawGirl(g, cx, footY, scale, t){
  t = Number.isFinite(t) ? t : 0;
  g.save();
  g.translate(cx, footY);
  // Чуть более естественная ширина плеч и корпуса; лицо ниже компенсирует масштаб.
  const bodyWidth = 1.45;
  g.scale(scale * bodyWidth, scale);

  /* ---- палитра ---- */
  const C = {
    skin:    '#ffe0cf',
    skinMid: '#f5c3ac',
    skinSh:  '#e0a186',
    skinDk:  '#c98a6f',
    line:    '#3a2a28',
    eyeW:    '#fdfdfd',
    iris1:   '#bfe6ff', iris2: '#4aa3e8', iris3: '#1b5fa8',
    pupil:   '#10233c',
    hair:    '#17141a',
    hairMid: '#2b2733',
    hairHi:  '#5d5674',
    tank:    '#f7f5f0',
    tankSh:  '#ddd8cf',
    tankDk:  '#c4beb2',
    jeans:   '#22242c',
    jeansLt: '#343846',
    jeansSeam:'#4a5063',
    belt:    '#15151a',
    shoe:    '#efece6',
    shoeSole:'#c9c6bf',
    shoeDk:  '#8f8c86',
    lip1:    '#d97b74', lip2:'#b25a56'
  };
  const stroke = (w)=>{ g.strokeStyle=C.line; g.lineWidth=w||2.2; g.lineJoin='round'; g.lineCap='round'; };

  const br   = Math.sin(t*1.7)*1.5;      // дыхание
  const sway = Math.sin(t*1.0);          // покачивание корпуса
  const hairSw = Math.sin(t*1.3);        // пряди
  const braidSwL = Math.sin(t*1.2)*3;    // качание косичек
  const braidSwR = Math.sin(t*1.2+0.7)*3;
  const braidPoints = _updateGirlBraids(g, t, sway, br);

  /* ================= ТЕНЬ ПОД НОГАМИ ================= */
  g.save();
  g.fillStyle='rgba(0,0,0,0.30)';
  g.beginPath(); g.ellipse(0,4,60,11,0,0,Math.PI*2); g.fill();
  g.restore();

  /* ================= ВОЛОСЫ — ЗАДНИЙ СЛОЙ (черные, длинные) ================= */
  g.save();
  g.scale(1/bodyWidth, 1);
  g.fillStyle=C.hair; stroke(2.4);
  g.beginPath();
  g.moveTo(-48,-560);
  g.bezierCurveTo(-74,-480+hairSw*2, -70,-340, -56,-250+hairSw*4);
  g.bezierCurveTo(-50,-214, -32,-206, -26,-246);
  g.lineTo(26,-246);
  g.bezierCurveTo(32,-206, 50,-214, 56,-250-hairSw*4);
  g.bezierCurveTo(70,-340, 74,-480, 48,-560);
  g.bezierCurveTo(30,-612, -30,-612, -48,-560);
  g.closePath(); g.fill(); g.stroke();
  // тёмно-серые прядевые блики на черных волосах
  g.strokeStyle=C.hairMid; g.lineWidth=4; g.lineCap='round';
  g.beginPath(); g.moveTo(-40,-520); g.quadraticCurveTo(-52,-390,-44,-270); g.stroke();
  g.beginPath(); g.moveTo(40,-520);  g.quadraticCurveTo(52,-390,44,-270);  g.stroke();
  g.strokeStyle=C.hairHi; g.lineWidth=2;
  g.beginPath(); g.moveTo(-30,-500); g.quadraticCurveTo(-40,-400,-34,-300); g.stroke();
  g.beginPath(); g.moveTo(30,-500);  g.quadraticCurveTo(40,-400,34,-300);  g.stroke();
  g.restore();

  /* ================= ДВЕ ЧЁРНЫЕ КОСЫ С ФИЗИКОЙ ================= */
  function braid(points, side) {
    g.save();
    const count = points.length;
    const widthAt = (i) => 8.7 - (i / (count - 1)) * 3.2;

    // Теневая основа плетения с плавной линией.
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < count - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) * 0.5;
      const my = (points[i].y + points[i + 1].y) * 0.5;
      g.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    g.lineTo(points[count - 1].x, points[count - 1].y);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#09090c'; g.lineWidth = 15.5; g.stroke();
    g.strokeStyle = 'rgba(57,53,67,0.72)'; g.lineWidth = 8.5; g.stroke();

    // Переплетённые пряди: каждая следующая перекрывает предыдущую.
    for (let i = 0; i < count - 1; i++) {
      const a = points[i], b = points[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.max(0.001, Math.hypot(dx, dy));
      const nx = -dy / len, ny = dx / len;
      const phase = (i % 2 === 0 ? -1 : 1) * side;
      const mx = (a.x + b.x) * 0.5 + nx * phase * 2.6;
      const my = (a.y + b.y) * 0.5 + ny * phase * 2.6;
      const ang = Math.atan2(dy, dx) + phase * 0.18;
      const rw = widthAt(i);
      const rh = 10.1 - (i / (count - 1)) * 3.4;

      const strand = g.createLinearGradient(mx - rw, my - rh, mx + rw, my + rh);
      strand.addColorStop(0, '#111116');
      strand.addColorStop(0.30, '#302c39');
      strand.addColorStop(0.58, '#19171f');
      strand.addColorStop(1, '#08080b');
      g.fillStyle = strand;
      g.strokeStyle = 'rgba(4,4,7,0.88)'; g.lineWidth = 0.9;
      g.beginPath(); g.ellipse(mx, my, rw, rh, ang, 0, Math.PI * 2); g.fill(); g.stroke();

      // Узкий глянцевый блик на каждой лопасти.
      g.strokeStyle = i % 2 === 0 ? 'rgba(137,127,157,0.58)' : 'rgba(91,84,109,0.48)';
      g.lineWidth = 1.25;
      g.beginPath();
      g.moveTo(mx - nx * rw * 0.42 - dx / len * rh * 0.2,
               my - ny * rw * 0.42 - dy / len * rh * 0.2);
      g.quadraticCurveTo(mx - nx * rw * 0.15, my - ny * rw * 0.15,
                         mx + nx * rw * 0.35 + dx / len * rh * 0.22,
                         my + ny * rw * 0.35 + dy / len * rh * 0.22);
      g.stroke();
    }

    // Кончик и маленькая тёмная резинка.
    const tip = points[count - 1];
    g.fillStyle = '#111015';
    g.strokeStyle = '#050507'; g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(tip.x, tip.y + 2, 4.2, 6.6, side * 0.18, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.fillStyle = '#3f3948';
    g.beginPath(); g.ellipse(tip.x, tip.y - 6, 5.2, 2.6, side * 0.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  braid(braidPoints.left, -1);
  braid(braidPoints.right, 1);

  /* ================= НОГИ В ЧЕРНЫХ ДЖИНСАХ ================= */
  function leg(side){
    const x = side*16;
    g.save();
    // штанина: бедро -> колено -> щиколотка
    g.fillStyle=C.jeans; stroke(2.4);
    g.beginPath();
    g.moveTo(x-16,-262);                       // верх у талии
    g.bezierCurveTo(x-18,-190, x-15,-120, x-12,-58);  // внешняя
    g.lineTo(x+12,-58);
    g.bezierCurveTo(x+15,-120, x+18,-190, x+16,-262); // внутренняя/внешн.
    g.closePath(); g.fill(); g.stroke();
    // осветление внешней стороны (объём)
    const lg=g.createLinearGradient(x-16,0,x+16,0);
    lg.addColorStop(0,'rgba(255,255,255,0.10)');
    lg.addColorStop(0.4,'rgba(255,255,255,0.0)');
    lg.addColorStop(1,'rgba(0,0,0,0.28)');
    g.fillStyle=lg;
    g.beginPath();
    g.moveTo(x-16,-262);
    g.bezierCurveTo(x-18,-190, x-15,-120, x-12,-58);
    g.lineTo(x+12,-58);
    g.bezierCurveTo(x+15,-120, x+18,-190, x+16,-262);
    g.closePath(); g.fill();
    // складки у колена и паха
    g.strokeStyle=C.jeansSeam; g.lineWidth=1.6;
    g.beginPath(); g.moveTo(x-12,-150); g.quadraticCurveTo(x,-144,x+12,-150); g.stroke();
    g.beginPath(); g.moveTo(x-11,-138); g.quadraticCurveTo(x,-133,x+11,-138); g.stroke();
    g.beginPath(); g.moveTo(x-10,-58);  g.quadraticCurveTo(x,-54,x+10,-58);  g.stroke();
    // вертикальный шов
    g.strokeStyle='rgba(120,130,155,0.5)'; g.lineWidth=1.2;
    g.setLineDash([4,4]);
    g.beginPath(); g.moveTo(x,-258); g.lineTo(x,-60); g.stroke();
    g.setLineDash([]);
    // подворот / низ брюк
    g.fillStyle=C.jeansLt; stroke(2.2);
    g.beginPath();
    g.moveTo(x-13,-66); g.lineTo(x+13,-66); g.lineTo(x+12,-54); g.lineTo(x-12,-54);
    g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  leg(-1); leg(1);

  /* ================= КРОССОВКИ (белые) ================= */
  function shoe(side){
    const x=side*16;
    g.save();
    g.fillStyle=C.shoe; stroke(2.2);
    g.beginPath();
    g.moveTo(x-12,-56);
    g.lineTo(x-12,-16);
    g.quadraticCurveTo(x-12,-6, x+side*2,-6);
    g.lineTo(x+side*26,-6);
    g.quadraticCurveTo(x+side*31,-9, x+side*30,-16);
    g.quadraticCurveTo(x+side*24,-34, x+10,-40);
    g.quadraticCurveTo(x+4,-52, x-4,-56);
    g.closePath(); g.fill(); g.stroke();
    // подошва
    g.fillStyle=C.shoeSole; stroke(2);
    g.beginPath();
    g.moveTo(x-12,-14);
    g.lineTo(x-12,-6);
    g.quadraticCurveTo(x-12,-2, x+side*4,-2);
    g.lineTo(x+side*27,-2);
    g.quadraticCurveTo(x+side*31,-4, x+side*30,-9);
    g.lineTo(x+side*28,-12);
    g.closePath(); g.fill(); g.stroke();
    // шнуровка
    g.strokeStyle=C.shoeDk; g.lineWidth=1.6;
    for(let i=0;i<3;i++){
      g.beginPath();
      g.moveTo(x+side*2+i*side*7,-18-i*2);
      g.lineTo(x+side*9+i*side*7,-24-i*2);
      g.stroke();
    }
    // носок-резинка
    g.beginPath(); g.moveTo(x+side*20,-8); g.quadraticCurveTo(x+side*28,-10,x+side*29,-15); g.stroke();
    g.restore();
  }
  shoe(-1); shoe(1);

  /* ================= БЕДРА / ПОЯС ДЖИНСОВ ================= */
  g.save();
  g.fillStyle=C.jeans; stroke(2.4);
  g.beginPath();
  g.moveTo(-34,-300);
  g.bezierCurveTo(-40,-286, -38,-262, -32,-252);
  g.lineTo(32,-252);
  g.bezierCurveTo(38,-262, 40,-286, 34,-300);
  g.quadraticCurveTo(0,-310, -34,-300);
  g.closePath(); g.fill(); g.stroke();
  // ремень
  g.fillStyle=C.belt; stroke(1.8);
  g.beginPath();
  g.moveTo(-34,-302); g.quadraticCurveTo(0,-312,34,-302);
  g.lineTo(34,-294); g.quadraticCurveTo(0,-304,-34,-294);
  g.closePath(); g.fill(); g.stroke();
  // пряжка
  g.fillStyle='#b8a25c'; stroke(1.4);
  g.fillRect(-5,-303,10,8); g.strokeRect(-5,-303,10,8);
  // молния по центру + швы карманов
  g.strokeStyle=C.jeansSeam; g.lineWidth=1.6;
  g.beginPath(); g.moveTo(0,-294); g.lineTo(0,-258); g.stroke();
  g.beginPath(); g.moveTo(-26,-292); g.quadraticCurveTo(-18,-284,-14,-272); g.stroke();
  g.beginPath(); g.moveTo(26,-292);  g.quadraticCurveTo(18,-284,14,-272);  g.stroke();
  g.restore();

  /* ================= РУКИ (голые, детальная анатомия) ================= */
  function arm(side){
    g.save();
    // дельтоид + плечо
    g.fillStyle=C.skin; stroke(2.2);
    g.beginPath();
    g.moveTo(side*26,-462+br*0.4);
    g.bezierCurveTo(side*42,-452, side*46,-420, side*44,-392);   // наружная
    g.bezierCurveTo(side*42,-368, side*40,-352, side*39,-338);
    g.lineTo(side*27,-336);                                       // внутр. локоть
    g.bezierCurveTo(side*28,-360, side*30,-390, side*28,-420);
    g.bezierCurveTo(side*26,-444, side*22,-456, side*26,-462+br*0.4);
    g.closePath(); g.fill(); g.stroke();
    // предплечье
    g.beginPath();
    g.moveTo(side*39,-338);
    g.bezierCurveTo(side*41,-300, side*39,-262, side*36,-232);
    g.lineTo(side*26,-230);
    g.bezierCurveTo(side*27,-262, side*27,-300, side*27,-336);
    g.closePath(); g.fill(); g.stroke();
    // тень трицепса/бицепса
    g.fillStyle='rgba(201,138,111,0.35)';
    g.beginPath();
    g.moveTo(side*30,-450);
    g.bezierCurveTo(side*34,-420, side*33,-380, side*31,-345);
    g.lineTo(side*28,-345);
    g.bezierCurveTo(side*29,-382, side*29,-420, side*27,-448);
    g.closePath(); g.fill();
    // блик на плече
    g.fillStyle='rgba(255,240,225,0.5)';
    g.beginPath(); g.ellipse(side*36,-440,5,10,side*0.4,0,Math.PI*2); g.fill();
    // локтевая ямочка
    g.strokeStyle='rgba(201,138,111,0.7)'; g.lineWidth=1.6;
    g.beginPath(); g.arc(side*33,-336,4,side>0?-0.4:Math.PI-0.6, side>0?1.4:Math.PI+1.2); g.stroke();
    // кисть
    g.fillStyle=C.skin; stroke(2);
    g.beginPath();
    g.moveTo(side*36,-232);
    g.bezierCurveTo(side*38,-216, side*36,-200, side*32,-192);
    g.bezierCurveTo(side*28,-188, side*24,-192, side*24,-204);
    g.lineTo(side*26,-230);
    g.closePath(); g.fill(); g.stroke();
    // пальцы
    g.strokeStyle='rgba(201,138,111,0.8)'; g.lineWidth=1.4;
    for(let i=0;i<3;i++){
      g.beginPath();
      g.moveTo(side*(30+i*2.4),-206); g.lineTo(side*(29+i*2.4),-192);
      g.stroke();
    }
    g.restore();
  }
  arm(-1); arm(1);

  /* ================= ТОРС: БЕЛАЯ МАЙКА + ГРУДЬ + ДЕКОЛЬТЕ ================= */
  g.save();
  // корпус под майкой (талия)
  g.fillStyle=C.tank; stroke(2.4);
  g.beginPath();
  g.moveTo(-27,-464+br*0.5);                       // левое плечо (вырез позже)
  g.bezierCurveTo(-38,-430, -36,-360, -30,-300);   // бок до талии
  g.lineTo(30,-300);
  g.bezierCurveTo(36,-360, 38,-430, 27,-464+br*0.5);
  g.quadraticCurveTo(0,-478-br, -27,-464+br*0.5);
  g.closePath(); g.fill(); g.stroke();

  // ткань: мягкие тени складок
  g.fillStyle='rgba(196,190,178,0.55)';
  g.beginPath();
  g.moveTo(-28,-340); g.quadraticCurveTo(-10,-330,-2,-346);
  g.quadraticCurveTo(-14,-326,-28,-328); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(28,-340); g.quadraticCurveTo(10,-330,2,-346);
  g.quadraticCurveTo(14,-326,28,-328); g.closePath(); g.fill();
  // вертикальная тень по правому боку (свет слева-сверху от лампы)
  const tg=g.createLinearGradient(38,0,-20,0);
  tg.addColorStop(0,'rgba(120,110,100,0.30)');
  tg.addColorStop(0.5,'rgba(120,110,100,0.0)');
  tg.addColorStop(1,'rgba(255,255,255,0.10)');
  g.fillStyle=tg;
  g.beginPath();
  g.moveTo(-27,-464+br*0.5);
  g.bezierCurveTo(-38,-430, -36,-360, -30,-300);
  g.lineTo(30,-300);
  g.bezierCurveTo(36,-360, 38,-430, 27,-464+br*0.5);
  g.quadraticCurveTo(0,-478-br, -27,-464+br*0.5);
  g.closePath(); g.fill();

  /* --- ГОЛЫЕ ПЛЕЧИ И ЗОНА ВЫРЕЗА (кожа сверху майки) --- */
  g.fillStyle=C.skin; stroke(2.2);
  // большая область декольте: трапеция кожи от шеи вниз между грудей
  g.beginPath();
  g.moveTo(-24,-470+br*0.5);
  g.quadraticCurveTo(0,-482+br*0.5, 24,-470+br*0.5);
  g.bezierCurveTo(30,-452, 26,-436, 20,-424);      // правый край выреза
  g.quadraticCurveTo(0,-402+br, -20,-424);          // глубокое V/U декольте
  g.bezierCurveTo(-26,-436, -30,-452, -24,-470+br*0.5);
  g.closePath(); g.fill(); g.stroke();
  // тень под вырезом майки на коже
  g.fillStyle='rgba(201,138,111,0.30)';
  g.beginPath();
  g.moveTo(-20,-424); g.quadraticCurveTo(0,-402+br,20,-424);
  g.quadraticCurveTo(0,-412+br,-20,-424); g.closePath(); g.fill();

  /* --- ОБЪЁМ ГРУДИ ПОД ТКАНЬЮ МАЙКИ --- */
  // Мягкие светотени показывают объём формы одежды, не рисуя кожу поверх ткани.
  function fabricVolume(side) {
    const bx = side * 14.2;
    const by = -397 + br * 0.55;
    g.save();
    g.beginPath();
    g.ellipse(bx, by, 22.5, 30, side * -0.08, 0, Math.PI * 2);
    g.clip();
    const vol = g.createRadialGradient(bx - side * 5 - 4, by - 10, 2, bx, by + 3, 32);
    vol.addColorStop(0, 'rgba(255,255,255,0.58)');
    vol.addColorStop(0.42, 'rgba(255,253,248,0.18)');
    vol.addColorStop(0.76, 'rgba(197,188,178,0.20)');
    vol.addColorStop(1, 'rgba(154,143,132,0.30)');
    g.fillStyle = vol;
    g.beginPath(); g.ellipse(bx, by, 23, 31, side * -0.08, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  fabricVolume(-1); fabricVolume(1);

  // Едва заметная центральная тень и подгрудные складки ткани.
  g.strokeStyle = 'rgba(170,160,149,0.42)'; g.lineWidth = 1.55; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0,-415+br*0.5); g.quadraticCurveTo(-1,-399+br*0.5,0,-383+br*0.5); g.stroke();
  g.strokeStyle = 'rgba(190,181,170,0.54)'; g.lineWidth = 1.35;
  g.beginPath(); g.moveTo(-34,-371); g.quadraticCurveTo(-22,-364,-9,-370); g.stroke();
  g.beginPath(); g.moveTo(34,-371); g.quadraticCurveTo(22,-364,9,-370); g.stroke();

  /* --- КЛЮЧИЦЫ --- */
  g.strokeStyle='rgba(190,125,100,0.8)'; g.lineWidth=2.2; g.lineCap='round';
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.moveTo(s*4,-466+br*0.5);
    g.quadraticCurveTo(s*14,-470+br*0.5, s*24,-464+br*0.5);
    g.stroke();
  });
  // яремная ямка над грудиной
  g.fillStyle='rgba(170,110,88,0.5)';
  g.beginPath(); g.ellipse(0,-462+br*0.5,3.5,5,0,0,Math.PI*2); g.fill();

  /* --- лямки майки поверх плеч --- */
  g.fillStyle=C.tank; stroke(2.2);
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.moveTo(s*20,-474+br*0.5);
    g.quadraticCurveTo(s*30,-478+br*0.5, s*33,-466+br*0.5);
    g.lineTo(s*27,-458+br*0.5);
    g.quadraticCurveTo(s*24,-468+br*0.5, s*16,-466+br*0.5);
    g.closePath(); g.fill(); g.stroke();
  });
  // окантовка выреза
  g.strokeStyle=C.tankDk; g.lineWidth=2.6;
  g.beginPath();
  g.moveTo(-20,-424);
  g.quadraticCurveTo(0,-402+br, 20,-424);
  g.bezierCurveTo(26,-436, 30,-452, 24,-470+br*0.5);
  g.stroke();
  g.beginPath();
  g.moveTo(-20,-424);
  g.bezierCurveTo(-26,-436, -30,-452, -24,-470+br*0.5);
  g.stroke();
  g.restore();

  /* ================= ШЕЯ (выраженная, с грудино-ключично-сосцевидной) ================= */
  g.save();
  g.fillStyle=C.skin; stroke(2.2);
  g.beginPath();
  g.moveTo(-10,-508);
  g.lineTo(-12,-472+br*0.5);
  g.quadraticCurveTo(0,-464+br*0.5, 12,-472+br*0.5);
  g.lineTo(10,-508);
  g.closePath(); g.fill(); g.stroke();
  // тень шеи от подбородка
  g.fillStyle='rgba(180,115,90,0.45)';
  g.beginPath();
  g.moveTo(-10,-506); g.quadraticCurveTo(0,-494,10,-506);
  g.quadraticCurveTo(0,-484,-10,-506); g.closePath(); g.fill();
  // ГКМ мышцы (два тяжа к ключицам)
  g.strokeStyle='rgba(201,138,111,0.7)'; g.lineWidth=1.8;
  g.beginPath(); g.moveTo(-6,-500); g.quadraticCurveTo(-9,-484,-10,-472+br*0.5); g.stroke();
  g.beginPath(); g.moveTo(6,-500);  g.quadraticCurveTo(9,-484,10,-472+br*0.5);  g.stroke();
  g.restore();

  /* ================= ГОЛОВА (более реалистичные пропорции) ================= */
  const hy=-566;
  g.save();
  g.translate(0,hy);
  g.rotate(sway*0.010);
  g.scale(1/bodyWidth, 1);

  // череп + лицо: овальное, вытянутое, не «кукольное»
  g.fillStyle=C.skin; stroke(2.6);
  g.beginPath();
  g.moveTo(0,50);                                  // подбородок (мягкий, чуть заострённый)
  g.bezierCurveTo(-20,48, -40,30, -45,2);          // линия челюсти
  g.bezierCurveTo(-48,-26, -40,-58, 0,-62);
  g.bezierCurveTo(40,-58, 48,-26, 45,2);
  g.bezierCurveTo(40,30, 20,48, 0,50);
  g.closePath(); g.fill(); g.stroke();

  // уши
  [[-1],[1]].forEach(([s])=>{
    g.fillStyle=C.skin; stroke(2);
    g.beginPath();
    g.ellipse(s*45,-2,6,12,s*0.15,0,Math.PI*2);
    g.fill(); g.stroke();
    g.strokeStyle='rgba(201,138,111,0.8)'; g.lineWidth=1.4;
    g.beginPath(); g.ellipse(s*45,-2,3,7,s*0.15,0,Math.PI*2); g.stroke();
  });

  // лёгкая тень скулы/виска
  g.fillStyle='rgba(224,161,134,0.35)';
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.moveTo(s*38,8); g.quadraticCurveTo(s*30,26,s*16,38);
    g.quadraticCurveTo(s*28,22,s*38,8); g.closePath(); g.fill();
  });

  /* ГЛАЗА — голубые, миндалевидные, спокойные (не огромные) */
  const blink = (Math.sin(t*0.8)>0.992)?1:0;
  function eye(side){
    g.save();
    g.translate(side*19,-8);
    if(blink){
      g.strokeStyle=C.line; g.lineWidth=2.6;
      g.beginPath(); g.moveTo(-11,0); g.quadraticCurveTo(0,3,11,0); g.stroke();
    } else {
      // разрез глаза — миндалина
      g.fillStyle=C.eyeW; stroke(2);
      g.beginPath();
      g.moveTo(-11,1);
      g.bezierCurveTo(-9,-8, 9,-9, 11,-1);
      g.bezierCurveTo(8,6, -8,6, -11,1);
      g.closePath(); g.fill(); g.stroke();
      // радужка (голубая)
      const grad=g.createRadialGradient(0,-1,1.5,0,-1,7);
      grad.addColorStop(0,C.iris1); grad.addColorStop(0.6,C.iris2); grad.addColorStop(1,C.iris3);
      g.fillStyle=grad;
      g.beginPath(); g.arc(0,-1,6.2,0,Math.PI*2); g.fill();
      // радиальные штрихи радужки
      g.strokeStyle='rgba(255,255,255,0.35)'; g.lineWidth=0.8;
      for(let a=0;a<6;a++){
        const ang=a*Math.PI/3+0.4;
        g.beginPath();
        g.moveTo(Math.cos(ang)*2.4, -1+Math.sin(ang)*2.4);
        g.lineTo(Math.cos(ang)*5.6, -1+Math.sin(ang)*5.6);
        g.stroke();
      }
      // лимб (тёмное кольцо)
      g.strokeStyle='rgba(20,50,90,0.9)'; g.lineWidth=1.4;
      g.beginPath(); g.arc(0,-1,6.2,0,Math.PI*2); g.stroke();
      // зрачок
      g.fillStyle=C.pupil;
      g.beginPath(); g.arc(0,-1,2.8,0,Math.PI*2); g.fill();
      // блики окна/лампы
      g.fillStyle='rgba(255,255,255,0.95)';
      g.beginPath(); g.arc(-2.2,-3.4,1.6,0,Math.PI*2); g.fill();
      g.fillStyle='rgba(255,255,255,0.6)';
      g.beginPath(); g.arc(2.4,1.6,0.9,0,Math.PI*2); g.fill();
      // тень верхнего века внутри глаза
      g.fillStyle='rgba(60,40,40,0.25)';
      g.beginPath();
      g.moveTo(-10.5,0); g.bezierCurveTo(-8.5,-7.5,8.5,-8.5,10.5,-1);
      g.bezierCurveTo(5,-3.5,-5,-3.5,-10.5,0); g.closePath(); g.fill();
    }
    // верхняя ресничная линия (толстая, естественная)
    g.strokeStyle='#241a18'; g.lineWidth=2.8; g.lineCap='round';
    g.beginPath();
    g.moveTo(-11.5,0.5); g.bezierCurveTo(-9,-9.5,9,-10.5,11.5,-1.5);
    g.stroke();
    // отдельные ресницы
    g.lineWidth=1.4;
    g.beginPath(); g.moveTo(9,-6); g.lineTo(13,-9); g.stroke();
    g.beginPath(); g.moveTo(4,-8.6); g.lineTo(6,-12); g.stroke();
    g.beginPath(); g.moveTo(-11,-2); g.lineTo(-14,-4); g.stroke();
    // нижнее веко — тонкая линия
    g.strokeStyle='rgba(150,100,85,0.6)'; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(-9,4.5); g.quadraticCurveTo(0,6.5,9,3.5); g.stroke();
    // бровь — аккуратная дуга
    g.strokeStyle=C.hair; g.lineWidth=3; g.lineCap='round';
    g.beginPath();
    g.moveTo(side*-10,-19); g.quadraticCurveTo(side*1,-24, side*11,-20);
    g.stroke();
    g.restore();
  }
  eye(-1); eye(1);

  // нос — спинка + кончик + ноздри
  g.strokeStyle='rgba(201,138,111,0.85)'; g.lineWidth=1.8;
  g.beginPath(); g.moveTo(2,-2); g.quadraticCurveTo(3,10,0,17); g.stroke();     // спинка
  g.fillStyle='rgba(224,161,134,0.5)';
  g.beginPath(); g.ellipse(0,19,4.5,3,0,0,Math.PI*2); g.fill();                  // кончик
  g.strokeStyle='rgba(150,90,70,0.8)'; g.lineWidth=1.4;
  g.beginPath(); g.arc(-4.5,19,2,Math.PI*0.2,Math.PI*0.9); g.stroke();           // ноздря L
  g.beginPath(); g.arc(4.5,19,2,Math.PI*1.1,Math.PI*1.8);  g.stroke();           // ноздря R
  // блик спинки носа
  g.fillStyle='rgba(255,246,235,0.6)';
  g.beginPath(); g.ellipse(1.5,6,1.6,7,0.1,0,Math.PI*2); g.fill();

  // рот — fuller губы, спокойная полуулыбка
  g.save();
  g.translate(0,31);
  // верхняя губа
  g.fillStyle=C.lip2;
  g.beginPath();
  g.moveTo(-9,0);
  g.quadraticCurveTo(-4,-4,0,-2.5);
  g.quadraticCurveTo(4,-4,9,0);
  g.quadraticCurveTo(4,1.5,0,1.2);
  g.quadraticCurveTo(-4,1.5,-9,0);
  g.closePath(); g.fill();
  // нижняя губа
  g.fillStyle=C.lip1;
  g.beginPath();
  g.moveTo(-9,0.5);
  g.quadraticCurveTo(0,7,9,0.5);
  g.quadraticCurveTo(0,2.5,-9,0.5);
  g.closePath(); g.fill();
  // линия смыкания
  g.strokeStyle='rgba(120,55,55,0.85)'; g.lineWidth=1.4;
  g.beginPath(); g.moveTo(-9,0.4); g.quadraticCurveTo(0,2.6,9,0.4); g.stroke();
  // блик на нижней губе
  g.fillStyle='rgba(255,255,255,0.35)';
  g.beginPath(); g.ellipse(2,3,2.5,1.2,0,0,Math.PI*2); g.fill();
  // уголки губ (полуулыбка)
  g.strokeStyle='rgba(150,80,70,0.7)'; g.lineWidth=1.2;
  g.beginPath(); g.moveTo(9,0); g.quadraticCurveTo(11,-1,11.5,-2.5); g.stroke();
  g.beginPath(); g.moveTo(-9,0); g.quadraticCurveTo(-11,-1,-11.5,-2.5); g.stroke();
  g.restore();

  // лёгкий румянец (сдержанный)
  g.fillStyle='rgba(255,140,140,0.16)';
  g.beginPath(); g.ellipse(-26,14,9,4.5,0,0,Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(26,14,9,4.5,0,0,Math.PI*2);  g.fill();
  // тень подбородка
  g.fillStyle='rgba(201,138,111,0.35)';
  g.beginPath(); g.ellipse(0,44,10,4,0,0,Math.PI*2); g.fill();

  /* ================= ЧЁЛКА + ПРИЧЁСКА (черные волосы) ================= */
  g.fillStyle=C.hair; stroke(2.4);
  // шапка волос: гладкая, с боковым пробором
  g.beginPath();
  g.moveTo(-50,-2);
  g.bezierCurveTo(-56,-44, -36,-76, 0,-78);
  g.bezierCurveTo(36,-76, 56,-44, 50,-2);
  // зубчатый край чёлки, асимметричный (пробор слева)
  g.bezierCurveTo(46,-22, 40,-34, 32,-26);
  g.bezierCurveTo(26,-44, 14,-46, 6,-32);
  g.bezierCurveTo(0,-46, -14,-48, -22,-34);
  g.bezierCurveTo(-30,-44, -42,-38, -50,-2);
  g.closePath(); g.fill(); g.stroke();
  // боковые пряди, обрамляющие лицо (до челюсти)
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.moveTo(s*46,-26);
    g.bezierCurveTo(s*56,-4, s*54,26, s*46,44);
    g.bezierCurveTo(s*42,26, s*42,4, s*38,-18);
    g.closePath(); g.fill(); g.stroke();
  });
  // прядевые блики на черном (серо-фиолетовые)
  g.strokeStyle=C.hairHi; g.lineWidth=2.4; g.lineCap='round';
  g.beginPath(); g.moveTo(-30,-62); g.quadraticCurveTo(-14,-72,2,-68); g.stroke();
  g.lineWidth=1.6;
  g.beginPath(); g.moveTo(-24,-56); g.quadraticCurveTo(-8,-66,8,-62); g.stroke();
  g.beginPath(); g.moveTo(16,-60); g.quadraticCurveTo(30,-54,38,-40); g.stroke();
  // выход косичек из-за плеча у головы — небольшие узелки
  [[-1],[1]].forEach(([s])=>{
    g.fillStyle=C.hair; stroke(2);
    g.beginPath(); g.ellipse(s*36,-52,9,8,s*0.3,0,Math.PI*2); g.fill(); g.stroke();
    g.fillStyle='#403746'; stroke(1.4);
    g.beginPath(); g.ellipse(s*38,-44,5,3.5,s*0.5,0,Math.PI*2); g.fill(); g.stroke();
  });

  g.restore(); // голова

  /* ================= СВЕТ НА ФИГУРЕ (если лампа горит) ================= */
  if(typeof window !== 'undefined' && window.lampOn){
    g.save();
    g.globalCompositeOperation='lighter';
    const lg=g.createLinearGradient(0,-640,0,0);
    lg.addColorStop(0,'rgba(255,240,200,0.16)');
    lg.addColorStop(0.7,'rgba(255,235,190,0.05)');
    lg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=lg;
    g.beginPath(); g.ellipse(0,-320,72,335,0,0,Math.PI*2); g.fill();
    g.restore();
  }

  g.restore();
}

// Экспорт для <script src="girl.js"></script> и CommonJS-среды.
if (typeof window !== 'undefined') window.drawGirl = drawGirl;
if (typeof module !== 'undefined' && module.exports) module.exports = { drawGirl };

"use strict";
/* ============================================================
   АНИМЕ ДЕВУШКА В ПОЛНЫЙ РОСТ — процедурная отрисовка на Canvas
   Вызывается: drawGirl(ctx, cx, footY, scale, t)
   cx — центр по X, footY — уровень стоп, scale — множитель роста
   t — время в секундах (для анимации дыхания/волос/хвоста)
   ============================================================ */

function drawGirl(g, cx, footY, scale, t){
  g.save();
  g.translate(cx, footY);
  g.scale(scale, scale);

  /* ---- палитра ---- */
  const C = {
    skin:   '#ffe3d6',
    skinSh: '#f2c3b4',
    blush:  'rgba(255,140,150,0.45)',
    eyeW:   '#ffffff',
    iris1:  '#8fd0ff', iris2: '#2f7fd6', pupil: '#12233d',
    hair:   '#6e4a86',
    hairLo: '#9a72b8',
    hairHi: '#c9a6e0',
    line:   '#2b1c33',
    uniDk:  '#232b45',
    uni:    '#2f3a5c',
    trim:   '#d8b25a',
    shirt:  '#f6f2ea',
    skirt:  '#28324e',
    skirtS: '#3d4a70',
    socks:  '#f3efe8',
    shoe:   '#3a2b28',
    shoeH:  '#57403a'
  };
  const stroke = (w)=>{ g.strokeStyle=C.line; g.lineWidth=w||2.4; g.lineJoin='round'; g.lineCap='round'; };

  const br = Math.sin(t*1.8)*1.6;          // дыхание
  const sway = Math.sin(t*1.1);            // лёгкое покачивание
  const hairSw = Math.sin(t*1.4);          // пряди

  /* ================= ТЕНЬ ПОД НОГАМИ ================= */
  g.save();
  g.fillStyle='rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(0,4,58,11,0,0,Math.PI*2); g.fill();
  g.restore();

  /* ================= ВОЛОСЫ — ЗАДНИЙ СЛОЙ (длинный) ================= */
  g.save();
  g.fillStyle=C.hair;
  stroke(2.4);
  g.beginPath();
  g.moveTo(-46,-540);
  g.bezierCurveTo(-70,-470+hairSw*2, -66,-330, -52,-240+hairSw*4);   // левая длинная прядь
  g.bezierCurveTo(-46,-200, -30,-190, -24,-230);
  g.lineTo(24,-230);
  g.bezierCurveTo(30,-190, 46,-200, 52,-240-hairSw*4);               // правая
  g.bezierCurveTo(66,-330, 70,-470, 46,-540);
  g.bezierCurveTo(30,-590, -30,-590, -46,-540);
  g.closePath(); g.fill(); g.stroke();
  // блики на задних волосах
  g.strokeStyle=C.hairLo; g.lineWidth=5; g.lineCap='round';
  g.beginPath(); g.moveTo(-38,-500); g.quadraticCurveTo(-46,-380,-40,-280); g.stroke();
  g.beginPath(); g.moveTo(38,-500);  g.quadraticCurveTo(46,-380,40,-280);  g.stroke();
  g.restore();

  /* ================= ХВОСТ НА ГОЛОВЕ (аниме!) ================= */
  g.save();
  g.translate(0,-596);
  g.rotate(sway*0.05);
  g.fillStyle=C.hair; stroke(2.2);
  g.beginPath();
  g.moveTo(-6,-6);
  g.bezierCurveTo(-40,-40-hairSw*6, -18,-96, 4,-112);
  g.bezierCurveTo(26,-96, 30,-40, 6,-6);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle=C.hairHi; g.lineWidth=4;
  g.beginPath(); g.moveTo(-2,-14); g.bezierCurveTo(-20,-50,-10,-90,2,-102); g.stroke();
  // резинка
  g.fillStyle=C.trim; stroke(1.6);
  g.beginPath(); g.ellipse(0,-4,11,7,0,0,Math.PI*2); g.fill(); g.stroke();
  g.restore();

  /* ================= НОГИ + КОЛЬЧЕТКА ================= */
  function leg(side){ // side: -1 лево, +1 право
    const x = side*17;
    g.save();
    g.fillStyle=C.skin; stroke(2.2);
    // бедро (до колена)
    g.beginPath();
    g.moveTo(x-13,-250);
    g.quadraticCurveTo(x-12,-160,x-10,-118);
    g.lineTo(x+10,-118);
    g.quadraticCurveTo(x+12,-160,x+13,-250);
    g.closePath(); g.fill(); g.stroke();
    // икра ниже колена
    g.beginPath();
    g.moveTo(x-10,-118);
    g.quadraticCurveTo(x-9,-60,x-7,-34);
    g.lineTo(x+7,-34);
    g.quadraticCurveTo(x+9,-60,x+10,-118);
    g.closePath(); g.fill(); g.stroke();
    // носок (высокий гольф)
    g.fillStyle=C.socks; stroke(2.2);
    g.beginPath();
    g.moveTo(x-9,-92);
    g.quadraticCurveTo(x-8,-50,x-7,-30);
    g.lineTo(x+7,-30);
    g.quadraticCurveTo(x+8,-50,x+9,-92);
    g.closePath(); g.fill(); g.stroke();
    // полоски у верха носка
    g.strokeStyle=C.uniDk; g.lineWidth=2;
    g.beginPath(); g.moveTo(x-8.6,-86); g.lineTo(x+8.6,-86); g.stroke();
    g.beginPath(); g.moveTo(x-8.8,-80); g.lineTo(x+8.8,-80); g.stroke();
    // туфля (локер)
    g.fillStyle=C.shoe; stroke(2.2);
    g.beginPath();
    g.moveTo(x-9,-32);
    g.lineTo(x-9,-14);
    g.quadraticCurveTo(x-9,-4, x+side*4,-4);
    g.lineTo(x+side*26,-4);
    g.quadraticCurveTo(x+side*31,-6, x+side*30,-14);
    g.quadraticCurveTo(x+side*26,-26, x+8,-30);
    g.closePath(); g.fill(); g.stroke();
    // каблук
    g.fillRect(x-side*8-3,-14,6,10);
    g.strokeRect(x-side*8-3,-14,6,10);
    // блеск туфли
    g.strokeStyle=C.shoeH; g.lineWidth=3;
    g.beginPath(); g.moveTo(x+side*8,-12); g.quadraticCurveTo(x+side*20,-10,x+side*26,-9); g.stroke();
    g.restore();
  }
  leg(-1); leg(1);

  /* ================= ЮБКА (плиссированная) ================= */
  g.save();
  g.fillStyle=C.skirt; stroke(2.4);
  const skTop=-268, skBot=-238;
  g.beginPath();
  g.moveTo(-34,skTop);
  g.lineTo(34,skTop);
  g.quadraticCurveTo(48, skBot+18, 46+sway*3, skBot+34);
  // волнистый подол
  for(let i=0;i<6;i++){
    const x1=46-(i*15.3)+sway*3, x2=x1-15.3;
    g.quadraticCurveTo((x1+x2)/2, skBot+24, x2, skBot+34);
  }
  g.quadraticCurveTo(-48, skBot+18, -34, skTop);
  g.closePath(); g.fill(); g.stroke();
  // складки (плиссе)
  g.strokeStyle=C.skirtS; g.lineWidth=2.4;
  for(let i=-4;i<=4;i++){
    g.beginPath();
    g.moveTo(i*7.5, skTop+6);
    g.lineTo(i*10.5+sway*2, skBot+28);
    g.stroke();
  }
  // тёмная кайма подола
  g.strokeStyle=C.uniDk; g.lineWidth=3;
  g.beginPath();
  g.moveTo(-44, skBot+30);
  g.quadraticCurveTo(0, skBot+40, 44+sway*3, skBot+30);
  g.stroke();
  g.restore();

  /* ================= РУКИ (за телом) ================= */
  function arm(side){
    g.save();
    g.fillStyle=C.skin; stroke(2.2);
    // плечо-рукав пиджака
    g.beginPath();
    g.moveTo(side*30,-452);
    g.quadraticCurveTo(side*44,-400, side*46,-340);
    g.lineTo(side*30,-336);
    g.quadraticCurveTo(side*30,-398, side*20,-448);
    g.closePath(); g.fill(); g.stroke();
    // предплечье (опущено вдоль тела)
    g.beginPath();
    g.moveTo(side*38,-340);
    g.quadraticCurveTo(side*42,-280, side*40,-232);
    g.lineTo(side*28,-232);
    g.quadraticCurveTo(side*28,-282, side*30,-336);
    g.closePath(); g.fill(); g.stroke();
    // кисть
    g.beginPath();
    g.ellipse(side*34,-222,9,13,side*0.15,0,Math.PI*2);
    g.fill(); g.stroke();
    g.restore();
  }
  arm(-1); arm(1);

  /* ================= КОРПУС / ШКОЛЬНАЯ ФОРМА ================= */
  g.save();
  // торс пиджака
  g.fillStyle=C.uni; stroke(2.4);
  g.beginPath();
  g.moveTo(-30,-460+br*0.4);
  g.bezierCurveTo(-42,-430, -40,-340, -34,-262);
  g.lineTo(34,-262);
  g.bezierCurveTo(40,-340, 42,-430, 30,-460+br*0.4);
  g.quadraticCurveTo(0,-478-br, -30,-460+br*0.4);
  g.closePath(); g.fill(); g.stroke();
  // белая рубашка (V вырез)
  g.fillStyle=C.shirt; stroke(2);
  g.beginPath();
  g.moveTo(-14,-462+br*0.4);
  g.lineTo(14,-462+br*0.4);
  g.lineTo(4,-352);
  g.lineTo(-4,-352);
  g.closePath(); g.fill(); g.stroke();
  // красный галстук
  g.fillStyle='#c33f4e'; stroke(2);
  g.beginPath();
  g.moveTo(0,-458+br*0.4);
  g.lineTo(9,-446+br*0.4);
  g.lineTo(4,-368);
  g.lineTo(0,-356);
  g.lineTo(-4,-368);
  g.lineTo(-9,-446+br*0.4);
  g.closePath(); g.fill(); g.stroke();
  // лацканы
  g.strokeStyle=C.uniDk; g.lineWidth=3;
  g.beginPath(); g.moveTo(-14,-462+br*0.4); g.lineTo(-6,-380); g.stroke();
  g.beginPath(); g.moveTo(14,-462+br*0.4);  g.lineTo(6,-380);  g.stroke();
  // золотые пуговицы
  g.fillStyle=C.trim; stroke(1.2);
  [-410,-385,-360].forEach(y=>{
    g.beginPath(); g.arc(-20,y,3.4,0,Math.PI*2); g.fill(); g.stroke();
    g.beginPath(); g.arc(20,y,3.4,0,Math.PI*2);  g.fill(); g.stroke();
  });
  // тонкая талия — пояс юбки
  g.fillStyle=C.uniDk;
  g.fillRect(-34,-272,68,12);
  g.strokeStyle=C.line; g.lineWidth=2; g.strokeRect(-34,-272,68,12);
  g.restore();

  /* ================= ПЛЕЧИ-ЭПАУЛЕТЫ ================= */
  g.fillStyle=C.uni; stroke(2.2);
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.ellipse(s*33,-458+br*0.4,15,10,s*0.3,0,Math.PI*2);
    g.fill(); g.stroke();
    g.fillStyle=C.trim;
    g.fillRect(s*33-9,-466+br*0.4,18,4);
    g.fillStyle=C.uni;
  });

  /* ================= ШЕЯ ================= */
  g.save();
  g.fillStyle=C.skin; stroke(2.2);
  g.beginPath();
  g.moveTo(-11,-500);
  g.lineTo(-11,-470+br*0.4);
  g.quadraticCurveTo(0,-462+br*0.4, 11,-470+br*0.4);
  g.lineTo(11,-500);
  g.closePath(); g.fill(); g.stroke();
  // воротник рубашки
  g.fillStyle=C.shirt;
  g.beginPath();
  g.moveTo(-16,-474+br*0.4); g.lineTo(0,-462+br*0.4); g.lineTo(16,-474+br*0.4);
  g.lineTo(12,-486+br*0.4); g.lineTo(0,-478+br*0.4); g.lineTo(-12,-486+br*0.4);
  g.closePath(); g.fill(); stroke(1.8); g.stroke();
  g.restore();

  /* ================= ГОЛОВА ================= */
  const hy=-560;                       // центр лица
  g.save();
  g.translate(0,hy);
  g.rotate(sway*0.012);

  // лицо (аниме-форма с острым подбородком)
  g.fillStyle=C.skin; stroke(2.6);
  g.beginPath();
  g.moveTo(0,44);                      // подбородок
  g.bezierCurveTo(-24,40, -44,18, -46,-8);
  g.bezierCurveTo(-47,-38, -30,-58, 0,-58);
  g.bezierCurveTo(30,-58, 47,-38, 46,-8);
  g.bezierCurveTo(44,18, 24,40, 0,44);
  g.closePath(); g.fill(); g.stroke();

  // уши
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.ellipse(s*46,-4,7,12,s*0.2,0,Math.PI*2);
    g.fill(); g.stroke();
  });

  // румяна
  g.fillStyle=C.blush;
  g.beginPath(); g.ellipse(-28,10,9,5,0,0,Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(28,10,9,5,0,0,Math.PI*2);  g.fill();

  /* ГЛАЗА (большие, аниме) */
  const blink = (Math.sin(t*0.9)>0.995)?1:0;   // редкое моргание
  function eye(side){
    g.save();
    g.translate(side*21,-6);
    if(blink){
      g.strokeStyle=C.line; g.lineWidth=3;
      g.beginPath(); g.moveTo(-12,0); g.quadraticCurveTo(0,4,12,0); g.stroke();
    } else {
      // белок
      g.fillStyle=C.eyeW; stroke(2.4);
      g.beginPath();
      g.moveTo(-12,-2);
      g.bezierCurveTo(-10,-14, 10,-14, 12,-2);
      g.bezierCurveTo(10,10, -10,10, -12,-2);
      g.closePath(); g.fill(); g.stroke();
      // радужка
      const grad=g.createRadialGradient(0,0,2,0,0,9);
      grad.addColorStop(0,C.iris1); grad.addColorStop(1,C.iris2);
      g.fillStyle=grad; g.strokeStyle='none';
      g.beginPath(); g.ellipse(0,0,8.5,10,0,0,Math.PI*2); g.fill();
      // зрачок
      g.fillStyle=C.pupil;
      g.beginPath(); g.ellipse(0,1,4,5.5,0,0,Math.PI*2); g.fill();
      // блики
      g.fillStyle='#fff';
      g.beginPath(); g.arc(-3,-4,3,0,Math.PI*2); g.fill();
      g.beginPath(); g.arc(3.5,4,1.6,0,Math.PI*2); g.fill();
      // тень верхнего века
      g.fillStyle='rgba(43,28,51,0.35)';
      g.beginPath();
      g.moveTo(-11,-3); g.bezierCurveTo(-9,-12,9,-12,11,-3);
      g.bezierCurveTo(6,-7,-6,-7,-11,-3); g.closePath(); g.fill();
    }
    // ресницы / верхняя линия
    g.strokeStyle=C.line; g.lineWidth=3.6; g.lineCap='round';
    g.beginPath();
    g.moveTo(-13,-3); g.bezierCurveTo(-10,-16,10,-16,13,-3);
    g.stroke();
    g.lineWidth=3;
    g.beginPath(); g.moveTo(12,-6); g.lineTo(17,-10); g.stroke(); // внешний уголок
    // бровь
    g.lineWidth=2.6;
    g.beginPath(); g.moveTo(-9,-22); g.quadraticCurveTo(1,-26,10,-21); g.stroke();
    g.restore();
  }
  eye(-1); eye(1);

  // нос
  g.strokeStyle=C.skinSh; g.lineWidth=2;
  g.beginPath(); g.moveTo(1,14); g.lineTo(-2,19); g.stroke();
  // рот (лёгкая улыбка)
  g.strokeStyle=C.line; g.lineWidth=2.4;
  g.beginPath(); g.moveTo(-7,29); g.quadraticCurveTo(0,34,7,29); g.stroke();

  /* ================= ЧЁЛКА И БОКОВЫЕ ПРЯДИ ================= */
  g.fillStyle=C.hair; stroke(2.4);
  // основная шапка волос
  g.beginPath();
  g.moveTo(-52,-6);
  g.bezierCurveTo(-56,-46, -34,-72, 0,-72);
  g.bezierCurveTo(34,-72, 56,-46, 52,-6);
  g.bezierCurveTo(48,-24, 40,-30, 34,-24);     // зубчики чёлки
  g.bezierCurveTo(28,-38, 18,-40, 12,-30);
  g.bezierCurveTo(6,-44, -6,-44, -12,-30);
  g.bezierCurveTo(-18,-40, -28,-38, -34,-24);
  g.bezierCurveTo(-40,-30, -48,-24, -52,-6);
  g.closePath(); g.fill(); g.stroke();
  // боковые пряди до подбородка
  [[-1],[1]].forEach(([s])=>{
    g.beginPath();
    g.moveTo(s*44,-24);
    g.bezierCurveTo(s*54,-6, s*52,20, s*44,38);
    g.bezierCurveTo(s*40,20, s*40,0, s*38,-18);
    g.closePath(); g.fill(); g.stroke();
  });
  // блик на волосах (ореол)
  g.strokeStyle=C.hairHi; g.lineWidth=5; g.lineCap='round';
  g.beginPath(); g.arc(0,-40,30,-2.4,-0.9); g.stroke();
  g.lineWidth=3;
  g.beginPath(); g.arc(0,-38,24,-2.2,-1.2); g.stroke();

  g.restore(); // голова

  /* ================= СВЕТ НА ФИГУРЕ (если лампа горит) ================= */
  if(window.lampOn){
    g.save();
    g.globalCompositeOperation='lighter';
    const lg=g.createLinearGradient(0,-640,0,0);
    lg.addColorStop(0,'rgba(255,240,200,0.16)');
    lg.addColorStop(0.7,'rgba(255,235,190,0.05)');
    lg.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=lg;
    g.beginPath(); g.ellipse(0,-320,70,330,0,0,Math.PI*2); g.fill();
    g.restore();
  }

  g.restore();
}

// Stylised renderers on top of the HANDSET grid + scatter physics
(() => {
  const W = 942, H = 1330, K = 2;
  if (!window.__hsReady) {
    const st = document.createElement('style');
    st.textContent = `.bar,#finger{display:none!important} body{display:block!important;overflow:auto!important}
      .stage,#mosaic{width:${W}px!important;height:${H}px!important;flex:none!important}`;
    document.head.appendChild(st);
    window.__hsReady = true;
  }
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const near = (h, pal) => { const c = rgb(h); let b = pal[0], bd = 1e9;
    for (const p of pal) { const q = rgb(p), d = (c[0]-q[0])**2 + (c[1]-q[1])**2 + (c[2]-q[2])**2; if (d < bd) { bd = d; b = p; } } return b; };
  const lum = h => { const c = rgb(h); return .299*c[0] + .587*c[1] + .114*c[2]; };
  const hash = i => ((i * 2654435761) >>> 0) % 1000 / 1000;

  window.__hs2 = async function (spec, svgText) {
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    await im.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.drawImage(im, 0, 0, W, H);
    userImg = c; srcCache = { key: W + 'x' + H, c };
    keyBg = [255, 255, 255]; bgFill = '#ffffff';
    mono = !!spec.mono; inkIn.value = spec.ink || '#000000'; cutIn.value = spec.cut || 40;
    input.value = spec.word; size.value = spec.size; force = spec.force || 1;
    running = false; mouse = null; pressed = false;
    render();
    if (spec.scatter) {
      const pts = spec.scatter;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        for (let t = 0; t < 1; t += 0.12) { pointAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); kick(); await frame(); }
      }
      mouse = null;
      await wait(spec.settle ?? 260);
    }
    // snapshot positions now (physics keeps running)
    const n = P.n, X = Float32Array.from(P.x), Y = Float32Array.from(P.y), R = Float32Array.from(P.r);
    const cw = P.cellW, ch = P.cellH;
    const oc = document.createElement('canvas'); oc.width = W * K; oc.height = H * K;
    const o = oc.getContext('2d'); o.scale(K, K);
    const pal = spec.palette || spec.colors || ['#000000'];
    for (let i = 0; i < n; i++) {
      const s = P.spr[i], x = X[i], y = Y[i], hx = P.cx[i], hy = P.cy[i];
      const moved = Math.hypot(x - hx, y - hy) > 1.5;
      const row = Math.round((hy - ch / 2) / ch), col = Math.round((hx - cw / 2) / cw);
      if (spec.style === 'bars') {
        o.fillStyle = spec.colors[((row % spec.colors.length) + spec.colors.length) % spec.colors.length];
        o.save(); o.translate(x, y); o.rotate(R[i]); o.fillRect(-cw * .56, -ch * .27, cw * 1.12, ch * .54); o.restore();
      } else if (spec.style === 'vbars') {
        o.fillStyle = spec.colors[((col % spec.colors.length) + spec.colors.length) % spec.colors.length];
        o.save(); o.translate(x, y); o.rotate(R[i]); o.fillRect(-cw * .28, -ch * .56, cw * .56, ch * 1.12); o.restore();
      } else if (spec.style === 'squares') {
        o.fillStyle = spec.colors[i % spec.colors.length];
        const q = spec.sq; o.fillRect(x - q / 2, y - q / 2, q, q);
      } else if (spec.style === 'rays') {
        if (hash(i) > spec.density) continue;
        const [ccx, ccy] = spec.center, dx = hx - ccx, dy = hy - ccy, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, len = spec.len * Math.pow(hash(i + 3), 1.6), q = spec.sq;
        o.fillStyle = spec.colors[Math.floor(hash(i + 11) * spec.colors.length)];
        for (let t = d; t < d + len; t += spec.step * (0.6 + hash(i + Math.floor(t)) * .9)) {
          if (hash(i * 31 + Math.floor(t)) < spec.gap) continue;
          o.fillRect(ccx + ux * t - q / 2, ccy + uy * t - q / 2, q, q);
        }
      } else if (spec.style === 'dots') {
        const col2 = near(s.hex, pal); o.fillStyle = o.strokeStyle = col2;
        const k = (row + col) % 3, r = ch * .26;
        if (k === 0) { o.beginPath(); o.arc(x, y, r, 0, 7); o.fill(); }
        else if (k === 1) { o.lineWidth = 1.3; o.beginPath(); o.moveTo(x - r, y - r); o.lineTo(x + r, y + r); o.moveTo(x + r, y - r); o.lineTo(x - r, y + r); o.stroke(); }
        else { o.fillRect(x - r * .8, y - r * .8, r * 1.6, r * 1.6); }
      } else if (spec.style === 'tokens') {
        const word = lum(s.hex) < 128, r = Math.min(cw, ch) * .47;
        let fill, stroke, ink, glyph = s.ch;
        if (word || moved) { fill = pal[Math.floor(hash(i) * pal.length)]; stroke = null; ink = lum(fill) < 90 ? '#ffffff' : '#111111'; }
        else { fill = '#f4f4f4'; stroke = '#8a8a8a'; ink = '#6a6a6a'; if (hash(i + 7) < .3) glyph = '↗'; }
        o.beginPath(); o.arc(x, y, r, 0, 7); o.fillStyle = fill; o.fill();
        if (stroke) { o.lineWidth = .8; o.strokeStyle = stroke; o.stroke(); }
        o.fillStyle = ink; o.font = `500 ${r * 1.05}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        o.textAlign = 'center'; o.textBaseline = 'middle';
        o.save(); o.translate(x, y); o.rotate(R[i]); o.fillText(glyph, 0, r * .06); o.restore();
      } else if (spec.style === 'helv') {
        const word = lum(s.hex) < 128;
        o.fillStyle = moved ? pal[Math.floor(hash(i) * pal.length)] : word ? '#111111' : '#b9b9b9';
        o.font = `${word ? 500 : 400} ${ch * .82}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
        o.textAlign = 'center'; o.textBaseline = 'middle';
        o.save(); o.translate(x, y); o.rotate(R[i]); o.fillText(word || moved ? s.ch : (hash(i) < .25 ? '+' : s.ch), 0, 0); o.restore();
      }
    }
    return await new Promise(r => oc.toBlob(r, 'image/png'));
  };
  return 'ready2';
})();

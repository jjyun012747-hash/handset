(() => {
  const W = 942, H = 1330;
  if (!window.__hs6Ready) {
    const st = document.createElement('style');
    st.textContent = `.bar,#finger{display:none!important} body{display:block!important;overflow:auto!important}
      .stage,#mosaic{width:${W}px!important;height:${H}px!important;flex:none!important}`;
    document.head.appendChild(st);
    const _draw = draw;
    window.draw = function () { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); _draw(); };
    window.__hs6Ready = true;
  }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // soft colour field drawn on canvas only to be SAMPLED by the tool (never shown)
  window.__field6 = function (b) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = b.paper; x.fillRect(0, 0, W, H);
    x.save();
    if (b.clip) { const [cx, cy, cw, ch] = b.clip; x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); if (b.clipFill) { x.fillStyle = b.clipFill; x.fillRect(cx, cy, cw, ch); } }
    for (const o of b.blobs) {
      x.save(); x.filter = `blur(${o.blur}px)`; x.globalAlpha = o.a ?? 1; x.fillStyle = o.c;
      x.beginPath(); x.ellipse(o.x, o.y, o.rx, o.ry, (o.rot || 0) * Math.PI / 180, 0, Math.PI * 2); x.fill(); x.restore();
    }
    x.restore();
    return c;
  };
  // sparse mask (dark blobs + horizontal streaks) for the fine top layer
  window.__mask6 = function (b, dens, seed) {
    let s = seed || 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    for (const o of b.blobs.filter(o => o.m)) {
      x.save(); x.filter = `blur(26px)`; x.globalAlpha = o.m; x.fillStyle = '#000';
      x.beginPath(); x.ellipse(o.x, o.y, o.rx, o.ry, (o.rot || 0) * Math.PI / 180, 0, Math.PI * 2); x.fill(); x.restore();
    }
    const id = x.getImageData(0, 0, W, H), d = id.data, dark = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) dark[i] = 1 - d[i * 4] / 255;
    for (let k = 0; k < 90; k++) {
      const y0 = Math.floor(rnd() * H), hgt = 2 + Math.floor(rnd() * 10);
      for (let y = y0; y < Math.min(H, y0 + hgt); y++) { let carry = 0;
        for (let xx = 0; xx < W; xx++) { const i = y * W + xx; carry = Math.max(carry * .996, dark[i]); dark[i] = Math.max(dark[i], carry * .8); } }
    }
    for (let y = 0; y < H; y += 3) for (let xx = 0; xx < W; xx += 3) {
      const v = rnd() < Math.pow(dark[y * W + xx], 1.6) * dens ? 0 : 255;
      for (let dy = 0; dy < 3 && y + dy < H; dy++) for (let dx = 0; dx < 3 && xx + dx < W; dx++) { const j = ((y + dy) * W + xx + dx) * 4; d[j] = d[j + 1] = d[j + 2] = v; }
    }
    x.putImageData(id, 0, 0);
    return c;
  };
  window.__hs6 = async function (spec, b) {
    const sc = spec.kind === 'fine' ? window.__mask6(b, spec.dens, spec.seed) : window.__field6(b);
    userImg = sc; srcCache = { key: W + 'x' + H, c: sc };
    keyBg = spec.kind === 'fine' ? [255, 255, 255] : rgb(b.paper);
    bgFill = 'rgba(0,0,0,0)';
    { const k = keyBg, gn = spec.gain || 1.9;
      window.vivid = (r, g, b) => [r, g, b].map((v, i) => Math.max(0, Math.min(255, Math.round(k[i] + (v - k[i]) * gn)))); }
    mono = spec.kind === 'fine'; inkIn.value = spec.ink || '#000000'; cutIn.value = spec.cut;
    input.value = 'HANDSET'; size.value = spec.size; force = spec.force || 1;
    font = spec.font; FONT = font.css; try { await document.fonts.load(`${font.style} ${font.weight} 40px ${font.css}`, 'HANDSET'); } catch (e) {}
    running = false; mouse = null; pressed = false;
    render();
    if (spec.scatter) {
      const pts = spec.scatter;
      for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        for (let t = 0; t < 1; t += 0.12) { pointAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); kick(); await frame(); } }
      mouse = null; await wait(260);
    }
    draw();
    return await new Promise(r => canvas.toBlob(r, 'image/png'));
  };
  return 'ready6';
})();

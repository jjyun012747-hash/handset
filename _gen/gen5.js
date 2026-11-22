(() => {
  const W = 942, H = 1330, K = 2;
  window.__bg5 = async function (b) {
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
    const x = c.getContext('2d'); x.scale(K, K);
    x.fillStyle = b.paper; x.fillRect(0, 0, W, H);
    if (b.grid) { x.strokeStyle = b.grid; x.lineWidth = .6; for (let i = 0; i < W; i += 30) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 30) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } }
    x.save();
    if (b.clip) { const [cx, cy, cw, ch] = b.clip; x.beginPath(); x.rect(cx, cy, cw, ch); x.clip(); if (b.clipFill) { x.fillStyle = b.clipFill; x.fillRect(cx, cy, cw, ch); } }
    for (const o of b.blobs) {
      x.save(); x.filter = `blur(${o.blur}px)`; x.globalAlpha = o.a ?? 1; x.fillStyle = o.c;
      x.beginPath(); x.ellipse(o.x, o.y, o.rx, o.ry, (o.rot || 0) * Math.PI / 180, 0, Math.PI * 2); x.fill(); x.restore();
    }
    x.restore();
    // film grain
    const id = x.getImageData(0, 0, W * K, H * K), d = id.data, g = b.grain ?? 16;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * g * 2; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(id, 0, 0);
    // fold creases
    x.setTransform(K, 0, 0, K, 0, 0);
    for (const [vx, vy] of (b.creases || [])) {
      x.save(); x.filter = 'blur(1.2px)';
      if (vx !== null) { x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(vx, 0, 1.6, H); x.fillStyle = 'rgba(0,0,0,.13)'; x.fillRect(vx + 1.6, 0, 2.4, H); }
      if (vy !== null) { x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(0, vy, W, 1.6); x.fillStyle = 'rgba(0,0,0,.13)'; x.fillRect(0, vy + 1.6, W, 2.4); }
      x.restore();
    }
    return await new Promise(r => c.toBlob(r, 'image/png'));
  };
  window.__mask5 = function (b, seed) {
    let s = seed || 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    for (const o of b.blobs.filter(o => o.m)) {
      x.save(); x.filter = `blur(${b.maskBlur || 26}px)`; x.globalAlpha = o.m; x.fillStyle = '#000';
      x.beginPath(); x.ellipse(o.x, o.y, o.rx, o.ry, (o.rot || 0) * Math.PI / 180, 0, Math.PI * 2); x.fill(); x.restore();
    }
    const id = x.getImageData(0, 0, W, H), d = id.data, dens = b.density ?? .85;
    const dark = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) dark[i] = 1 - d[i * 4] / 255;
    // horizontal glitch streaks: smear darkness to the right on random rows
    for (let k = 0; k < (b.streaks ?? 90); k++) {
      const y0 = Math.floor(rnd() * H), hgt = 2 + Math.floor(rnd() * 10);
      for (let y = y0; y < Math.min(H, y0 + hgt); y++) {
        let carry = 0;
        for (let xx = 0; xx < W; xx++) { const i = y * W + xx; carry = Math.max(carry * .996, dark[i]); dark[i] = Math.max(dark[i], carry * .8); }
      }
    }
    for (let y = 0; y < H; y += 3) for (let xx = 0; xx < W; xx += 3) {
      const i = y * W + xx, keep = rnd() < Math.pow(dark[i], 1.6) * dens;
      const v = keep ? 0 : 255;
      for (let dy = 0; dy < 3 && y + dy < H; dy++) for (let dx = 0; dx < 3 && xx + dx < W; dx++) { const j = ((y + dy) * W + xx + dx) * 4; d[j] = d[j + 1] = d[j + 2] = v; }
    }
    x.putImageData(id, 0, 0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><image href="${c.toDataURL('image/png')}" width="${W}" height="${H}"/></svg>`;
  };
  return 'ready5';
})();

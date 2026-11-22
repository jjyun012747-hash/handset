(() => {
  const W = 942, H = 1330;
  if (!window.__hs4Ready) {
    const st = document.createElement('style');
    st.textContent = `.bar,#finger{display:none!important} body{display:block!important;overflow:auto!important}
      .stage,#mosaic{width:${W}px!important;height:${H}px!important;flex:none!important}`;
    document.head.appendChild(st);
    const _draw = draw;
    window.draw = function () { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); _draw(); };
    window.__hs4Ready = true;
  }
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  window.__hs4 = async function (spec, svgText) {
    const im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
    await im.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0,0,W,H); cx.drawImage(im, 0, 0, W, H);
    userImg = c; srcCache = { key: W + 'x' + H, c };
    keyBg = [255, 255, 255]; bgFill = 'rgba(0,0,0,0)';
    mono = !!spec.mono; inkIn.value = spec.ink || '#000000'; cutIn.value = spec.cut || 40;
    input.value = spec.word; size.value = spec.size; force = 1;
    if (spec.font) { font = spec.font; FONT = font.css; try { await document.fonts.load(`${font.style} ${font.weight} 40px ${font.css}`, 'HANDSET'); } catch (e) {} }
    running = false; mouse = null; pressed = false;
    render();
    if (spec.scatter) {
      const pts = spec.scatter;
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        for (let t = 0; t < 1; t += 0.12) { pointAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); kick(); await frame(); }
      }
      mouse = null; await wait(260);
    }
    draw();
    return await new Promise(r => canvas.toBlob(r, 'image/png'));
  };
  return 'ready4';
})();

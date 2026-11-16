/*
 DUDU Studio · VIS-R3E geometry probe for DevTools console.
 Read-only: measures DOM and reports probable overflows, never changes the page.
 Codex should adapt selectors to the actual runtime component where names differ.
*/
(() => {
  const pairs = [["HUD avatar", "#profile-card", "#profile-avatar"], ["HUD profile", "#profile-card", ".profile-main,.r3e-profile-main"], ["HP track", "#profile-card", "#hp-hud .profile-track,#hp-hud .r3e-profile-track"], ["Stamina bar", "#profile-card", "#stamina-hud .profile-track,#stamina-hud .r3e-profile-track"], ["Combat label", "#profile-card", ".profile-power,.r3e-profile-power"], ["Recovery timer", "#profile-card", "#profile-recovery"], ["Result image", "#result-paint", "#result-image"], ["Result picture area", ".result-card,.r3e-result-card", "#result-paint"], ["Egg grid", "#control-panel", "#grid"], ["Egg timing widget", "#control-panel", "#timing-wrap"], ["Random dice", ".random-info,.r3e-random-info", ".random-info>img,.r3e-random-info>img"], ["Footer inside stage", "#stage", "#footer"], ["Egg tile 1", "#grid", "[data-cell=\"0\"]"], ["Egg tile 2", "#grid", "[data-cell=\"1\"]"], ["Egg tile 3", "#grid", "[data-cell=\"2\"]"], ["Egg tile 4", "#grid", "[data-cell=\"3\"]"], ["Egg tile 5", "#grid", "[data-cell=\"4\"]"], ["Egg tile 6", "#grid", "[data-cell=\"5\"]"], ["Egg tile 7", "#grid", "[data-cell=\"6\"]"], ["Egg tile 8", "#grid", "[data-cell=\"7\"]"], ["Egg tile 9", "#grid", "[data-cell=\"8\"]"], ["Timing button", "#timing-wrap", "#timing-tap"], ["Force control", "#control-panel", "#force"], ["HUD HP fill", "#hp-hud .r3e-profile-track", "#hpbar"], ["HUD Stamina fill", "#stamina-hud .r3e-profile-track", "#staminabar"], ["Result label", ".r3e-result-card", "#result-name"], ["Result description", ".r3e-result-card", "#result-description"], ["Result cost", ".r3e-result-card", "#result-cost"]];
  function fmt(r) {
    return [r.left, r.top, r.right, r.bottom, r.width, r.height]
      .map(v => Number(v.toFixed(1))).join(',');
  }
  function visible(node) {
    if (!node || node.getClientRects().length === 0) return false;
    const s = getComputedStyle(node);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }
  const rows = [];
  for (const [name, parentSel, childSel] of pairs) {
    const p = document.querySelector(parentSel);
    const c = document.querySelector(childSel);
    if (!p || !c) {
      rows.push({name,result:'SELECTOR_MISSING',parentSel,childSel}); continue;
    }
    if (!visible(c) || !visible(p)) {
      rows.push({name,result:'HIDDEN',parentSel,childSel}); continue;
    }
    const a = p.getBoundingClientRect(), b = c.getBoundingClientRect();
    const over = {
      left: Math.max(0,a.left-b.left), top: Math.max(0,a.top-b.top),
      right: Math.max(0,b.right-a.right), bottom: Math.max(0,b.bottom-a.bottom),
    };
    const maxOverflow = Math.max(...Object.values(over));
    const cs = getComputedStyle(c);const ps=getComputedStyle(p);
    rows.push({ name, result: maxOverflow > 2 || !p.contains(c) ? 'FAIL' : 'PASS',
      overflowPx: Number(maxOverflow.toFixed(1)),
      overflowSides: JSON.stringify(over),
      childRect: fmt(b), parentRect: fmt(a),
      isDescendant:p.contains(c), childOffsetParent:c.offsetParent?.id||c.offsetParent?.className, childPosition: cs.position, childTransform: cs.transform,
      childWidthCSS: cs.width, childMaxWidthCSS: cs.maxWidth,
      parentCSS:{display:ps.display,position:ps.position,overflow:ps.overflow,background:ps.backgroundImage,backgroundSize:ps.backgroundSize,padding:ps.padding,boxSizing:ps.boxSizing},childCSS:{display:cs.display,minWidth:cs.minWidth,minHeight:cs.minHeight,height:cs.height,overflow:cs.overflow,objectFit:cs.objectFit,boxSizing:cs.boxSizing},parentSel, childSel });
  }
  console.group('DUDU VIS-R3E Geometry audit (read-only)');
  console.table(rows);
  console.log('Viewport:',innerWidth,'x',innerHeight,
    'documentWidth:',document.documentElement.scrollWidth);
  console.warn('Missing selectors must be mapped to the integrated runtime DOM. PASS does not establish gameplay correctness.');
  console.groupEnd();
  return rows;
})();

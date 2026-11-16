/**
 * DUDU Studio / R3D fixed-canvas adapter.
 *
 * Contract:
 * - `host` is the Cyber Phone CONTENT AREA below its existing header, not
 *   the entire phone shell or the browser viewport.
 * - `stage` is the 390x844 LayerKit visual stage, direct child of host.
 * - The stage is fitted uniformly, preserving all child geometry & hitboxes.
 * - Do not add an extra Tu Tien header to the stage.
 *
 * This helper does not implement navigation, rewards, HP, inventory or Firebase.
 */
export function mountDuduExplorationStage({ host, stage, baseWidth = 390, baseHeight = 844 } = {}) {
  if (!(host instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
    throw new TypeError('mountDuduExplorationStage requires host and stage DOM elements');
  }
  if (stage.parentElement !== host) {
    throw new Error('The LayerKit stage must be a direct child of the Cyber Phone content host');
  }
  const hostStyle = getComputedStyle(host);
  if (hostStyle.position === 'static') host.style.position = 'relative';
  host.style.minWidth = '0';
  host.style.minHeight = '0';
  host.style.overflow = 'hidden';
  host.style.isolation = 'isolate';

  Object.assign(stage.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
    minWidth: '0',
    minHeight: '0',
    maxWidth: 'none',
    maxHeight: 'none',
    aspectRatio: 'auto',
    margin: '0',
    overflow: 'hidden',
    transformOrigin: 'center center',
  });
  let lastScale = 1;
  const update = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    lastScale = Math.min(width / baseWidth, height / baseHeight);
    stage.style.transform = `translate(-50%, -50%) scale(${lastScale})`;
    stage.dataset.fitScale = lastScale.toFixed(5);
  };
  const observer = new ResizeObserver(update);
  observer.observe(host);
  window.addEventListener('resize', update, { passive: true });
  window.visualViewport?.addEventListener('resize', update, { passive: true });
  update();
  return {
    update,
    getScale: () => lastScale,
    dispose() {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    },
  };
}

export function auditDuduStageFit(host, stage, footerSelectors = ['.footer', '#footer']) {
  const hostBox = host.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const inside = (b, a) => b.top >= a.top - 1.5 && b.left >= a.left - 1.5 &&
    b.right <= a.right + 1.5 && b.bottom <= a.bottom + 1.5;
  const selectors = footerSelectors.filter(s => stage.querySelector(s));
  const footer = selectors.length ? stage.querySelector(selectors[0]) : null;
  const footerBox = footer?.getBoundingClientRect();
  return {
    host: { width: hostBox.width, height: hostBox.height },
    stage: { width: stageBox.width, height: stageBox.height },
    scale: stage.dataset.fitScale ?? 'unknown',
    stageFullyVisible: inside(stageBox, hostBox),
    footerFullyVisible: footerBox ? inside(footerBox, hostBox) : null,
    hostScrollOverflowY: host.scrollHeight > host.clientHeight + 2,
    hostScrollOverflowX: host.scrollWidth > host.clientWidth + 2,
  };
}

/**
 * Plaza boot — one master timeline for the cover's start-up.
 *
 * Every moving part reads its timing from here, so the opening behaves like a
 * single system coming online rather than a run of separate reveals:
 *
 *   0 ms      The plan, seal and instruments are already on screen, unlit.
 *   150 ms    A sweep hand makes one revolution of the seal and lights it.
 *   0–2.9 s   The empty rings (seal dial, chapter ring, theodolite bezel, ring-road
 *             tracks) spin down with chronograph easing and lock inside-out.
 *   500 ms    The first conduit pulse leaves the podium; the energisation front
 *             rides with it and the city lights come up behind it. Each ring road
 *             flashes as the pulse crosses it. The pulse then repeats on a steady
 *             six-second system cadence.
 *   600 ms    The start-up readout steps through the live checks on one line.
 *   2.9 s     All rings locked: the fixed index marks light ("aligned").
 *   3.15 s    Readout resolves to "All systems online"; header status follows.
 *   2.6–4.35 s Title settles; the readout clears, then roads and footer rise in its place.
 *   4.4 s     Boot complete.
 *
 * Only the empty rings rotate. Rings carrying words (the seal's enamel band and
 * its outer name/motto ring) never move.
 *
 * All motion is CSS (transform/opacity, plus two registered custom properties
 * for the light front and the seal sweep) keyed off the `.pz-run` class on the
 * page root, so nothing re-renders per frame. The resting styles are the final
 * state: removing `.pz-run` (skip, reduced motion, end of boot) lands there
 * instantly, and without JavaScript the animations simply finish on their own.
 */

export const BOOT_DONE = 4400;

/** Cadence of the conduit pulse after start-up (ms). */
export const PULSE_PERIOD = 6000;
/** Time for a pulse to travel the conduits from the podium to the edge (ms). */
export const PULSE_TRAVEL = 2400;
/** Pulse head radius at the start and end of its travel (plan units). */
export const PULSE_FROM = 230, PULSE_TO = 1430;
/** Pulse body length (plan units). */
export const PULSE_LEN = 180;

export const T = {
  sealSweep: { at: 150, ms: 1350 },
  front: { at: 500, ms: PULSE_TRAVEL },
  ticker: { at: 600, ms: 2550 },
  lock: 2900,
  title: { at: 2600, ms: 900 },
  roads: { at: 3550, ms: 800 },
  foot: { at: 3600, ms: 750 },
  readoutOut: { at: 3250, ms: 300 },
};

/** Ring spin-down: each empty ring starts offset and locks to rest at `lockAt`. */
export function spin(fromDeg: number, lockAt: number, delay = 0) {
  return { from: fromDeg, delay, ms: lockAt - delay };
}

const pct = (v: number) => `${+v.toFixed(3)}%`;

/** Fraction of the pulse period at which the pulse head crosses radius r. */
export function crossing(r: number) {
  return ((r - PULSE_FROM) / (PULSE_TO - PULSE_FROM)) * (PULSE_TRAVEL / PULSE_PERIOD) * 100;
}

/** The page's motion stylesheet. Resting styles are the final state. */
export function bootCss(ringRadii: number[]) {
  const travel = (PULSE_TRAVEL / PULSE_PERIOD) * 100;
  const x0 = ((PULSE_FROM - PULSE_LEN) / PULSE_LEN) * 100;
  const x1 = ((PULSE_TO - PULSE_LEN) / PULSE_LEN) * 100;
  // Light-front mask: its half-feather midpoint rides exactly on the pulse head.
  const pf0 = PULSE_FROM / 12 + 4, pf1 = PULSE_TO / 12 + 4;
  const flashes = ringRadii.map((r, i) => {
    const f = crossing(r);
    return `@keyframes pzFlash${i}{0%,${pct(Math.max(0, f - 0.4))}{opacity:0}${pct(f + 0.9)}{opacity:1}${pct(f + 14)},100%{opacity:0}}
      .pz-flash${i}{animation:pzFlash${i} ${PULSE_PERIOD}ms linear ${T.front.at}ms infinite both}`;
  }).join('\n');

  return `
  @property --pf{syntax:'<percentage>';inherits:false;initial-value:${pf1}%}
  @property --sa{syntax:'<angle>';inherits:false;initial-value:384deg}

  @keyframes plazaUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  @keyframes plazaPulse{0%,100%{opacity:.35}50%{opacity:1}}
  @keyframes plazaGlint{0%{transform:translateX(-140%) rotate(18deg)}22%,100%{transform:translateX(140%) rotate(18deg)}}

  /* Steady system cadence: one synchronized pulse down every conduit. */
  @keyframes pzPulse{
    0%{transform:translateX(${pct(x0)});opacity:0}
    ${pct(travel * 0.1)}{opacity:1}
    ${pct(travel * 0.86)}{opacity:.95}
    ${pct(travel)}{transform:translateX(${pct(x1)});opacity:0}
    100%{transform:translateX(${pct(x1)});opacity:0}}
  .pz-pulse{animation:pzPulse ${PULSE_PERIOD}ms linear ${T.front.at}ms infinite both}
  ${flashes}

  /* ---- Boot (only while the root carries .pz-run) ---- */
  @keyframes pzLight{from{opacity:var(--o0,.22)}to{opacity:1}}
  @keyframes pzFront{from{--pf:${pf0}%}to{--pf:${pf1}%}}
  @keyframes pzSweep{from{--sa:0deg}to{--sa:384deg}}
  @keyframes pzHand{0%{transform:rotate(0deg);opacity:0}8%{opacity:1}86%{opacity:1}100%{transform:rotate(384deg);opacity:0}}
  @keyframes pzSpin{
    0%{transform:rotate(var(--r0));opacity:.4;animation-timing-function:cubic-bezier(.12,.62,.18,1)}
    92%{transform:rotate(var(--r1));opacity:1;animation-timing-function:cubic-bezier(.4,0,.2,1)}
    100%{transform:rotate(0deg);opacity:1}}
  @keyframes pzLock{0%{opacity:.25}55%{opacity:1;filter:brightness(1.8)}100%{opacity:1;filter:none}}
  @keyframes pzRise{from{opacity:0;transform:translateY(var(--dy,12px))}to{opacity:1;transform:none}}
  @keyframes pzFade{from{opacity:0}to{opacity:1}}
  @keyframes pzOut{from{opacity:1}to{opacity:0}}
  @keyframes pzIn{0%{opacity:0}100%{opacity:1}}
  @keyframes pzProg{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes pzTick{
    0%,21%{transform:translateY(0)}25.5%,46.5%{transform:translateY(-20%)}
    51%,72%{transform:translateY(-40%)}76.5%,95.5%{transform:translateY(-60%)}100%{transform:translateY(-80%)}}
  @keyframes pzBlink{0%,100%{opacity:.35}50%{opacity:1}}

  .pz-run .pz-base{animation:pzLight 1600ms cubic-bezier(.3,.6,.2,1) both}
  .pz-run .pz-lit{-webkit-mask-image:radial-gradient(circle closest-side,#000 calc(var(--pf) - 8%),transparent var(--pf));mask-image:radial-gradient(circle closest-side,#000 calc(var(--pf) - 8%),transparent var(--pf));animation:pzFront ${T.front.ms}ms linear ${T.front.at}ms both;will-change:transform}
  .pz-run .pz-spin{animation-name:pzSpin;animation-fill-mode:both}
  .pz-run .pz-index{animation:pzLock 700ms ease-out ${T.lock - 250}ms both}
  .pz-run .pz-seal-dark{-webkit-mask-image:conic-gradient(transparent calc(var(--sa) - 24deg),#000 var(--sa));mask-image:conic-gradient(transparent calc(var(--sa) - 24deg),#000 var(--sa));animation:pzSweep ${T.sealSweep.ms}ms cubic-bezier(.45,.05,.3,1) ${T.sealSweep.at}ms both}
  .pz-run .pz-seal-hand{animation:pzHand ${T.sealSweep.ms}ms cubic-bezier(.45,.05,.3,1) ${T.sealSweep.at}ms both}
  .pz-run .pz-head{animation:pzFade 600ms ease-out both}
  .pz-run .pz-title{animation:pzRise ${T.title.ms}ms cubic-bezier(.2,.8,.2,1) ${T.title.at}ms both}
  .pz-run .pz-roads{--dy:14px;animation:pzRise ${T.roads.ms}ms cubic-bezier(.2,.8,.2,1) ${T.roads.at}ms both}
  .pz-run .pz-foot{--dy:8px;animation:pzRise ${T.foot.ms}ms cubic-bezier(.2,.8,.2,1) ${T.foot.at}ms both}
  .pz-run .pz-instr{animation:pzFade 900ms ease-out ${T.lock}ms both}
  .pz-run .pz-readout{animation:pzFade 350ms ease-out 350ms both,pzOut ${T.readoutOut.ms}ms ease-in ${T.readoutOut.at}ms forwards}
  .pz-run .pz-prog{animation:pzProg ${T.ticker.ms}ms cubic-bezier(.4,0,.4,1) ${T.ticker.at}ms both}
  .pz-run .pz-tick{animation:pzTick ${T.ticker.ms}ms linear ${T.ticker.at}ms both}
  .pz-run .pz-status-boot{animation:pzOut 300ms ease-in ${T.ticker.at + T.ticker.ms}ms forwards}
  .pz-run .pz-status-boot i{animation:pzBlink 900ms ease-in-out infinite}
  .pz-run .plaza-skip{animation:pzOut 300ms ease-in ${T.foot.at - 200}ms forwards}
  .pz-run .pz-status-ok{animation:pzIn 400ms ease-out ${T.ticker.at + T.ticker.ms + 150}ms both}

  /* Resting (final) state */
  .pz-status-boot,.pz-readout,.pz-seal-dark,.pz-seal-hand{opacity:0}
  .pz-run .pz-status-boot,.pz-run .pz-seal-dark{opacity:1}
  .pz-done .pz-status-boot,.pz-done .pz-readout,.pz-done .pz-seal-dark,.pz-done .pz-seal-hand{display:none}

  @media (prefers-reduced-motion:reduce){
    .pz-b,.pz-b *,.pz-pulse,[class*="pz-flash"],.plaza-anim{animation:none!important}
    .pz-run .pz-status-boot,.pz-run .pz-seal-dark,.pz-run .pz-readout{display:none}
    .pz-pulse,[class*="pz-flash"]{opacity:0}
  }`;
}

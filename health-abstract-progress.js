// Shared browser/Node helpers for the HealthCom generation progress display.
//
// The generation endpoint returns one final JSON response, so these values are
// deliberately estimates based on elapsed time, not claims about server state.
// Pending work is capped at 95%; only a validated response may set 100% in UI.
(function attach(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HealthAbstractProgress = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function build() {
  "use strict";

  const STAGES = [
    { at: 0, progress: 6 },
    { at: 8000, progress: 18 },
    { at: 45000, progress: 58 },
    { at: 75000, progress: 78 },
    { at: 105000, progress: 91 },
    { at: 120000, progress: 95 },
  ];

  function finiteMs(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function formatElapsed(value) {
    const totalSeconds = Math.floor(finiteMs(value) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    return minutes + ":" + String(totalSeconds % 60).padStart(2, "0");
  }

  function progressAt(value) {
    const elapsedMs = finiteMs(value);
    let stage = 0;
    for (let index = 1; index < STAGES.length - 1; index++) {
      if (elapsedMs >= STAGES[index].at) stage = index;
    }

    let percent = STAGES[0].progress;
    if (elapsedMs >= STAGES[STAGES.length - 1].at) {
      percent = 95;
    } else {
      for (let index = 0; index < STAGES.length - 1; index++) {
        const start = STAGES[index];
        const end = STAGES[index + 1];
        if (elapsedMs >= start.at && elapsedMs < end.at) {
          const ratio = (elapsedMs - start.at) / (end.at - start.at);
          percent = Math.round(start.progress + ratio * (end.progress - start.progress));
          break;
        }
      }
    }
    return { elapsedMs, elapsed: formatElapsed(elapsedMs), percent: Math.min(95, percent), stage };
  }

  return { STAGES: STAGES.slice(), formatElapsed, progressAt };
});

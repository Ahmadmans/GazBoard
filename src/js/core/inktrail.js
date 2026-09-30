// Windows Ink trail.
//
// Every bit of ink normally goes through a relay: the pen moves, Windows tells
// Chromium, Chromium tells GazBoard, GazBoard draws on the canvas, and the
// frame goes to the screen. Each hand-off costs a few milliseconds, which is
// the gap you see between the nib and the end of the line.
//
// Chromium's Delegated Ink Trails (navigator.ink) lets Windows itself paint
// the last little bit - from the last point GazBoard drew to wherever the pen
// is right now - straight onto the screen, without waiting for the relay. It
// is how Microsoft Whiteboard keeps its ink stuck to the pen.
//
// Nothing Windows paints this way is ever part of the board. It is thrown
// away on the next frame, when GazBoard's own ink has caught up and covers
// the same spot. So the store, undo, saving, the frozen copy and the export
// never see it, and switching it off leaves nothing behind.
//
// Only a plain pen gets it. The trail is one solid colour at one width: right
// for a pen, wrong for the highlighter (see-through), the rainbow and galaxy
// inks (a gradient), and a stroke held to the ruler (the pen is not where the
// ink goes). Those simply draw the way they always have.

/** Windows, with a Chromium new enough to have the API. */
export function inkTrailSupported(nav = (typeof navigator !== 'undefined' ? navigator : null)) {
  if (!nav || !nav.ink || typeof nav.ink.requestPresenter !== 'function') return false;
  // The API exists on every platform, but only Windows has the compositor
  // support that makes it do anything.
  return /Windows/i.test(nav.userAgent || '');
}

export class InkTrail {
  constructor(canvas) {
    this.canvas = canvas;
    this.presenter = null;   // set once requestPresenter resolves (or by a test)
    this.on = false;
    this._asking = null;
    this.sent = 0;           // how many trail updates went out - for the tests
  }

  /** Turn the trail on or off. Asking Windows for the presenter happens once. */
  setEnabled(on) {
    this.on = !!on;
    if (!this.on || this.presenter || this._asking || !inkTrailSupported()) return;
    try {
      this._asking = navigator.ink.requestPresenter({ presentationArea: this.canvas })
        .then((p) => { this.presenter = p; })
        .catch(() => { this.presenter = null; })
        .finally(() => { this._asking = null; });
    } catch { this._asking = null; }
  }

  /**
   * Tell Windows where our own ink ends: it paints from there to the pen.
   * `e` must be the pointermove that delivered the point just drawn.
   * @returns {boolean} whether an update was sent
   */
  update(e, color, diameter) {
    if (!this.on || !this.presenter || !e) return false;
    try {
      this.presenter.updateInkTrailStartPoint(e, { color, diameter: Math.max(1, diameter) });
      this.sent++;
      return true;
    } catch {
      // A synthetic event, or a colour the OS cannot use: this frame simply
      // goes without a trail, exactly as if the setting were off.
      return false;
    }
  }
}

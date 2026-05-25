const { Plugin } = require("obsidian");

const INTERNALS = Object.freeze({
  minEventDeltaX: 4,
  triggerDistance: 45,
  horizontalDominance: 1.15,
  burstIdleMs: 140,
  rearmIdleMs: 40,
});

module.exports = class DesktopSidebarGesturesPlugin extends Plugin {
  async onload() {
    this.resetBurst();

    this.registerDomEvent(window, "wheel", (event) => this.onWheel(event));
  }

  onunload() {
    this.resetBurst();
  }

  onWheel(event) {
    if (!event || typeof event.deltaX !== "number" || typeof event.deltaY !== "number") {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      return;
    }

    const now = Date.now();
    if (this.burst.triggered) {
      if (now - this.burst.lastAt <= INTERNALS.rearmIdleMs) {
        this.burst.lastAt = now;
        return;
      }

      this.resetBurst();
    }

    if (Math.abs(event.deltaX) < INTERNALS.minEventDeltaX) {
      this.maybeExpireBurst(now);
      return;
    }

    if (now - this.burst.lastAt > INTERNALS.burstIdleMs) {
      this.resetBurst();
    }

    this.burst.sumX += event.deltaX;
    this.burst.sumAbsX += Math.abs(event.deltaX);
    this.burst.sumAbsY += Math.abs(event.deltaY);
    this.burst.maxAbsX = Math.max(this.burst.maxAbsX, Math.abs(event.deltaX));
    this.burst.lastAt = now;

    if (this.burst.triggered) {
      return;
    }

    const horizontalStrength = Math.max(Math.abs(this.burst.sumX), this.burst.maxAbsX);
    if (horizontalStrength < INTERNALS.triggerDistance) {
      return;
    }

    const vertical = Math.max(this.burst.sumAbsY, 1);
    if (this.burst.sumAbsX / vertical < INTERNALS.horizontalDominance) {
      return;
    }

    const direction = this.burst.sumX > 0 ? "left" : "right";
    this.burst.triggered = true;
    this.handleSwipe(direction);
  }

  maybeExpireBurst(now) {
    const idleMs = this.burst.triggered ? INTERNALS.rearmIdleMs : INTERNALS.burstIdleMs;
    if (now - this.burst.lastAt > idleMs) {
      this.resetBurst();
    }
  }

  resetBurst() {
    this.burst = {
      sumX: 0,
      sumAbsX: 0,
      sumAbsY: 0,
      maxAbsX: 0,
      lastAt: 0,
      triggered: false,
    };
  }

  handleSwipe(direction) {
    if (direction === "right") {
      if (this.isOpen(this.app.workspace.rightSplit)) {
        this.app.workspace.rightSplit.collapse();
        return;
      }

      if (this.canOpen(this.app.workspace.leftSplit)) {
        this.app.workspace.leftSplit.expand();
      }

      return;
    }

    if (direction === "left") {
      if (this.isOpen(this.app.workspace.leftSplit)) {
        this.app.workspace.leftSplit.collapse();
        return;
      }

      if (this.canOpen(this.app.workspace.rightSplit)) {
        this.app.workspace.rightSplit.expand();
      }
    }
  }

  isOpen(split) {
    return Boolean(split && split.collapsed === false);
  }

  canOpen(split) {
    return Boolean(split) && this.splitHasContent(split);
  }

  splitHasContent(split) {
    const seen = new Set();
    const stack = [split];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || seen.has(current)) {
        continue;
      }

      seen.add(current);

      if (current.type === "leaf") {
        return true;
      }

      if (Array.isArray(current.children)) {
        for (const child of current.children) {
          stack.push(child);
        }
      }
    }

    return false;
  }
};

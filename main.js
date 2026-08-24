const { Plugin, PluginSettingTab, Setting } = require("obsidian");

const INTERNALS = Object.freeze({
  minEventDeltaX: 4,
  triggerDistance: 45,
  horizontalDominance: 1.15,
  burstIdleMs: 140,
  rearmIdleMs: 40,
});

const ZONE_PERCENT = Object.freeze({
  min: 0,
  max: 100,
  maxTotal: 98,
});

const DEFAULT_SETTINGS = Object.freeze({
  limitToEdges: false,
  leftZonePercent: 33,
  rightZonePercent: 33,
});

module.exports = class DesktopSidebarGesturesPlugin extends Plugin {
  async onload() {
    this.resetBurst();
    await this.loadSettings();

    this.addSettingTab(new DesktopSidebarGesturesSettingTab(this.app, this));
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

    if (!this.isInEdgeZone(event)) {
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

  isInEdgeZone(event) {
    if (!this.settings.limitToEdges) {
      return true;
    }

    if (typeof event.clientX !== "number") {
      return true;
    }

    const width = this.viewportWidth(event);
    if (width <= 0) {
      return true;
    }

    const leftEdge = this.splitInnerEdge(this.app.workspace.leftSplit, "left", width);
    const rightEdge = this.splitInnerEdge(this.app.workspace.rightSplit, "right", width);
    const zones = this.zoneWidths(Math.max(rightEdge - leftEdge, 0));

    const inLeftZone = zones.left > 0 && event.clientX <= leftEdge + zones.left;
    const inRightZone = zones.right > 0 && event.clientX >= rightEdge - zones.right;

    return inLeftZone || inRightZone;
  }

  zoneWidths(span) {
    const left = span * (this.settings.leftZonePercent / 100);
    const right = span * (this.settings.rightZonePercent / 100);
    const total = left + right;
    const maxTotal = span * (ZONE_PERCENT.maxTotal / 100);

    if (total <= maxTotal) {
      return { left: left, right: right };
    }

    const scale = maxTotal / total;
    return { left: left * scale, right: right * scale };
  }

  splitInnerEdge(split, side, viewportWidth) {
    const windowEdge = side === "left" ? 0 : viewportWidth;
    if (!this.isOpen(split) || !split.containerEl) {
      return windowEdge;
    }

    const rect = split.containerEl.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return windowEdge;
    }

    return side === "left" ? rect.right : rect.left;
  }

  viewportWidth(event) {
    const view = event.view;
    if (view && typeof view.innerWidth === "number") {
      return view.innerWidth;
    }

    return window.innerWidth;
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

  async loadSettings() {
    const stored = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);

    if (typeof stored.edgeZonePercent === "number" && stored.leftZonePercent === undefined) {
      this.settings.leftZonePercent = stored.edgeZonePercent;
      this.settings.rightZonePercent = stored.edgeZonePercent;
    }

    delete this.settings.edgeZonePercent;
    this.settings.leftZonePercent = clampZonePercent(this.settings.leftZonePercent, "left");
    this.settings.rightZonePercent = clampZonePercent(this.settings.rightZonePercent, "right");
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
};

function clampZonePercent(value, side) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) {
    return side === "left" ? DEFAULT_SETTINGS.leftZonePercent : DEFAULT_SETTINGS.rightZonePercent;
  }

  return Math.min(ZONE_PERCENT.max, Math.max(ZONE_PERCENT.min, Math.round(percent)));
}

class DesktopSidebarGesturesSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Limit gestures to the screen edges")
      .setDesc(
        "Only trigger a swipe when the pointer is near the left or right edge, leaving the middle of the window free for horizontal scrolling."
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.limitToEdges).onChange(async (value) => {
          this.plugin.settings.limitToEdges = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (!this.plugin.settings.limitToEdges) {
      return;
    }

    this.addZoneSetting("left", "Left edge zone width");
    this.addZoneSetting("right", "Right edge zone width");
  }

  addZoneSetting(side, name) {
    const key = side === "left" ? "leftZonePercent" : "rightZonePercent";

    new Setting(this.containerEl)
      .setName(name)
      .setDesc(
        `How far the ${side} zone reaches into the space between the sidebars, as a percentage of that space. Set it to 0 to ignore swipes on the ${side} entirely.`
      )
      .addSlider((slider) =>
        slider
          .setLimits(ZONE_PERCENT.min, ZONE_PERCENT.max, 1)
          .setValue(this.plugin.settings[key])
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings[key] = clampZonePercent(value, side);
            await this.plugin.saveSettings();
          })
      );
  }
}

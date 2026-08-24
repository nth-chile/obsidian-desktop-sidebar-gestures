# Desktop Sidebar Gestures

Directional desktop swipe gestures for opening and closing the left and right sidebars.

This plugin adds horizontal swipe gestures on desktop:

- Swipe right: close the right sidebar if it is open, otherwise open the left sidebar if it has content.
- Swipe left: close the left sidebar if it is open, otherwise open the right sidebar if it has content.

## Installation

From within the app:

1. Open **Settings → Community plugins** and turn off Restricted mode.
2. Select **Browse**, search for **Desktop Sidebar Gestures**, and select **Install**.
3. Select **Enable**.

Manual install:

1. Download `main.js` and `manifest.json` from the latest [release](https://github.com/nth-chile/obsidian-desktop-sidebar-gestures/releases).
2. Copy them into `<vault>/.obsidian/plugins/desktop-sidebar-gestures/`.
3. Reload the app, then enable the plugin under **Settings → Community plugins**.

## Usage

Once enabled, swipe horizontally on your trackpad anywhere in the app:

- **Swipe right** — closes the right sidebar if open, otherwise opens the left sidebar.
- **Swipe left** — closes the left sidebar if open, otherwise opens the right sidebar.

Empty or unavailable sidebars do not open on swipe.

## Settings

Under **Settings → Desktop Sidebar Gestures**:

- **Limit gestures to the screen edges** — off by default. When on, a swipe only counts if the
  pointer is near the left or right edge of the window, so horizontal scrolling in the middle of a
  note or table is left alone.
- **Left edge zone width** and **Right edge zone width** — how far each zone reaches into the space
  between the sidebars, as a percentage of that space (0–100%, default 33% each). An open sidebar
  counts as part of its own zone, so a zone starts at that sidebar's inner edge and extends inward.
  Set a side to 0 to ignore swipes on that side entirely, which is useful if you only keep one
  sidebar and want a wide zone on that side and nothing on the other. If the two zones would add up
  to more than the space available, both shrink proportionally so a sliver in the middle always
  keeps scrolling normally.

## Notes

- Empty or unavailable sidebars do not open on swipe.
- The plugin uses internal `wheel` heuristics rather than native OS swipe APIs, so two-finger horizontal swipes are what trigger it.

## Development

- Symlink this repo into your vault's plugins directory for faster iteration.
- Reload community plugins after each change.

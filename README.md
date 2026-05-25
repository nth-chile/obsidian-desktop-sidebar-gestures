# Desktop Sidebar Gestures

Directional desktop swipe gestures for Obsidian sidebars.

This plugin adds horizontal swipe gestures on desktop:

- Swipe right: close the right sidebar if it is open, otherwise open the left sidebar if it has content.
- Swipe left: close the left sidebar if it is open, otherwise open the right sidebar if it has content.

Notes:

- Empty or unavailable sidebars do not open on swipe.
- The plugin uses internal `wheel` heuristics rather than native OS swipe APIs.

Development:

- Symlink this repo into your vault's plugins directory for faster iteration.
- Reload community plugins in Obsidian after each change.

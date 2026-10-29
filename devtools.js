/**
 * Swaply - DevTools Registry Script
 * Creates the persistent 'Swaply' panel in Chrome F12 Developer Tools.
 */

chrome.devtools.panels.create(
  "Swaply",
  "", // Icon path
  "panel.html",
  (panel) => {
    // Panel created successfully
  }
);


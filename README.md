# Vampire Survivors Clone

A browser-based survivor game built with native JavaScript modules and Canvas 2D.

## Run locally

Start a local web server from the project directory, then open:

`http://127.0.0.1:8000/VampireSurvivorsClone.html`

The project uses native ES modules, so opening the HTML directly as a `file://` URL is not supported.

## Project structure

- `VampireSurvivorsClone.html` - minimal page shell
- `styles.css` - page and canvas styling
- `src/main.js` - application entry point
- `src/game.js` - remaining game orchestration, systems, and rendering
- `src/canvas.js` - canvas setup and responsive sizing
- `src/state.js` - initial mutable game state
- `src/audio.js` - UI and gameplay audio
- `src/support-gems.js` - affinity-based support matching
- `src/utils.js` - shared pure helpers
- `src/data/items.js` - equipment, skill gems, and support gems
- `src/data/skills.js` - passive skill-tree definitions
- `assets/audio/` - sound assets

## Refactor direction

`src/game.js` remains intentionally large while behavior is preserved. Future extractions should move one system at a time—input, combat, pickups, inventory, effects, then rendering—and verify the game after every step.

# Task: Build an ASCII Art Stochastic Dissolve Transition

Build a web page that smoothly transitions between two large ASCII arts using a stochastic dissolve effect. The two arts are a snowy beach scene and a lighthouse scene, both ~300 characters wide and ~80 lines tall. They will be used as a background element on a personal website.

## What "stochastic dissolve" means

Given two ASCII art strings A and B and a blend parameter α ∈ [0, 1]:
- For each character cell (r, c) in the grid, independently show character A with probability (1 - α) or character B with probability α.
- At α = 0, you see pure A. At α = 1, pure B. In between, you get a random dithered mix where individual cells are flipping from A to B.
- The random choices should be seeded so that for a given α, the output is deterministic (no flickering on re-render). But as α increases, more cells should flip from A → B. **Important**: once a cell flips to B, it should stay as B for all higher α values. This means you should pre-assign each cell a random threshold in [0, 1], and show B if α > threshold, A otherwise.

## Requirements

### Core
- Load two ASCII art strings (provided as JS constants or read from files).
- Pad both to the same dimensions (max rows, max cols, pad with spaces).
- Support a **vertical offset** parameter that shifts Art A down by N rows relative to Art B before blending. This is needed because the two arts have their horizon lines at different heights. Default to 18 rows offset.
- Render the blended output in a `<pre>` tag with a monospace font.
- Provide a slider for α that goes from 0 to 1.
- Provide a play/pause button that auto-animates α back and forth (ping-pong) at a comfortable speed (~3-4 seconds for a full sweep).

## Stack
- Vanilla HTML/CSS/JS (single file is fine), OR React if you prefer. No build step required.
- No external dependencies needed.

## ASCII art data
The two ASCII arts are provided in the attached file `ascii_arts.js`. They are exported as `SNOWY_BEACH` and `LIGHTHOUSE`. Both use the character vocabulary ` .:-=+*#%@` plus structural characters like `/\|()-_` etc.
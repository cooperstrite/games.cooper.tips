# games.cooper.tips

A playful single-page playground inspired by [neal.fun](https://neal.fun), bundling a few quick mini-games you can host on GitHub Pages.

## Games

- **Hot & Cold** — Hunt down a mystery number with warmer/colder hints on every guess.
- **Flash Reflex** — Train your reaction speed by tapping the moment the panel lights up.
- **Snake** — Glide through the garden and gobble up apples. Customize a Generic, Gardener, Python, or Rattlesnake skin in eight colors, add hats, glasses, and neckwear, and toggle music and sound effects.
- **Aurora Archery** — Customize your archer, bow, and arrows in a mountain landscape, and explore six trails with moving targets, changing wind, and distances from 20 to 70 meters.
- **Runway Glide** — Line up the runway lights and land the plane on target.
- **Rocket Boost** — Hold boost, stage within the target band, and reach orbit.
- **Switchyard Signals** — Flip the switch before each train hits the junction.
- **Red Light Green Light** — Hold to sprint toward the finish while freezing the instant the signal turns red.
- **Memory Loop** — Flip cards to match every pair, tuning the tile count to dial up the difficulty.
- **Tower Stack** — Drop moving blocks with precise timing to grow the tallest, straightest tower.
- **Orbit Dash** — Hold Dash/space to burst outward through the glowing gate, release to reset your orbit, and chain flawless passes for a faster streak.
- **Pop Dash** — Click bubbles the instant they appear to keep the streak alive before they burst.
- **Nim Duel** — Choose a pile, remove 1–3 matches, and outthink the flawless AI so it’s forced to take the final stick.
- **Bubble Rally** — Pop the orb to sprint around the neon loop, riding boosts and dodging slowdowns to win the race.
- **Skyport Command** — Pick a contract, ensure you have the energy, dispatch a drone, and reinvest the cargo/credits before the 3-minute day ends.
- **Harmonic Echo** — Master a growing instrument sequence across dynamic difficulty modes.
- **Spot Clash** — Race an AI rival to find the shared symbol across dueling glyph cards.
- **Cats vs Dogs** — Lead the feline squad in a tile-by-tile tug-of-war to control Meadow Park.
- **Lights Down** — A compact Lights Out puzzle; toggle tiles (and their neighbors) to dim the board.
- **Submerged Explorer** — Glide through ocean zones, collect samples, and finish mission objectives in a retro submarine.
- **Spotlight** — Compare two vibrant scenes and spot every subtle difference against the clock.
- **Food Chain Relay** — Shuffle producers, consumers, and apex predators back into order to prove you understand energy flow.
- **Neon Drift** — Pick from five routes, four difficulty levels, and four cars with special abilities. Traffic and speed build with distance. Choose a 1 km, 3 km, 8 km, or endless drive, with crash explosions, varied vehicles, music, and sound effects.

Neon Drift controls: A/D or the arrow keys steer, Space boosts, and E activates your car's ability. Comet GT has a nitro surge, Sentinel SUV shields one impact and flings the other car away, Phantom Coupe phases through traffic, and Rally RS slows approaching traffic and improves handling. Country Curves has blind bends and hills; Alpine Pass has fog and crests; Midnight Rain has slippery steering; Canyon Crosswinds has gusts and heavy trucks. Music and Sound FX can be toggled separately, and your choices are saved in this browser.

Snake controls: arrow keys, WASD, or the on-screen arrows steer; Space pauses and resumes. Skin, color, and accessory changes apply immediately without restarting. Mix a straw hat, royal crown, party hat, or flower crown with round glasses or sunglasses and a bandana, bow tie, or scarf. Hat's "Match skin" option gives the Gardener a straw hat; "None" removes it. Appearance, Music, and Sound FX preferences are saved in this browser. Music starts with a game, pauses when you pause, and stops when you leave Snake.

Aurora Archery is in the main game list. Drag in the range or use the angle and power sliders to aim; Space shoots and P pauses. Up/Down adjusts angle, Left/Right adjusts power. You have six arrows to reach each trail's displayed goal. Gold scores 9-10 points, with lower scores toward the outside and zero for a miss. The dotted flight guide assumes the current wind stays steady: rightward wind pushes arrows farther, while leftward wind slows them down. Lead moving targets by aiming where they will be when the arrow arrives.

First Flight teaches the bow. Meadow Breeze gives each arrow a different wind, held steady while you aim and shoot. Lantern Lift moves the target, while Gusty Gorge changes wind continuously, including during flight. Longshot Lake changes distance after each arrow, between 35 and 70 meters, with calm wind. Aim and power stay unchanged when conditions change, so recalibrate before your next shot. Shot history records the distance and wind for comparison. Aurora Finale combines shifting wind with a target moving between 54 and 66 meters.

The customization studio sits below the instructions. Use **Customize archer & bow** to jump straight to it. All appearance choices are cosmetic and save automatically with your best scores and earned stars in this browser.

Start with a Trail ranger, Woodland scout, or Aurora knight, then use the Face, Hair, and Outfit tabs. Choose skin and eye colors, face shape, freckles or a scar, seven hairstyles, six facial hair styles, independent hair and beard colors, five headwear options, glasses, an eye patch or an earring, outfit and trim colors, and boots. Headwear has its own color; changing outfits preserves your hair and headwear. Color palettes include a custom color picker. Switch between the full-body preview and a face close-up to see the details.

The bow section has a dedicated close-up of the Woodland longbow, Swift recurve, or Aurora crystal bow. Choose six preset colors, a custom color, and three grip wraps. The previews and the archer on the range share the same artwork. Woodcraft, Moonsteel, and Aurora crystal arrows also offer six feather colors.

## Getting Started

1. Clone the repository: `git clone https://github.com/<your-user>/games.cooper.tips.git`
2. Install dependencies (none required) and choose a local preview option:
   - Open `index.html` directly in a browser for a quick check (no build step).
   - Run a static server for live reloads and correct SPA routing. Examples:
     - `npx serve .`
     - `python3 -m http.server 4173`
   - Keep the terminal open while you edit; the browser reloads automatically on refresh.

## Local Testing

The project is entirely client-side, so functional testing is manual:

- Walk through each game module after making changes to confirm interactions still work.
- Use browser devtools for responsive checks; the layout adapts down to small screens.
- Optional: enable network throttling or reduced motion in devtools to test accessibility quirks.

Neon Drift's driving rules also have focused automated checks: `node --test tests/neon-drift.test.mjs`. Its simulation, canvas rendering, and Web Audio soundtrack are in `neon-drift-engine.js`, `neon-drift.js`, and `neon-drift-audio.js`; no build step or dependencies are required.

Aurora Archery's flight, scoring, wind, target motion, and round rules have focused checks: `node --test tests/archery.test.mjs`. Its rules, renderer, appearance, and controls are in `archery-engine.js`, `archery-renderer.js`, `archery-appearance.js`, and `aurora-archery.js`.

## Deployment

Because the project is fully static (HTML/CSS/JS), you can deploy it as-is via GitHub Pages.

### GitHub Actions workflow

1. Ensure the repository has GitHub Pages enabled via **Settings → Pages** and choose **GitHub Actions** as the source.
2. Commit the workflow in `.github/workflows/deploy.yml` (included here) to the default branch.
3. On every push to `main`, the workflow uploads the static files and publishes them to Pages. The generated URL appears in the workflow summary.

### Manual publishing (fallback)

1. Push the `index.html`, `style.css`, and `script.js` files to the repository's default branch.
2. In **Settings → Pages**, choose the branch and root directory (`/`).
3. Save and wait for GitHub Pages to publish. Visit `https://games.cooper.tips` to play.

## Customization

The structure is intentionally lightweight. Add new games by extending the `games` array in `script.js` with a new entry that implements an `init(root)` function returning a cleanup callback. Style additions can live alongside the provided design language in `style.css`.

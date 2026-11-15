# Code Your Adventure ✦ — GWC × OCGS STEM Expo

A mobile-first site for the Girls Who Code booth at the OCGS STEM Expo. It's a remake of the original
[Code Your Adventure](https://stem-expo-website-a58l.vercel.app/) site with tabs, claymorphism and liquid glass.

## Tabs
- **Home**: a launcher with a 3D clay bracelet spelling "GWC" in binary (drag to spin).
- **Create**: the Binary Bracelet Studio. Type your name and see it as beads, pick bead colors, spin it in 3D, copy the code, and open the A–Z binary alphabet.
- **Solve**: 3 beginner challenges (strings, binary, loops). Stars are saved on the device.
- **Play**: Scratch, Code.org, MakeCode Arcade, Blockly Games.
- **About**: the Girls Who Code club.

## Bitsy the red panda
Bitsy is a clay red panda built from three.js shapes in `js/panda.js`. Bitsy appears on every tab except Home, with a different animation on each:

| Tab | Animation |
|---|---|
| Create | Taps along while you type |
| Solve | Thinks, with a paw on the chin |
| Play | Hops |
| About | Sways under a floating clay heart |

Bitsy also reacts to what visitors do:
- Taps: a wiggle.
- Typing: reads out the newest letter in binary.
- Right answers: a cheer and a spin.
- Wrong answers: shakes its head.

Any feature can trigger a reaction with `bitsy(kind, line)` from `js/bitsy.js`. The kinds are `cheer`, `oops`, `happy` and `tap`.

If 3D isn't available, the site shows `assets/red-panda.webp` with CSS animations instead.

## Design
- **Clay** (`styles/clay.css`) for cards and tiles: big radius, a light top-left inner shadow, a dark bottom-right inner shadow and one outer Y shadow.
- **Liquid glass** (`styles/glass.css`) for buttons, the tab bar, the header and sheets: blur, saturation, a bright rim and a top highlight. It falls back to solid white when "reduce transparency" is on.
- Colors are in `styles/tokens.css`.
- 3D uses [three.js](https://threejs.org/) from a CDN. It's lazy-loaded, pauses when off-screen and is skipped if WebGL isn't available.

## Run locally
There's no build step:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy
Import this repo into Vercel as a static site. Leave the framework preset set to "Other" and leave the build command empty.

## Editing challenges
Challenges are in `js/challenges-data.js`.

## Updating the live site
After you change any files, run `./stamp.sh` before you commit. It adds a new version tag to every script and stylesheet link, so phones load the new files instead of old cached copies.

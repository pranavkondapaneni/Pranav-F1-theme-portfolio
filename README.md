# Pranav Kondapaneni

<p align="center">
  <strong>Software Engineer at J.B. Hunt Transport Services &middot; M.S. in Computer Science at Georgia Tech</strong>
</p>

<p align="center">
  <a href="https://pranavkondapaneni.github.io/Pranav-F1-theme-portfolio/"><img src="https://img.shields.io/badge/Live%20Demo-Online-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo"></a>
  <a href="https://www.linkedin.com/in/pranavkondapaneni/"><img src="https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
  <a href="https://github.com/pranavkondapaneni/Pranav-F1-theme-portfolio/actions/workflows/deploy.yml"><img src="https://img.shields.io/badge/Deploy%20to%20GitHub%20Pages-Active-success?style=for-the-badge&logo=githubactions&logoColor=white" alt="Deployment Status"></a>
  <a href="https://github.com/pranavkondapaneni/Pranav-F1-theme-portfolio/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-Passing-2ea44f?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI Status"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Three.js-0.186-black?logo=three.js" alt="Three.js">
  <img src="https://img.shields.io/badge/WebGL-2.0-red?logo=webgl" alt="WebGL 2.0">
  <img src="https://img.shields.io/badge/Architecture-Vanilla%20JS%20(Zero%20Frameworks)-yellow" alt="Zero Frameworks">
  <img src="https://img.shields.io/badge/Performance-60%20FPS%20%7C%20%3C200ms%20First%20Paint-blue" alt="Performance">
  <img src="https://img.shields.io/badge/Accessibility-WCAG%20AA%20%7C%20Apple%20HIG-purple" alt="Accessibility">
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License">
</p>

---

## Overview

A high-performance personal portfolio engineered around an interactive 3D Formula 1 car and a real-time Eulerian fluid simulation wind tunnel. Built entirely in vanilla JavaScript, WebGL, and modern CSS with zero heavy runtime frameworks, this site pairs bespoke aesthetic craft with computational graphics and rigorous accessibility standards.

[![Pranav Kondapaneni's race-car portfolio hero](assets/readme-preview.webp)](https://pranavkondapaneni.github.io/Pranav-F1-theme-portfolio/)

> **Live Deployment:** [https://pranavkondapaneni.github.io/Pranav-F1-theme-portfolio/](https://pranavkondapaneni.github.io/Pranav-F1-theme-portfolio/)  
> **LinkedIn:** [linkedin.com/in/pranavkondapaneni](https://www.linkedin.com/in/pranavkondapaneni/)

---

## Visual Showcase

<div align="center">
  <table>
    <tr>
      <td width="50%" align="center">
        <img src="docs/car.webp" alt="3D F1 Car Studio" /><br>
        <em>Interactive 3D Car under procedural studio softboxes</em>
      </td>
      <td width="50%" align="center">
        <img src="docs/phone.webp" alt="Mobile Viewport Telemetry" /><br>
        <em>Mobile cockpit with centered HUD and responsive touch orbit</em>
      </td>
    </tr>
    <tr>
      <td colspan="2" align="center">
        <img src="docs/sections.webp" alt="Stints, Setup, and Education" /><br>
        <em>Telemetry sheets: career stints, skill telemetry, and educational credentials</em>
      </td>
    </tr>
  </table>
</div>

---

## Technical Highlights & Engineering Architecture

### 1. Real-Time Eulerian Fluid Dynamics Wind Tunnel (`windtunnel.js`)
- **Navier-Stokes Solver:** A fixed-step 2D pressure-projected grid simulation with midpoint-advection tracers and continuous flow extrapolation.
- **Signed Distance Fields (SDF):** Uses an 8-pass Jump Flooding Algorithm (JFA) generated from the car silhouette and HTML typography in real time, preventing smoke penetration into obstacles.
- **Volumetric Lighting:** Single-scattering ray-marched lighting pass with key light, simulated laser sheet, obstacle shadowing, and atmospheric haze.
- **Adaptive Quality Governor:** Automatically monitors frame pacing and scales tracer density between 4,000 and 42,000 particles based on hardware capability, DPR, and network data-saver modes.
- **Pointer Deflection:** Desktop cursor movements dynamically inject fluid velocity vectors to displace the smoke stream.

### 2. Interactive 3D Formula 1 Race Car (`car.js`)
- **Procedural 3D Geometry:** Custom Formula 1 model built in Blender with ray-traced Cycles ambient occlusion (AO) baked directly into the livery atlas.
- **Mesh Compression & Optimization:** Draco-compressed GLB assets (`assets/car.glb` and `assets/car_mobile.glb`) loaded via dedicated Web Workers.
- **Studio Lighting & Material Shader:** High-fidelity environment map generated dynamically from procedural feathered softboxes, providing realistic clearcoat reflections without expensive runtime shadow maps.
- **Demand-Driven GPU Rendering:** Renders strictly when moving or interacting; idles to 0 FPS when stationary or scrolled out of view to preserve battery and GPU cycles.
- **Full 360° Controls:** Smooth mouse drag, touch controls preserving native vertical scrolling, arrow keys, and keyboard **Home** reset.

### 3. F1 Cockpit Telemetry & Race HUD (`main.js`)
- **Velocity-Driven Speedometer:** Dynamic digital speedometer calculating scroll velocity in real time, rendered via SVG 7-segment display paths.
- **Rev Limiter LED Shift Strip:** Progresses from green &rarr; yellow &rarr; red as scroll acceleration approaches the virtual rev limiter.
- **5-Lamp FIA Start Lights:** Replayable 5-red-lamp launch sequence with abort/skip on scroll or keypress.
- **Lap Progress Tracker:** Custom progress bar fixed to the viewport tracking reading depth.
- **Holographic Driver Card:** Pointer-tracked 3D gyroscopic sheen and chamfered anisotropic reflections.

### 4. Apple Human Interface Guidelines & Accessibility
- **WCAG AA Compliant:** High-contrast text hierarchies verified over active smoke flows.
- **Motion & Contrast Preferences:** Full native support for `prefers-reduced-motion`, `prefers-contrast: more`, and `prefers-reduced-transparency`. Motion can also be paused via the explicit UI toggle.
- **Dynamic Type & Typography:** Modular scale using `rem` units following iOS Dynamic Type conventions. PK Wide display headings are sized with container units to eliminate line clipping even at 200% zoom.
- **Progressive Enhancement:** Instant first paint with responsive WebP posters; gracefully degrades if WebGL or Web Workers are unavailable or in Save-Data mode.
- **Touch Targets:** Strict 44 &times; 44 pt minimum touch zones on mobile viewports.

### 5. Zero-Framework Web Performance
- **Zero Heavy Runtimes:** No React, Vue, or heavy framework overhead; written in clean, modern vanilla JavaScript (ES2022).
- **Tree-Shaken Three.js:** Custom bundle (`tools/build_three.mjs`) trimming Three.js from 2.1 MB down to ~212 KB gzip.
- **100% Self-Hosted:** No third-party CDN dependencies; fonts, Draco decoders, models, and scripts are served with zero external network waterfalls.
- **Sub-200ms First Paint:** Critical fonts and posters preload immediately, letting the hero paint before 3D models begin transferring.

---

## Codebase Map

```
Pranav-F1-theme-portfolio/
├── .github/
│   └── workflows/
│       ├── deploy.yml            # Automated GitHub Pages CD workflow
│       └── ci.yml                # CI build and syntax validation workflow
├── assets/
│   ├── car.glb                   # Full-detail Draco 3D F1 car model
│   ├── car_mobile.glb            # Optimized lightweight mobile 3D model
│   ├── car-poster*.webp          # Responsive fallback posters across 7 viewports
│   ├── fonts/                    # Self-hosted PK Wide, JetBrains Mono, Titillium Web
│   ├── logos/                    # Verified vector sponsor & university marks
│   ├── smoke/                    # Particle motes, wisp, and smoke texture atlases
│   └── metal/                    # Anisotropic metal normal & roughness maps
├── blender/
│   └── build_car.py              # Procedural Blender car generator & Cycles bake script
├── docs/                         # High-resolution architectural screenshots
├── tests/
│   ├── site.cjs                  # Playwright regression, layout & FPS test suite
│   └── VALIDATION.md             # Benchmark measurements & device profiles
├── tools/
│   ├── build_three.mjs           # Three.js tree-shaking & esbuild bundler
│   ├── serve.cjs                 # Fast Node.js local server with gzip compression
│   ├── serve.py                  # Python 3 development server with gzip support
│   └── build_font.py             # PK Wide typeface generation tool
├── car.js                        # 3D Three.js scene, Draco loader, and orbit camera
├── index.html                    # Semantic HTML5 markup, preloads, and import map
├── main.js                       # Telemetry HUD, rev lights, start sequence & holo card
├── metal.js                      # Anisotropic lighting shader for graphite plates
├── refinements.css               # Apple HIG refinements and precision alignments
├── styles.css                    # Design system variables, layout, and responsive rules
└── windtunnel.js                 # WebGL Eulerian fluid solver & SDF smoke tracer
```

---

## Quick Start & Local Development

The site is built with static web standards and requires no build step to preview.

### Option A: Using Node.js (Recommended)

```bash
# Clone the repository
git clone https://github.com/pranavkondapaneni/Pranav-F1-theme-portfolio.git
cd Pranav-F1-theme-portfolio

# Start the local development server (serves with gzip and no-cache)
npm run serve
# Server runs at http://127.0.0.1:8765/
```

### Option B: Using Python

```bash
python tools/serve.py
# Or specify a custom port: python tools/serve.py 8767
```

---

## Automated Testing & Validation

The test suite validates responsive layouts across 10 viewports (320px to 2560px), pointer/touch interactions, keyboard controls, reduced-motion preferences, WebGL context loss/restoration, and frame pacing.

```bash
# Install test dependencies
npm ci

# Install Playwright Chromium browser binary
npx playwright install chromium

# Run the test suite
npm test
```

### Build Tools

- **Rebuild Three.js Bundle:**
  ```bash
  npm run build:three
  ```
- **Rebuild 3D Car (requires Blender):**
  ```bash
  blender --background --python blender/build_car.py -- --no-bake
  ```

---

## Deployment to GitHub Pages

This repository is configured with an automated continuous deployment pipeline via GitHub Actions.

1. **Automatic Workflow (`.github/workflows/deploy.yml`):**
   - Automatically triggers on every push to the `main` branch.
   - Packages and verifies all assets with `.nojekyll` enabled.
   - Deploys directly to GitHub Pages without generating orphaned branches.

2. **GitHub Repository Configuration:**
   - Go to **Settings** &rarr; **Pages**.
   - Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
   - The site will deploy to `https://<username>.github.io/Pranav-F1-theme-portfolio/`.

---

## Engineering Metrics

| Metric | Measured Value | Standard / Target |
| --- | ---: | ---: |
| **First Contentful Paint (FCP)** | 184 ms | &le; 1,800 ms (Good) |
| **Largest Contentful Paint (LCP)** | 0.88 s | &le; 2,500 ms (Good) |
| **Cumulative Layout Shift (CLS)** | 0.00 | &le; 0.10 (Good) |
| **Total JavaScript Bundle** | 212 KB (gzip) | Down from 2.1 MB CDN graph |
| **Idle GPU Draw** | 0 FPS (0 draw calls) | GPU releases when car is parked |
| **Active Simulation** | 60 FPS steady | 20k–42k particles with JFA SDF collision |
| **Accessibility Audit** | 100% clean | WCAG AA & Apple HIG compliant |

---

## Credits & Attributions

- **Identity & Subject:** Pranav Kondapaneni &middot; [LinkedIn](https://www.linkedin.com/in/pranavkondapaneni/)
- **Design & Creative Engineering:** Adam Nolle
- **3D Engine:** [three.js](https://threejs.org/) (MIT License)
- **Mesh Decoder:** [Google Draco](https://google.github.io/draco/) (Apache 2.0)
- **Typography:**
  - *PK Wide* &mdash; Original custom display typeface generated by `tools/build_font.py`.
  - *Titillium Web* &mdash; SIL Open Font License (self-hosted).
  - *JetBrains Mono* &mdash; SIL Open Font License (self-hosted).
- **Marks & Logos:** Organization marks represent Pranav's employer (J.B. Hunt) and educational institutions (Georgia Tech, Missouri S&T). Respective owners retain all rights. Provenance documented in [`assets/logos/SOURCES.md`](assets/logos/SOURCES.md).

---

<p align="center">
  <sub>Built for precision, speed, and craft &middot; &copy; 2026 Pranav Kondapaneni</sub>
</p>

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static HTML + JavaScript **slide presentation about the Fourier transform / FFT** (Sofia University 2024). There is no server-side code and no build step. Each slide is a standalone `.html` page in the repo root. It used to be an ASP.NET MVC app; that was removed and the server-side DFT endpoints were replaced by `Scripts/fourier.js`.

## Run & test

Serve the repo root over HTTP. Opening the pages via `file://` breaks canvas image reads (`convolution.html`) and microphone access (`fftd.html`, `sound-speed.html`):

```bash
npx serve .            # or: python -m http.server
```

Unit tests for the transform code (Node 18+, no dependencies):

```bash
node --test tests/fourier.test.js
# single test:
node --test --test-name-pattern="parseComplex" tests/fourier.test.js
```

`tests/aforge-golden.json` holds reference outputs captured from the original C# AForge.Math code before it was deleted. It is the source of truth for the transform conventions, so don't regenerate it from the JS.

## Architecture

- **Slide order lives in the pages.** Each page sets `var frward = 'x.html'; var backward = 'y.html';`, and `Scripts/navigation.js` navigates on Ctrl+→ / Ctrl+← (Alt+P cycles a presenter cursor). To insert or reorder a slide, update `frward`/`backward` on the neighbouring pages. The chain starts at `index.html`. `dft.html` and `mony.html` exist but aren't in the chain.
- **Page skeleton:** every page repeats the same `<head>` (Content/css/*, Google Fonts, jQuery 1.12) and the footer + `navigation.js`. There is no shared layout, so a change to the skeleton has to be made in every page. `logo.html` is different: it has no footer.
- **`Scripts/fourier.js`** is a global `Fourier` (also a CommonJS export for tests) with `dft`, `fft` (radix-2, falls back to `dft` for non-power-of-2 lengths) and `parseComplex`. Complex values are `{Re, Im}`; results also carry `Magnitude` and `Phase`. Convention (inherited from AForge DFT): `e^(-2πi·jk/N)` forward, and the **1/N scaling is on the forward transform**.
- **Demo slides:** `dft.html` and `dft1.html` use `Scripts/fft.js` (+ `fft1.js`) with string inputs like `"3-2i"` and `{time, fft}` arrays of `{real, imag}`. `dft2.html` uses `Scripts/fft2.js` (drawn curve → FFT → magnitude filter → inverse). `fftd.html` and `sound-speed.html` use the vendored `Scripts/p5/` (p5.sound) and `Scripts/lame/`.
- **Paths are relative everywhere** (including `Content/css/Site.css` → `../../fonts/`), so the site works from a sub-folder or any static host. Keep file names lowercase/exact-case: static hosts are case-sensitive.
- **Styles:** `Content/css/grid-layout.css` and `input-style.css` are compiled from `Content/Less/*.less` (originally by the VS Web Compiler extension). If you change the `.less`, recompile it into `Content/css/`. `Site.css` has no LESS source.

# Demo Assets

This folder contains launch/demo visuals:

- `workflow.svg`
- `discovery-routing.svg`
- `social-card.svg`
- `host-worker-model.svg`
- `support-matrix.svg`
- `output-example.svg`
- `storyboard/` frames and HTML page
- `../../assets/social-preview.png` (PNG social preview)
- `export/` generated PNG sequence + combined preview

## Regenerate Storyboard Frames

```bash
npm run demo:render
```

## Export Demo PNG Assets

```bash
npm run demo:export-png
```

This cross-platform Node script updates:

- `docs/demo/export/frame-01.png`
- `docs/demo/export/frame-02.png`
- `docs/demo/export/frame-03.png`
- `docs/demo/export/demo-preview.png`

Storyboard generation updates:

- `docs/demo/storyboard/frame-01.svg`
- `docs/demo/storyboard/frame-02.svg`
- `docs/demo/storyboard/frame-03.svg`
- `docs/demo/storyboard/index.html`

Storyboard scenario:
- Codex host
- Gemini research worker
- Ollama local worker
- unified answer with disagreements and next checks

## GIF Note

`councilkit-demo.gif` is not generated automatically in this repo. Use the storyboard frames to produce a GIF in your preferred tooling.

#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(path.join(__dirname, ".."));
const storyboardDir = path.join(repoRoot, "docs", "demo", "storyboard");
const exportDir = path.join(repoRoot, "docs", "demo", "export");
const frameNames = ["frame-01", "frame-02", "frame-03"];

function renderSvgToPng(svgSource) {
  const resvg = new Resvg(svgSource, {
    background: "#0B1220"
  });
  return resvg.render().asPng();
}

function makePreviewSvg(framePngs) {
  const toImage = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`;
  return `<svg width="1600" height="900" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heroGrad" x1="72" y1="56" x2="930" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E2E8F0"/>
      <stop offset="0.52" stop-color="#93C5FD"/>
      <stop offset="1" stop-color="#34D399"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="#0B1220" />
  <rect x="38" y="34" width="1524" height="832" rx="24" fill="#111827" stroke="#334155" stroke-width="2" />
  <text x="74" y="104" fill="url(#heroGrad)" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700">CouncilKit Demo Preview</text>
  <text x="74" y="146" fill="#93C5FD" font-family="Segoe UI, Arial, sans-serif" font-size="24">Host prompt -> CouncilKit routing -> Workers -> Unified Answer</text>
  <text x="74" y="182" fill="#34D399" font-family="Segoe UI, Arial, sans-serif" font-size="22">Scenario: Codex host + Gemini research + Ollama local fallback</text>
  <image href="${toImage(framePngs[0])}" x="74" y="226" width="470" height="264" />
  <image href="${toImage(framePngs[1])}" x="564" y="226" width="470" height="264" />
  <image href="${toImage(framePngs[2])}" x="1054" y="226" width="470" height="264" />
  <rect x="74" y="226" width="470" height="264" rx="10" fill="none" stroke="#334155" stroke-width="2" />
  <rect x="564" y="226" width="470" height="264" rx="10" fill="none" stroke="#334155" stroke-width="2" />
  <rect x="1054" y="226" width="470" height="264" rx="10" fill="none" stroke="#334155" stroke-width="2" />
  <text x="74" y="560" fill="#CBD5E1" font-family="Segoe UI, Arial, sans-serif" font-size="22">Each run returns synthesis, disagreements, and recommended next checks.</text>
</svg>
`;
}

async function readSvgFrame(name) {
  const filePath = path.join(storyboardDir, `${name}.svg`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Missing storyboard frame "${name}.svg" at ${storyboardDir}. Run "npm run demo:render" first. ${details}`
    );
  }
}

async function main() {
  await fs.mkdir(exportDir, { recursive: true });

  const exportedFrameBuffers = [];
  for (const frameName of frameNames) {
    const svgSource = await readSvgFrame(frameName);
    const framePng = renderSvgToPng(svgSource);
    const outPath = path.join(exportDir, `${frameName}.png`);
    await fs.writeFile(outPath, framePng);
    exportedFrameBuffers.push(framePng);
  }

  const previewSvg = makePreviewSvg(exportedFrameBuffers);
  const previewPng = renderSvgToPng(previewSvg);
  const previewPath = path.join(exportDir, "demo-preview.png");
  await fs.writeFile(previewPath, previewPng);

  process.stdout.write("Exported demo PNG assets:\n");
  process.stdout.write(`- ${path.join(exportDir, "frame-01.png")}\n`);
  process.stdout.write(`- ${path.join(exportDir, "frame-02.png")}\n`);
  process.stdout.write(`- ${path.join(exportDir, "frame-03.png")}\n`);
  process.stdout.write(`- ${previewPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

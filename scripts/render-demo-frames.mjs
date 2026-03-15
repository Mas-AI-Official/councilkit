#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(path.join(__dirname, ".."));
const outDir = path.join(root, "docs", "demo", "storyboard");

function frameTemplate({
  title,
  subtitle,
  step,
  blockA,
  blockB,
  blockC
}) {
  return `<svg width="1366" height="768" viewBox="0 0 1366 768" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="titleGrad" x1="84" y1="62" x2="760" y2="150" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E2E8F0"/>
      <stop offset="0.5" stop-color="#93C5FD"/>
      <stop offset="1" stop-color="#A7F3D0"/>
    </linearGradient>
  </defs>
  <rect width="1366" height="768" fill="#0B1220"/>
  <rect x="40" y="36" width="1286" height="696" rx="22" fill="#111827" stroke="#334155" stroke-width="2"/>
  <text x="86" y="104" fill="url(#titleGrad)" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700">${title}</text>
  <text x="86" y="146" fill="#93C5FD" font-family="Segoe UI, Arial, sans-serif" font-size="25">${subtitle}</text>
  <text x="1100" y="104" fill="#34D399" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="700">Step ${step}/3</text>
  <rect x="86" y="186" width="1194" height="500" rx="18" fill="#0F172A" stroke="#1F2937"/>
  <rect x="124" y="228" width="350" height="400" rx="14" fill="#111827" stroke="#334155"/>
  <rect x="510" y="228" width="350" height="400" rx="14" fill="#111827" stroke="#334155"/>
  <rect x="896" y="228" width="350" height="400" rx="14" fill="#111827" stroke="#334155"/>
  <text x="152" y="286" fill="#E5E7EB" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">${blockA.title}</text>
  <text x="152" y="330" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockA.line1}</text>
  <text x="152" y="362" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockA.line2}</text>
  <text x="152" y="394" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockA.line3}</text>
  <text x="538" y="286" fill="#E5E7EB" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">${blockB.title}</text>
  <text x="538" y="330" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockB.line1}</text>
  <text x="538" y="362" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockB.line2}</text>
  <text x="538" y="394" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockB.line3}</text>
  <text x="924" y="286" fill="#E5E7EB" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700">${blockC.title}</text>
  <text x="924" y="330" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockC.line1}</text>
  <text x="924" y="362" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockC.line2}</text>
  <text x="924" y="394" fill="#CBD5E1" font-family="Consolas, Menlo, monospace" font-size="21">${blockC.line3}</text>
</svg>
`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const frames = [
    frameTemplate({
      title: "Codex Host Sends One Prompt",
      subtitle: "CouncilKit receives one task and prepares orchestration metadata.",
      step: 1,
      blockA: {
        title: "Host",
        line1: "Codex CLI host",
        line2: "task: review migration",
        line3: "mode: council"
      },
      blockB: {
        title: "CouncilKit Core",
        line1: "Discovery: worker metadata",
        line2: "Routing: select best workers",
        line3: "Synthesis plan prepared"
      },
      blockC: {
        title: "Request",
        line1: "workers: gemini, ollama",
        line2: "output_format: json",
        line3: "start parallel execution"
      }
    }),
    frameTemplate({
      title: "Workers Run In Parallel",
      subtitle: "Research and local reasoning are executed side-by-side.",
      step: 2,
      blockA: {
        title: "Research Worker",
        line1: "Gemini CLI",
        line2: "finds rollout risks",
        line3: "adds verification items"
      },
      blockB: {
        title: "Coding Worker",
        line1: "Codex host context",
        line2: "checks implementation",
        line3: "suggests test strategy"
      },
      blockC: {
        title: "Local Worker",
        line1: "Ollama",
        line2: "privacy-safe fallback",
        line3: "flags local constraints"
      }
    }),
    frameTemplate({
      title: "One Unified Answer Returns",
      subtitle: "CouncilKit merges outputs into one final response package.",
      step: 3,
      blockA: {
        title: "Synthesis",
        line1: "combined summary",
        line2: "high-confidence path",
        line3: "cross-worker rationale"
      },
      blockB: {
        title: "Disagreements",
        line1: "rollback threshold mismatch",
        line2: "canary pace differs",
        line3: "evidence to resolve"
      },
      blockC: {
        title: "Next Checks",
        line1: "run rollback drill",
        line2: "validate migration diff",
        line3: "re-run council"
      }
    })
  ];

  for (let index = 0; index < frames.length; index += 1) {
    const fileName = `frame-0${index + 1}.svg`;
    await fs.writeFile(path.join(outDir, fileName), frames[index], "utf8");
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CouncilKit Demo Storyboard</title>
    <style>
      body { margin: 0; background: #020617; color: #e2e8f0; font-family: Segoe UI, Arial, sans-serif; }
      main { max-width: 1366px; margin: 24px auto; padding: 0 16px 32px; }
      h1 { font-size: 30px; margin-bottom: 12px; }
      p { color: #93c5fd; margin-bottom: 20px; line-height: 1.5; }
      .player { border: 1px solid #334155; border-radius: 14px; overflow: hidden; margin-bottom: 22px; }
      .player img { width: 100%; display: block; }
      .frames img { width: 100%; border-radius: 12px; border: 1px solid #334155; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <main>
      <h1>CouncilKit Demo (5-10s storyboard)</h1>
      <p>Scenario: Codex host + Gemini research worker + Ollama local worker -> one unified answer.</p>
      <div class="player">
        <img id="hero-frame" src="./frame-01.svg" alt="CouncilKit demo frame" />
      </div>
      <div class="frames">
        <img src="./frame-01.svg" alt="Frame 1" />
        <img src="./frame-02.svg" alt="Frame 2" />
        <img src="./frame-03.svg" alt="Frame 3" />
      </div>
    </main>
    <script>
      const frames = ["frame-01.svg", "frame-02.svg", "frame-03.svg"];
      let idx = 0;
      const hero = document.getElementById("hero-frame");
      setInterval(() => {
        idx = (idx + 1) % frames.length;
        hero.src = frames[idx];
      }, 2200);
    </script>
  </body>
</html>
`;

  await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");
  process.stdout.write("Demo storyboard frames generated.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

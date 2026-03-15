import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";

import { CouncilOrchestrator } from "../core/orchestrator.js";
import { formatCouncilRunMarkdown } from "../core/synthesis.js";
import type { CouncilRunInput } from "../types/council.js";

function readArguments(request: CallToolRequest): CouncilRunInput {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  return {
    task: typeof args.task === "string" ? args.task : "",
    mode: args.mode === "single" ? "single" : "council",
    workers: Array.isArray(args.workers)
      ? args.workers.filter((value): value is string => typeof value === "string")
      : undefined,
    output_format: args.output_format === "markdown" ? "markdown" : "json"
  };
}

export async function startServer(): Promise<void> {
  const server = new Server(
    {
      name: "council-hub",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  const orchestrator = new CouncilOrchestrator();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "council_run",
        description:
          "Run one or more local model CLIs in single or council mode, capture outputs, identify disagreements, and return a synthesis-ready bundle.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["task", "mode"],
          properties: {
            task: {
              type: "string",
              description: "Task prompt to send to the selected workers."
            },
            mode: {
              type: "string",
              enum: ["single", "council"],
              description: "Use one worker or run the selected workers in parallel."
            },
            workers: {
              type: "array",
              items: {
                type: "string"
              },
              description:
                "Optional worker order. Built-ins include codex, gemini, local, ollama. You can also use discovered/manual workers from configuration."
            },
            output_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Controls the text rendering returned alongside structured output."
            }
          }
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "council_run") {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    try {
      const input = readArguments(request);
      const result = await orchestrator.run(input);
      const text =
        result.output_format === "markdown"
          ? formatCouncilRunMarkdown(result)
          : `${JSON.stringify(result, null, 2)}\n`;

      return {
        content: [
          {
            type: "text",
            text
          }
        ],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: message
          }
        ]
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

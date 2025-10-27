import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  screenshotToolName,
  screenshotToolDescription,
  ScreenshotToolSchema,
  runScreenshotTool,
} from "./tools/screenshot.js";

import {
  architectToolName,
  architectToolDescription,
  ArchitectToolSchema,
  runArchitectTool,
} from "./tools/architect.js";

import {
  codeReviewToolName,
  codeReviewToolDescription,
  CodeReviewToolSchema,
  runCodeReviewTool,
} from "./tools/codeReview.js";

import {
  codeAdviceToolName,
  codeAdviceToolDescription,
  CodeAdviceToolSchema,
  runCodeAdviceTool,
} from "./tools/codeadvice.js";

import {
  researcherToolName,
  researcherToolDescription,
  ResearcherToolSchema,
  runResearcherTool,
} from "./tools/researcher.js";

import {
  personaToolName,
  personaToolDescription,
  PersonaToolSchema,
  runPersonaTool,
} from "./tools/persona.js";

import {
  askToolName,
  askToolDescription,
  AskToolSchema,
  runAskTool,
} from "./tools/ask.js";

import {
  discoverToolName,
  discoverToolDescription,
  DiscoverToolSchema,
  runDiscoverTool,
} from "./tools/discover.js";

// Import personas to auto-register
import "./personas/charles/index.js";
import "./personas/ada/index.js";
import "./personas/xavier/index.js";
import "./personas/atlas/index.js";
import "./personas/hermes/index.js";
import "./personas/sentinel/index.js";
import "./personas/iris/index.js";

/**
 * MCP server providing Cursor Tools:
 *   1) Screenshot
 *   2) Architect
 *   3) CodeReview
 *   4) CodeAdvice
 *   5) Researcher
 *   6) Persona (Direct access)
 *   7) Ask (Smart routing)
 *   8) Discover (List personas)
 */

// 1. Create an MCP server instance
const server = new Server(
  {
    name: "cursor-tools",
    version: "2.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 2. Define the list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: screenshotToolName,
        description: screenshotToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "Full URL to screenshot",
            },
            relativePath: {
              type: "string",
              description: "Relative path appended to http://localhost:3000",
            },
            fullPathToScreenshot: {
              type: "string",
              description:
                "Path to where the screenshot file should be saved. This should be a cwd-style full path to the file (not relative to the current working directory) including the file name and extension.",
            },
          },
          required: [],
        },
      },
      {
        name: architectToolName,
        description: architectToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "Description of the task",
            },
            code: {
              type: "string",
              description: "Concatenated code from one or more files",
            },
            reasoning_effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "How hard the model should think (default: high)",
            },
            persona: {
              type: "string",
              description:
                "Persona to apply (e.g., 'charles' for British architect)",
            },
          },
          required: ["task", "code"],
        },
      },
      {
        name: codeReviewToolName,
        description: codeReviewToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            folderPath: {
              type: "string",
              description:
                "Path to the full root directory of the repository to diff against main",
            },
          },
          required: ["folderPath"],
        },
      },
      {
        name: codeAdviceToolName,
        description: codeAdviceToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "Description of the problem or advice needed",
            },
            code: {
              type: "string",
              description: "Relevant code snippet",
            },
            reasoning_effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "How hard the model should think (low/medium/high)",
            },
          },
          required: ["task", "code"],
        },
      },
      {
        name: researcherToolName,
        description: researcherToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Research query to investigate",
            },
            search_engines: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "google",
                  "xai",
                  "arxiv",
                  "wikipedia",
                  "github",
                  "stackexchange",
                  "pubmed",
                  "semantic_scholar",
                ],
              },
              description: "Search engines to use (default: google, xai)",
            },
            max_results_per_engine: {
              type: "number",
              description:
                "Maximum results per search engine (1-20, default: 5)",
            },
            deep_search: {
              type: "boolean",
              description: "Whether to perform deep search by following links",
            },
            include_academic: {
              type: "boolean",
              description: "Whether to prioritize academic sources",
            },
            citation_style: {
              type: "string",
              enum: ["apa", "mla", "chicago", "ieee", "inline"],
              description: "Citation style to use (default: inline)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: personaToolName,
        description: personaToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            persona_id: {
              type: "string",
              description: "ID of the persona (e.g., 'charles')",
            },
            query: {
              type: "string",
              description: "Question or request for the persona",
            },
            context: {
              type: "string",
              description: "Additional context or code to analyze",
            },
            analysis_type: {
              type: "string",
              enum: ["comprehensive", "advice", "research", "review"],
              description: "Type of analysis (default: advice)",
            },
            reasoning_effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Reasoning effort level",
            },
          },
          required: ["persona_id", "query"],
        },
      },
      {
        name: askToolName,
        description: askToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            persona_id: {
              type: "string",
              description:
                "Persona to use: 'auto' (default) routes to best expert, or a specific id like 'charles', 'ada', 'xavier'",
            },
            query: {
              type: "string",
              description: "Your question or request",
            },
            context: {
              type: "string",
              description: "Additional code or context for analysis",
            },
            hint: {
              type: "string",
              description:
                "Optional hint for routing (e.g., 'architecture', 'security')",
            },
            explain_routing: {
              type: "boolean",
              description: "Show which persona was selected and why",
            },
            reasoning_effort: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "How thoroughly to think about the answer",
            },
            provider: {
              type: "string",
              enum: ["xai", "openai"],
              description:
                "Optional provider override; defaults to persona preference or heuristic",
            },
          },
          required: ["query"],
        },
      },
      {
        name: discoverToolName,
        description: discoverToolDescription,
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [
                "architecture",
                "algorithms",
                "security",
                "frontend",
                "backend",
                "data",
                "all",
              ],
              description: "Filter personas by category",
            },
            verbose: {
              type: "boolean",
              description:
                "Show detailed information including example queries",
            },
          },
          required: [],
        },
      },
    ],
  };
});

// 3. Implement the tool call logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case screenshotToolName: {
      const validated = ScreenshotToolSchema.parse(args);
      return await runScreenshotTool(validated);
    }
    case architectToolName: {
      const validated = ArchitectToolSchema.parse(args);
      return await runArchitectTool(validated);
    }
    case codeReviewToolName: {
      const validated = CodeReviewToolSchema.parse(args);
      return await runCodeReviewTool(validated);
    }
    case codeAdviceToolName: {
      const validated = CodeAdviceToolSchema.parse(args);
      return await runCodeAdviceTool(validated);
    }
    case researcherToolName: {
      const validated = ResearcherToolSchema.parse(args);
      return await runResearcherTool(validated);
    }
    case personaToolName: {
      const validated = PersonaToolSchema.parse(args);
      return await runPersonaTool(validated);
    }
    case askToolName: {
      const validated = AskToolSchema.parse(args);
      return await runAskTool(validated);
    }
    case discoverToolName: {
      const validated = DiscoverToolSchema.parse(args);
      return await runDiscoverTool(validated);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// 4. Start the MCP server with a stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cursor Tools MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

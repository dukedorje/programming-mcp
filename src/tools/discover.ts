import { z } from "zod";
import { PersonaRegistry } from "../personas/types.js";

/**
 * Discover tool - List and explore available personas
 * Helps users understand what personas are available and their specialties
 */

export const discoverToolName = "discover";
export const discoverToolDescription =
  "Discover available expert personas and their specialties";

export const DiscoverToolSchema = z.object({
  category: z
    .enum([
      "architecture",
      "enterprise",
      "algorithms",
      "security",
      "frontend",
      "backend",
      "data",
      "all",
    ])
    .optional()
    .default("all")
    .describe("Filter personas by category"),

  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe("Show detailed information including example queries"),
});

interface PersonaInfo {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  exampleQueries?: string[];
  personality?: string;
}

/**
 * Get example queries for each persona
 */
function getExampleQueries(personaId: string): string[] {
  const examples: Record<string, string[]> = {
    charles: [
      "How should I structure this for a startup moving fast?",
      "What's the simplest pattern that works here?",
      "Review my design - what's overkill vs what actually matters?",
      "How do I reduce coupling without over-engineering?",
      "Is this tech debt worth paying down now?",
    ],
    sterling: [
      "Plan a zero-downtime migration for this legacy system",
      "Design a phased rollout with rollback plan for this change",
      "How do I ensure SOC2/HIPAA compliance for this feature?",
      "Architecture for multi-team coordination with 50+ engineers",
      "Backward compatibility strategy for this breaking change",
    ],
    ada: [
      "How can I optimize this algorithm?",
      "What's the time complexity of this function?",
      "Which data structure should I use here?",
      "How do I implement dynamic programming for this?",
      "Profile this code for performance bottlenecks",
    ],
    atlas: [
      "Sketch an OpenAPI for this service and a zero-downtime migration plan",
      "Design pagination and idempotency for this endpoint",
      "Model these entities and relationships for scalability",
      "Propose a contract test suite for backward compatibility",
      "Eliminate N+1 and add caching without breaking consistency",
    ],
    hermes: [
      "Draft a GitHub Actions pipeline with build/test/deploy and canary",
      "Add OpenTelemetry and SLOs for this service",
      "Create Terraform for a minimal prod-ready stack",
      "Propose a rollback plan and health gates for deploys",
      "Harden the supply chain with SBOM and signing",
    ],
    sentinel: [
      "Threat model this API and propose cheapest effective controls",
      "Design OAuth/OIDC login with short-lived tokens and rotation",
      "Lock down secrets and encrypt data at rest and in transit",
      "Add rate limits and CSP to prevent abuse",
      "Write policy-as-code tests for authZ rules",
    ],
    iris: [
      "Design a minimal component API for this flow using a design system",
      "Make this page meet WCAG 2.2 AA; list fixes",
      "Improve Core Web Vitals with code-splitting and image optimization",
      "Add Playwright and axe checks for this form",
      "Propose DS tokens and a Storybook for reuse",
    ],
    "security-expert": [
      "Is this authentication flow secure?",
      "How do I prevent SQL injection here?",
      "Review this code for OWASP vulnerabilities",
      "What's the best way to store sensitive data?",
      "How should I implement rate limiting?",
    ],
    "frontend-expert": [
      "How do I structure this React component?",
      "What's the best state management approach?",
      "How do I make this UI more accessible?",
      "Optimize this for mobile performance",
      "Should I use CSS modules or styled-components?",
    ],
    "backend-expert": [
      "How should I design this REST API?",
      "What's the best database schema for this?",
      "How do I handle this at scale?",
      "Should I use a message queue here?",
      "How do I implement caching effectively?",
    ],
  };

  return (
    examples[personaId] || [
      "Help me understand this code",
      "What's the best approach for this problem?",
      "Review this implementation",
    ]
  );
}

/**
 * Get category for a persona based on their expertise
 */
function getPersonaCategory(persona: any): string {
  const expertiseStr = persona.traits?.expertise?.join(" ").toLowerCase() || "";

  // Check for enterprise first (more specific)
  if (
    expertiseStr.includes("enterprise") ||
    expertiseStr.includes("legacy") ||
    expertiseStr.includes("zero-downtime") ||
    expertiseStr.includes("compliance")
  ) {
    return "enterprise";
  }
  if (
    expertiseStr.includes("architecture") ||
    expertiseStr.includes("system design")
  ) {
    return "architecture";
  }
  if (
    expertiseStr.includes("algorithm") ||
    expertiseStr.includes("optimization")
  ) {
    return "algorithms";
  }
  if (
    expertiseStr.includes("security") ||
    expertiseStr.includes("authentication")
  ) {
    return "security";
  }
  if (
    expertiseStr.includes("frontend") ||
    expertiseStr.includes("react") ||
    expertiseStr.includes("ui")
  ) {
    return "frontend";
  }
  if (
    expertiseStr.includes("backend") ||
    expertiseStr.includes("api") ||
    expertiseStr.includes("database")
  ) {
    return "backend";
  }
  if (expertiseStr.includes("data") || expertiseStr.includes("analytics")) {
    return "data";
  }

  return "general";
}

export async function runDiscoverTool(
  args: z.infer<typeof DiscoverToolSchema>
) {
  const { category, verbose } = args;

  // Get all registered personas
  const allPersonas = PersonaRegistry.list();

  // Filter by category if specified
  const personas =
    category === "all"
      ? allPersonas
      : allPersonas.filter((p) => getPersonaCategory(p) === category);

  if (personas.length === 0) {
    return {
      content: [
        {
          type: "text",
          text:
            category === "all"
              ? "No personas are currently registered. Please check your configuration."
              : `No personas found in category: ${category}`,
        },
      ],
    };
  }

  // Build the response
  let response = `# Available Expert Personas\n\n`;

  if (category !== "all") {
    response += `*Filtered by category: ${category}*\n\n`;
  }

  for (const persona of personas) {
    const info: PersonaInfo = {
      id: persona.id,
      name: persona.name,
      description: persona.description,
      expertise: persona.traits.expertise || [],
    };

    response += `## ${info.name} (\`${info.id}\`)\n`;
    response += `${info.description}\n\n`;

    if (info.expertise.length > 0) {
      response += `**Expertise:**\n`;
      info.expertise.forEach((skill) => {
        response += `- ${skill}\n`;
      });
      response += `\n`;
    }

    if (verbose) {
      // Add personality info
      if (persona.traits.personality) {
        response += `**Personality:** ${persona.traits.personality}\n\n`;
      }

      // Add example queries
      const examples = getExampleQueries(persona.id);
      response += `**Example Queries:**\n`;
      examples.forEach((example) => {
        response += `- "${example}"\n`;
      });
      response += `\n`;

      // Add communication style
      const style = persona.traits.communicationStyle;
      if (style) {
        response += `**Communication Style:**\n`;
        response += `- Formality: ${style.formality}\n`;
        response += `- Humor: ${style.humor}\n`;
        response += `- Tone: ${style.tone?.join(", ") || "balanced"}\n`;
        response += `\n`;
      }
    }

    response += `---\n\n`;
  }

  // Add usage instructions
  response += `## How to Use\n\n`;
  response += `1. **Natural Language** (Recommended):\n`;
  response += `   Use the \`ask\` tool and your question will be automatically routed to the best expert.\n`;
  response += `   Example: \`ask "How should I structure my React app?"\`\n\n`;
  response += `2. **Direct Access**:\n`;
  response += `   Use the \`persona\` tool with a specific persona ID for precise control.\n`;
  response += `   Example: \`persona "charles" "Review this architecture"\`\n\n`;

  if (!verbose) {
    response += `*Tip: Use \`verbose: true\` to see example queries and detailed persona information.*\n`;
  }

  return {
    content: [
      {
        type: "text",
        text: response,
      },
    ],
  };
}

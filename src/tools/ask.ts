import { z } from "zod";
import { classifyQuery, explainRouting } from "../personas/router.js";
import { PersonaRegistry } from "../personas/types.js";
import { callAIWithPersona } from "../common/personaClient.js";
import { type ReasoningEffort } from "../common/providerConfig.js";

/**
 * Ask tool - Smart routing to the best persona based on query analysis
 * Primary UX for natural language interaction with personas
 */

export const askToolName = "ask";
export const askToolDescription =
  "Ask a question naturally and get routed to the best expert persona automatically. You can also address a persona directly, e.g., 'ask xavier: <your question>' or 'charles: <your question>' to force that persona.";

export const AskToolSchema = z.object({
  persona_id: z
    .union([z.literal("auto"), z.string()])
    .optional()
    .default("auto")
    .describe(
      "Persona to use: 'auto' (default) routes to best expert, or a specific id like 'charles', 'ada', 'xavier'"
    ),
  query: z
    .string()
    .min(1, "Query is required")
    .describe("Your question or request"),

  context: z
    .string()
    .optional()
    .describe("Additional code or context for analysis"),

  hint: z
    .string()
    .optional()
    .describe("Optional hint for routing (e.g., 'architecture', 'security')"),

  explain_routing: z
    .boolean()
    .optional()
    .default(false)
    .describe("Show which persona was selected and why"),
  reasoning_effort: z
    .union([z.literal("low"), z.literal("medium"), z.literal("high")])
    .optional()
    .describe("How thoroughly to think about the answer"),
  provider: z
    .union([z.literal("xai"), z.literal("openai")])
    .optional()
    .describe(
      "Optional provider override; defaults to persona preference or heuristic"
    ),
});

export async function runAskTool(args: z.infer<typeof AskToolSchema>) {
  const {
    persona_id = "auto",
    query,
    context = "",
    hint,
    explain_routing,
    reasoning_effort,
    provider,
  } = args;

  // Natural-language persona addressing (e.g., "ask xavier:", "xavier:")
  let cleanedQuery = query;
  let nlPersonaId: string | undefined;
  const aliases: Record<string, string[]> = {
    charles: ["charles", "charlie"],
    ada: ["ada"],
    xavier: ["xavier", "x"],
  };
  const lowered = query.trim().toLowerCase();
  for (const [pid, names] of Object.entries(aliases)) {
    for (const name of names) {
      const patterns = [
        new RegExp(`^ask\\s+${name}[:,-]\\s*`, "i"),
        new RegExp(`^ask\\s+${name}\\s+for\\s+`, "i"),
        new RegExp(`^${name}[:,-]\\s*`, "i"),
        new RegExp(`^${name}\\s+for\\s+`, "i"),
      ];
      if (patterns.some((p) => p.test(lowered))) {
        nlPersonaId = pid;
        cleanedQuery = query
          .replace(patterns[0], "")
          .replace(patterns[1], "")
          .replace(patterns[2], "")
          .replace(patterns[3], "")
          .trim();
        break;
      }
    }
    if (nlPersonaId) break;
  }

  // Determine persona: explicit override or classification
  let selectedPersonaId: string | undefined =
    nlPersonaId || (persona_id === "auto" ? undefined : persona_id);
  let classification: ReturnType<typeof classifyQuery> | undefined;
  if (!selectedPersonaId) {
    classification = classifyQuery(cleanedQuery, hint);
    selectedPersonaId = classification.primaryPersona;
  }

  // Get the selected persona
  const persona = PersonaRegistry.get(selectedPersonaId);

  if (!persona) {
    // Shouldn't happen but handle gracefully
    return {
      content: [
        {
          type: "text",
          text: "No suitable expert found. Please use the 'discover' tool to see available personas.",
        },
      ],
    };
  }

  try {
    // Build response with optional routing explanation
    let response = "";

    if (explain_routing) {
      const explanation = classification
        ? explainRouting(classification)
        : `Using your selected expert: ${persona.name}.`;
      response += `*${explanation}*\n\n---\n\n`;
    }

    // Simple system prompt for natural conversation
    const systemPrompt = `You are having a natural conversation with the user, providing expert guidance based on your knowledge and experience.
    
Answer their question directly and helpfully while maintaining your personality.`;

    // Call the persona
    const personaResponse = await callAIWithPersona({
      systemPrompt,
      task: cleanedQuery,
      code: context,
      analysisType: "advice", // Default to advice for ask tool
      reasoningEffort: (reasoning_effort || "medium") as ReasoningEffort,
      personaId: persona.id,
      providerOverride: provider,
    });

    response += personaResponse;

    return {
      content: [
        {
          type: "text",
          text: response,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error consulting ${persona.name}: ${error.message || error}`,
        },
      ],
    };
  }
}

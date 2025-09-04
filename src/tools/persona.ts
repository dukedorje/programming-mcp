import { z } from "zod";
import { callAIWithPersona } from "../common/personaClient.js";
import { getDefaultProvider, type AIProvider, type ReasoningEffort } from "../common/providerConfig.js";
import { PersonaRegistry } from "../personas/types.js";

/**
 * Persona tool - Direct interaction with registered personas
 * Allows calling any registered persona for advice, analysis, or conversation
 */

export const personaToolName = "persona";
export const personaToolDescription =
  "Chat with a specific persona for specialized advice and analysis with personality";

export const PersonaToolSchema = z.object({
  persona_id: z
    .string()
    .describe("ID of the persona to interact with (e.g., 'charles')"),
  
  query: z
    .string()
    .min(1, "Query is required")
    .describe("Question or request for the persona"),
  
  context: z
    .string()
    .optional()
    .describe("Additional context or code for the persona to analyze"),
  
  analysis_type: z
    .enum(["comprehensive", "advice", "research", "review"])
    .optional()
    .default("advice")
    .describe("Type of analysis needed"),
  
  reasoning_effort: z
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium")
    .describe("Reasoning effort level"),
  
  provider: z
    .enum(["xai", "openai"])
    .optional()
    .describe("AI provider to use"),
  
  tone_style: z
    .enum(["concise", "detailed", "humorous", "straight"])
    .optional()
    .describe("Response tone (concise=direct, detailed=balanced, humorous=witty, straight=professional)"),
  
  output_format: z
    .enum(["tldr", "detailed", "dual"])
    .optional()
    .describe("Output format (tldr=brief summary, detailed=full analysis, dual=both)"),
  
  audience_level: z
    .enum(["beginner", "intermediate", "expert", "auto"])
    .optional()
    .describe("Target audience expertise level"),
  
  include_diagrams: z
    .boolean()
    .optional()
    .describe("Include visual diagrams where applicable"),
  
  user_constraints: z
    .string()
    .optional()
    .describe("User's constraints or context (e.g., 'tight deadline', 'legacy codebase')"),
});

export async function runPersonaTool(
  args: z.infer<typeof PersonaToolSchema>
) {
  const {
    persona_id,
    query,
    context = "",
    analysis_type,
    reasoning_effort,
    provider = getDefaultProvider(),
    tone_style,
    output_format,
    audience_level,
    include_diagrams,
    user_constraints,
  } = args;

  // Verify persona exists
  const persona = PersonaRegistry.get(persona_id);
  if (!persona) {
    const available = PersonaRegistry.list().map(p => p.id).join(", ");
    return {
      content: [{
        type: "text",
        text: `Persona '${persona_id}' not found. Available personas: ${available || "none registered"}`,
      }],
    };
  }

  try {
    // Build a simple system prompt for persona interaction
    const systemPrompt = `You are having a conversation with the user, providing your expertise and guidance.
    
Your role is to be helpful while maintaining your distinct personality and expertise.
Respond naturally and directly to their query.`;

    const result = await callAIWithPersona({
      systemPrompt,
      task: query,
      code: context,
      analysisType: analysis_type,
      reasoningEffort: reasoning_effort as ReasoningEffort,
      provider: provider as AIProvider,
      personaId: persona_id,
      toneStyle: tone_style,
      outputFormat: output_format,
      audienceLevel: audience_level,
      includeDiagrams: include_diagrams,
      userConstraints: user_constraints,
    });

    return {
      content: [{
        type: "text",
        text: result,
      }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error calling ${persona.name}: ${error.message || error}`,
      }],
    };
  }
}

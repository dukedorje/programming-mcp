import { z } from "zod";
import { classifyQuery, explainRouting } from "../personas/router.js";
import { PersonaRegistry } from "../personas/types.js";
import { callAIWithPersona } from "../common/personaClient.js";
import { getDefaultProvider, type AIProvider, type ReasoningEffort } from "../common/providerConfig.js";

/**
 * Ask tool - Smart routing to the best persona based on query analysis
 * Primary UX for natural language interaction with personas
 */

export const askToolName = "ask";
export const askToolDescription = 
  "Ask a question naturally and get routed to the best expert persona automatically";

export const AskToolSchema = z.object({
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
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium")
    .describe("How thoroughly to think about the answer"),
  
  provider: z
    .enum(["xai", "openai"])
    .optional()
    .describe("AI provider to use"),
});

export async function runAskTool(
  args: z.infer<typeof AskToolSchema>
) {
  const {
    query,
    context = "",
    hint,
    explain_routing,
    reasoning_effort,
    provider = getDefaultProvider(),
  } = args;

  // Classify the query to find the best persona
  const classification = classifyQuery(query, hint);
  
  // Get the selected persona
  const persona = PersonaRegistry.get(classification.primaryPersona);
  
  if (!persona) {
    // Shouldn't happen but handle gracefully
    return {
      content: [{
        type: "text",
        text: "No suitable expert found. Please use the 'discover' tool to see available personas.",
      }],
    };
  }
  
  try {
    // Build response with optional routing explanation
    let response = "";
    
    if (explain_routing) {
      const explanation = explainRouting(classification);
      response += `*${explanation}*\n\n---\n\n`;
    }
    
    // Simple system prompt for natural conversation
    const systemPrompt = `You are having a natural conversation with the user, providing expert guidance based on your knowledge and experience.
    
Answer their question directly and helpfully while maintaining your personality.`;
    
    // Call the persona
    const personaResponse = await callAIWithPersona({
      systemPrompt,
      task: query,
      code: context,
      analysisType: "advice", // Default to advice for ask tool
      reasoningEffort: reasoning_effort as ReasoningEffort,
      provider: provider as AIProvider,
      personaId: persona.id,
    });
    
    response += personaResponse;
    
    return {
      content: [{
        type: "text",
        text: response,
      }],
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Error consulting ${persona.name}: ${error.message || error}`,
      }],
    };
  }
}

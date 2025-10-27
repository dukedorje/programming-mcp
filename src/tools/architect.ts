import { z } from "zod";
import { callAIProvider } from "../common/apiClient.js";
import { callAIWithPersona } from "../common/personaClient.js";
import {
  chooseProvider,
  type ReasoningEffort,
} from "../common/providerConfig.js";
import { ARCHITECT_SYSTEM_PROMPT } from "../prompts/architectPrompts.js";

/**
 * Architect tool
 *   - Calls an AI model (xAI Grok or OpenAI GPT-5) to generate comprehensive architectural reviews
 *   - Input: 'task' (description of the task), 'code' (one or more code files concatenated)
 *   - Provides detailed analysis with executive summary, architectural overview, and prioritized action plans
 */

export const architectToolName = "architect";
export const architectToolDescription =
  "Conducts comprehensive architectural reviews and generates detailed improvement plans for codebases.";

export const ArchitectToolSchema = z.object({
  task: z.string().min(1, "Task description is required."),
  code: z
    .string()
    .min(1, "Code string is required (one or more files concatenated)."),
  reasoning_effort: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe(
      "How hard the model should think (low/medium/high). High uses more reasoning tokens but provides better analysis."
    ),
  persona: z
    .string()
    .optional()
    .describe(
      "Persona to apply (e.g., 'charles' for British architect). Leave empty for standard analysis."
    ),
});

export async function runArchitectTool(
  args: z.infer<typeof ArchitectToolSchema>
) {
  const { task, code, reasoning_effort = "high", persona } = args;

  try {
    // Use persona-aware client if persona is specified
    const result = persona
      ? await callAIWithPersona({
          systemPrompt: ARCHITECT_SYSTEM_PROMPT,
          task,
          code,
          analysisType: "comprehensive",
          reasoningEffort: reasoning_effort as ReasoningEffort,
          personaId: persona,
        })
      : await (async () => {
          const selectedProvider = chooseProvider({
            analysisType: "comprehensive",
            reasoningEffort: reasoning_effort as ReasoningEffort,
            textHint: task,
          });
          return callAIProvider({
            systemPrompt: ARCHITECT_SYSTEM_PROMPT,
            task,
            code,
            analysisType: "comprehensive",
            reasoningEffort: reasoning_effort as ReasoningEffort,
            provider: selectedProvider,
          });
        })();

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Architect Error: ${error.message || error}`,
        },
      ],
    };
  }
}

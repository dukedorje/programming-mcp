import { z } from "zod";
import { callAIProvider } from "../common/apiClient.js";
import {
  chooseProvider,
  type ReasoningEffort,
} from "../common/providerConfig.js";
import { CODEADVICE_SYSTEM_PROMPT } from "../prompts/codeadvicePrompts.js";

/**
 * CodeAdvice tool
 *   - Calls an AI model (xAI Grok or OpenAI GPT-5) to provide quick, focused coding guidance
 *   - Input: 'task' (description of the problem), 'code' (relevant code snippet)
 *   - Provides immediate, actionable advice for specific coding problems
 */

export const codeAdviceToolName = "code-advice";
export const codeAdviceToolDescription =
  "Provides quick, focused coding guidance and immediate solutions for specific problems.";

export const CodeAdviceToolSchema = z.object({
  task: z.string().min(1, "Task description is required."),
  code: z.string().min(1, "Code string is required."),
  reasoning_effort: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe(
      "How hard the model should think (low/medium/high). Defaults to medium for quick advice."
    ),
});

export async function runCodeAdviceTool(
  args: z.infer<typeof CodeAdviceToolSchema>
) {
  const { task, code, reasoning_effort = "medium" } = args;

  try {
    const selectedProvider = chooseProvider({
      analysisType: "advice",
      reasoningEffort: reasoning_effort as ReasoningEffort,
      textHint: task,
    });

    const result = await callAIProvider({
      systemPrompt: CODEADVICE_SYSTEM_PROMPT,
      task,
      code,
      analysisType: "advice",
      reasoningEffort: reasoning_effort as ReasoningEffort,
      provider: selectedProvider,
    });

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
          text: `CodeAdvice Error: ${error.message || error}`,
        },
      ],
    };
  }
}

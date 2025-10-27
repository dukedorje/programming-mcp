/**
 * Provider configuration and validation utilities
 */

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const XAI_API_KEY = process.env.XAI_API_KEY;
export const AI_PROVIDER = process.env.AI_PROVIDER || "xai";

export type AIProvider = "xai" | "openai";
export type ReasoningEffort = "low" | "medium" | "high";

export function validateProvider(provider: AIProvider): void {
  if (provider === "xai" && !XAI_API_KEY) {
    throw new Error(
      "XAI_API_KEY environment variable is required for xAI provider"
    );
  }
  if (provider === "openai" && !OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required for OpenAI provider"
    );
  }
}

export function getDefaultProvider(): AIProvider {
  return AI_PROVIDER as AIProvider;
}

/**
 * Heuristic provider selector. Prefers persona's choice; otherwise:
 * - "openai" for comprehensive or high-effort reasoning tasks
 * - "xai" for quick/advice-style prompts
 * - falls back to env default
 */
export function chooseProvider(params: {
  analysisType: "comprehensive" | "advice" | "research" | "review";
  reasoningEffort?: ReasoningEffort;
  personaPreferredProvider?: AIProvider;
  textHint?: string;
}): AIProvider {
  const { analysisType, reasoningEffort, personaPreferredProvider, textHint } =
    params;

  if (personaPreferredProvider) return personaPreferredProvider;

  const hint = (textHint || "").toLowerCase();

  const strongReasoning =
    analysisType === "comprehensive" ||
    analysisType === "review" ||
    analysisType === "research" ||
    reasoningEffort === "high" ||
    /(architecture|design|spec|deep|rigor|formal)/.test(hint);

  if (strongReasoning) return "openai";

  const quick =
    /(quick|concise|tl;dr|fast|simple|bug|fix|snippet)/.test(hint) ||
    analysisType === "advice" ||
    reasoningEffort === "low" ||
    reasoningEffort === "medium";

  if (quick) return "xai";

  return getDefaultProvider();
}

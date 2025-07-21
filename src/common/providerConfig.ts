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
    throw new Error("XAI_API_KEY environment variable is required for xAI provider");
  }
  if (provider === "openai" && !OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required for OpenAI provider");
  }
}

export function getDefaultProvider(): AIProvider {
  return AI_PROVIDER as AIProvider;
}

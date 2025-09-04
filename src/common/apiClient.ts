/**
 * Generic AI provider API client utilities
 */

import OpenAI from "openai";
import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";

import { 
  OPENAI_API_KEY, 
  validateProvider, 
  getDefaultProvider,
  type AIProvider, 
  type ReasoningEffort 
} from "./providerConfig.js";
import { formatTokenInfo, type TokenUsage } from "./tokenFormatter.js";
import { buildUserPrompt, type PromptConfig } from "./promptBuilder.js";

export interface AICallConfig {
  systemPrompt: string;
  task: string;
  code: string;
  analysisType: "comprehensive" | "advice" | "research" | "review";
  reasoningEffort: ReasoningEffort;
  provider: AIProvider;
}

async function callXaiProvider(config: AICallConfig): Promise<string> {
  const userPrompt = buildUserPrompt({
    task: config.task,
    code: config.code,
    analysisType: config.analysisType,
  });

  const result = await generateText({
    model: xai("grok-4"),
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // Note: xAI doesn't support reasoningEffort parameter
  });

  const tokenInfo = formatTokenInfo("xai", result.usage, config.reasoningEffort);
  return result.text + tokenInfo;
}

async function callOpenAIProvider(config: AICallConfig): Promise<string> {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const userPrompt = buildUserPrompt({
    task: config.task,
    code: config.code,
    analysisType: config.analysisType,
  });

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    reasoning_effort: config.reasoningEffort as any, // GPT-5 supports this
  });

  const assistantMessage = response.choices?.[0]?.message?.content ?? "No response from model.";
  const usage: TokenUsage = {
    totalTokens: (response.usage as any)?.total_tokens,
    reasoning_tokens: (response.usage as any)?.reasoning_tokens,
  };

  const tokenInfo = formatTokenInfo("openai", usage, config.reasoningEffort);
  return assistantMessage + tokenInfo;
}

export async function callAIProvider(config: AICallConfig): Promise<string> {
  validateProvider(config.provider);

  if (config.provider === "xai") {
    // xAI doesn't support reasoning_effort, so create config without it
    const xaiConfig = {
      ...config,
      reasoningEffort: undefined as any // Remove for xAI
    };
    return callXaiProvider(xaiConfig);
  } else if (config.provider === "openai") {
    return callOpenAIProvider(config);
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

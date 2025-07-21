/**
 * Token usage formatting utilities
 */

import type { AIProvider, ReasoningEffort } from "./providerConfig.js";

export interface TokenUsage {
  totalTokens?: number;
  reasoning_tokens?: number;
}

export function formatXaiTokenInfo(
  usage: TokenUsage | undefined,
  reasoningEffort: ReasoningEffort
): string {
  const baseInfo = `Provider: xAI Grok-4 | Reasoning effort: ${reasoningEffort}`;
  
  if (usage?.totalTokens) {
    return `\n\n---\n*Tokens used: ${usage.totalTokens} | ${baseInfo}*`;
  }
  
  return `\n\n---\n*${baseInfo}*`;
}

export function formatOpenAITokenInfo(
  usage: TokenUsage | undefined,
  reasoningEffort: ReasoningEffort
): string {
  const baseInfo = `Provider: OpenAI o3 | Reasoning effort: ${reasoningEffort}`;
  const reasoningTokens = usage?.reasoning_tokens ?? 0;
  const totalTokens = usage?.totalTokens ?? 0;
  
  if (reasoningTokens > 0) {
    return `\n\n---\n*Reasoning tokens used: ${reasoningTokens} | Total tokens: ${totalTokens} | ${baseInfo}*`;
  }
  
  return `\n\n---\n*${baseInfo}*`;
}

export function formatTokenInfo(
  provider: AIProvider,
  usage: TokenUsage | undefined,
  reasoningEffort: ReasoningEffort
): string {
  return provider === "xai" 
    ? formatXaiTokenInfo(usage, reasoningEffort)
    : formatOpenAITokenInfo(usage, reasoningEffort);
}

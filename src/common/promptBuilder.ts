/**
 * Prompt construction utilities
 */

export interface PromptConfig {
  task: string;
  code: string;
  analysisType: "comprehensive" | "advice" | "research" | "review";
}

export function buildUserPrompt(config: PromptConfig): string {
  const { task, code, analysisType } = config;
  
  const analysisRequest = analysisType === "comprehensive" 
    ? "Please provide a comprehensive architectural analysis."
    : analysisType === "research"
    ? "Please synthesize the research findings with proper source attribution."
    : analysisType === "review"
    ? "Please provide a thorough code review with constructive feedback."
    : "Please provide quick, actionable advice.";
    
  return `Task: ${task}\n\nCode:\n${code}\n\n${analysisRequest}`;
}
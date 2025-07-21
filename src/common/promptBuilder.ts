/**
 * Prompt construction utilities
 */

export interface PromptConfig {
  task: string;
  code: string;
  analysisType: "comprehensive" | "advice";
}

export function buildUserPrompt(config: PromptConfig): string {
  const { task, code, analysisType } = config;
  
  const analysisRequest = analysisType === "comprehensive" 
    ? "Please provide a comprehensive architectural analysis."
    : "Please provide quick, actionable advice.";
    
  return `Task: ${task}\n\nCode:\n${code}\n\n${analysisRequest}`;
}

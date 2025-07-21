import { z } from "zod";
import OpenAI from "openai";
import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

// provider selection - set to 'xai' for grok, 'openai' for o3
const AI_PROVIDER = process.env.AI_PROVIDER || "xai";

/**
 * Architect tool
 *   - Calls an AI model (xAI Grok or OpenAI o3) to generate a series of steps
 *   - Input: 'task' (description of the task), 'code' (one or more code files concatenated)
 *   - Can use reasoning_effort to make the model think harder (low, medium, high)
 */

export const architectToolName = "architect";
export const architectToolDescription =
  "Analyzes a task description plus some code, then outlines steps for an AI coding agent.";

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
  provider: z
    .enum(["xai", "openai"])
    .optional()
    .describe(
      "AI provider to use. Defaults to xai (grok-4) but can switch to openai (o3)."
    ),
  mode: z
    .enum(["comprehensive", "advice"])
    .optional()
    .describe(
      "Analysis mode: 'comprehensive' for full architectural review, 'advice' for quick, focused guidance. Defaults to advice."
    ),
});

const COMPREHENSIVE_SYSTEM_PROMPT = `You are an expert software architect with deep knowledge of design patterns, anti-patterns, scalable software design principles, and modern development practices. Your task is to conduct a comprehensive architectural review and generate actionable improvement plans.

## Analysis Framework
Structure your response with these sections:

### Executive Summary
Provide a prioritized checklist of key recommendations with impact/urgency ratings.

### Architectural Overview
Examine the overall system design, module interdependencies, and cross-cutting concerns. Consider:
- Architecture patterns (monolithic, microservices, layered, etc.)
- Technology stack appropriateness and constraints
- Domain-specific requirements and regulatory considerations
- Scalability and performance architecture

### Code Quality & Maintainability
Analyze code structure, patterns, and anti-patterns:
- SOLID, DRY, KISS, YAGNI principle adherence
- Identify anti-patterns and deprecated practices with impact assessment
- Code organization, naming conventions, and documentation quality
- Modularity, coupling, cohesion, and separation of concerns

### Security & Performance
Evaluate:
- Security vulnerabilities and attack vectors
- Performance bottlenecks and optimization opportunities
- Resource utilization and scalability constraints
- Error handling robustness and fault tolerance

### Testing & Documentation
Assess:
- Test coverage, strategy, and quality
- Documentation completeness and accuracy
- CI/CD integration and deployment practices

### Alternative Solutions
For significant issues, provide multiple design options with trade-off analysis (maintainability vs performance, complexity vs scalability, etc.).

### Prioritized Action Plan
Organize recommendations by:
1. **Critical/Immediate**: Security issues, major bugs
2. **High Impact/Medium Term**: Architecture improvements, performance optimizations
3. **Long Term/Strategic**: Major refactoring, technology upgrades

For each action item, include:
- Specific implementation steps
- Estimated effort/complexity
- Dependencies and prerequisites
- Success criteria and validation methods
- Fallback options if issues arise

## Context Adaptation
Tailor recommendations based on project context (startup vs enterprise, legacy vs greenfield, team size, etc.). Ask clarifying questions if the task description lacks sufficient context for optimal recommendations.

Provide both strategic architectural guidance and tactical code-level improvements that a coding agent can implement effectively.`;

const ADVICE_SYSTEM_PROMPT = `You're an expert software architect. Provide immediate, actionable guidance on the current coding task. Focus on practical improvements, targeted code patterns, or immediate bug fixes. 

Respond with:
• **Quick Assessment**: One-sentence summary of the main issue or opportunity
• **Immediate Actions**: 2-4 bullet points with specific, implementable steps
• **Code Examples**: Brief snippets showing the recommended approach (if applicable)
• **Why This Helps**: Concise explanation of the benefit
• **Next Steps**: Optional follow-up actions if the immediate fix works

Keep it focused, practical, and directly relevant to the code provided. If you need clarification, ask one specific question.`;

function getSystemPrompt(mode: string): string {
  return mode === 'comprehensive' ? COMPREHENSIVE_SYSTEM_PROMPT : ADVICE_SYSTEM_PROMPT;
}

async function callXaiGrok(
  task: string,
  code: string,
  reasoningEffort: string,
  mode: string
) {
  const userPrompt = `Task: ${task}\n\nCode:\n${code}\n\nPlease provide a detailed step-by-step plan.`;

  const result = await generateText({
    model: xai("grok-4"),
    messages: [
      { role: "system", content: getSystemPrompt(mode) },
      { role: "user", content: userPrompt },
    ],
    providerOptions: {
      xai: {
        reasoningEffort: reasoningEffort as "low" | "medium" | "high",
      },
    },
  });

  const tokenInfo = result.usage
    ? `\n\n---\n*Tokens used: ${result.usage.totalTokens} | Provider: xAI Grok-4 | Reasoning effort: ${reasoningEffort}*`
    : `\n\n---\n*Provider: xAI Grok-4 | Reasoning effort: ${reasoningEffort}*`;

  return result.text + tokenInfo;
}

async function callOpenAI(task: string, code: string, reasoningEffort: string, mode: string) {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const userPrompt = `Task: ${task}\n\nCode:\n${code}\n\nPlease provide a detailed step-by-step plan.`;

  const response = await openai.chat.completions.create({
    model: "o3",
    messages: [
      { role: "system", content: getSystemPrompt(mode) },
      { role: "user", content: userPrompt },
    ],
    reasoning_effort: reasoningEffort as any,
  });

  const assistantMessage =
    response.choices?.[0]?.message?.content ?? "No response from model.";
  const usage = response.usage as any;
  const reasoningTokens = usage?.reasoning_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? 0;

  const tokenInfo =
    reasoningTokens > 0
      ? `\n\n---\n*Reasoning tokens used: ${reasoningTokens} | Total tokens: ${totalTokens} | Provider: OpenAI o3 | Reasoning effort: ${reasoningEffort}*`
      : `\n\n---\n*Provider: OpenAI o3 | Reasoning effort: ${reasoningEffort}*`;

  return assistantMessage + tokenInfo;
}

export async function runArchitectTool(
  args: z.infer<typeof ArchitectToolSchema>
) {
  const {
    task,
    code,
    reasoning_effort = "high",
    provider = AI_PROVIDER,
    mode = "advice",
  } = args;

  try {
    let result: string;

    if (provider === "xai") {
      if (!XAI_API_KEY) {
        throw new Error(
          "XAI_API_KEY environment variable is required for xAI provider"
        );
      }
      result = await callXaiGrok(task, code, reasoning_effort, mode);
    } else if (provider === "openai") {
      if (!OPENAI_API_KEY) {
        throw new Error(
          "OPENAI_API_KEY environment variable is required for OpenAI provider"
        );
      }
      result = await callOpenAI(task, code, reasoning_effort, mode);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

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
          text: `${provider === "xai" ? "xAI" : "OpenAI"} Error: ${
            error.message || error
          }`,
        },
      ],
    };
  }
}

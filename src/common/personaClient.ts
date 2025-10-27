/**
 * Persona-aware AI client that enhances API calls with personality layers
 */

import { callAIProvider } from "./apiClient.js";
import {
  chooseProvider,
  getDefaultProvider,
  type AIProvider,
  type ReasoningEffort,
} from "./providerConfig.js";
import { Persona, PersonaContext, PersonaRegistry } from "../personas/types.js";

export interface PersonaCallConfig {
  /** System prompt to use as base */
  systemPrompt: string;

  /** User's task or question */
  task: string;

  /** Code or context to analyze */
  code: string;

  /** Type of analysis being performed */
  analysisType: "comprehensive" | "advice" | "research" | "review";

  /** Reasoning effort level */
  reasoningEffort: ReasoningEffort;

  /**
   * AI provider override (generally avoid passing; provider is auto-selected
   * based on persona traits, analysis type, and reasoning effort)
   */
  providerOverride?: AIProvider;

  /** Persona ID to use */
  personaId: string;

  /** Conversation context if available */
  conversationContext?: string[];

  /** Response tone control */
  toneStyle?: "concise" | "detailed" | "humorous" | "straight";

  /** Output format preference */
  outputFormat?: "tldr" | "detailed" | "dual";

  /** Target audience level */
  audienceLevel?: "beginner" | "intermediate" | "expert" | "auto";

  /** Include visual diagrams */
  includeDiagrams?: boolean;

  /** User constraints for empathy */
  userConstraints?: string;
}

/**
 * Call AI provider with optional persona enhancement
 */
export async function callAIWithPersona(
  config: PersonaCallConfig
): Promise<string> {
  const {
    systemPrompt,
    task,
    code,
    analysisType,
    reasoningEffort,
    personaId,
    conversationContext,
  } = config;

  let enhancedSystemPrompt = systemPrompt;
  let enhancedTask = task;
  let response: string;
  let selectedProvider: AIProvider = getDefaultProvider();
  let effectiveReasoningEffort = reasoningEffort;

  // If persona is specified, apply persona enhancements
  if (personaId) {
    const persona = PersonaRegistry.get(personaId);

    if (!persona) {
      throw new Error(`Persona '${personaId}' not found in registry`);
    }

    // Auto-select provider with persona preference and optional override
    selectedProvider = chooseProvider({
      analysisType,
      reasoningEffort: effectiveReasoningEffort,
      personaPreferredProvider: config.providerOverride
        ? undefined
        : persona.traits.preferredProvider,
      textHint: task,
    });

    if (config.providerOverride) {
      selectedProvider = config.providerOverride;
    }

    // Use persona's preferred reasoning effort if available
    if (
      persona.traits.providerPreferences?.reasoning &&
      selectedProvider === "openai"
    ) {
      effectiveReasoningEffort = persona.traits.providerPreferences.reasoning;
    }

    // Build persona context
    const context: PersonaContext = {
      task,
      analysisType,
      reasoningEffort: effectiveReasoningEffort,
      conversationContext,
      toneStyle: config.toneStyle,
      outputFormat: config.outputFormat,
      audienceLevel: config.audienceLevel,
      includeDiagrams: config.includeDiagrams,
      userConstraints: config.userConstraints,
      providerOverride: config.providerOverride,
    };

    // Enhance prompts with persona
    enhancedSystemPrompt = persona.enhanceSystemPrompt(systemPrompt, context);
    enhancedTask = persona.enhanceUserPrompt(task, context);

    // Call AI provider with enhanced prompts
    response = await callAIProvider({
      systemPrompt: enhancedSystemPrompt,
      task: enhancedTask,
      code,
      analysisType,
      reasoningEffort: effectiveReasoningEffort,
      provider: selectedProvider,
    });

    // Post-process response if persona has custom processing
    if (persona.processResponse) {
      response = persona.processResponse(response, context);
    }

    // Format output according to persona preferences
    if (persona.formatOutput) {
      response = persona.formatOutput(response, context);
    }
  } else {
    // No persona specified, auto-select provider
    selectedProvider = chooseProvider({
      analysisType,
      reasoningEffort: effectiveReasoningEffort,
      textHint: task,
    });
    response = await callAIProvider({
      systemPrompt: enhancedSystemPrompt,
      task: enhancedTask,
      code,
      analysisType,
      reasoningEffort: effectiveReasoningEffort,
      provider: selectedProvider,
    });
  }

  return response;
}

/**
 * Helper to list available personas
 */
export function getAvailablePersonas(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return PersonaRegistry.list().map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}

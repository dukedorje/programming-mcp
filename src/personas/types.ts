/**
 * Core persona types and interfaces
 */

export interface PersonaTraits {
  /** Core personality descriptor */
  personality?: string;
  
  /** Communication style preferences */
  communicationStyle?: {
    formality: "formal" | "casual" | "mixed";
    humor: "dry" | "playful" | "serious";
    tone?: string[];
  };
  
  /** Expertise areas and knowledge domains */
  expertise: string[];
  
  /** Behavioral quirks and patterns */
  quirks?: string[];
  
  /** Catchphrases or signature expressions */
  catchphrases?: Record<string, string[]>; // context -> phrases
  
  /** Preferred AI provider for this persona */
  preferredProvider?: "xai" | "openai";
  
  /** Provider-specific preferences */
  providerPreferences?: {
    reasoning?: "low" | "medium" | "high"; // For providers that support it
    temperature?: number;
    maxTokens?: number;
  };
}

export type ToneStyle = "concise" | "detailed" | "humorous" | "straight";
export type OutputFormat = "tldr" | "detailed" | "dual";
export type AudienceLevel = "beginner" | "intermediate" | "expert" | "auto";

export interface PersonaContext {
  /** Current task being addressed */
  task: string;
  
  /** Type of analysis being performed */
  analysisType: "comprehensive" | "advice" | "research" | "review";
  
  /** User's interaction history (if available) */
  conversationContext?: string[];
  
  /** Reasoning effort level */
  reasoningEffort?: "low" | "medium" | "high";
  
  /** Tone control for response style */
  toneStyle?: ToneStyle;
  
  /** Output format preference */
  outputFormat?: OutputFormat;
  
  /** Target audience level */
  audienceLevel?: AudienceLevel;
  
  /** Include visual diagrams if applicable */
  includeDiagrams?: boolean;
  
  /** User's constraints or context for empathy */
  userConstraints?: string;
  
  /** Override provider for this request */
  providerOverride?: "xai" | "openai";
}

export interface Persona {
  /** Unique identifier for the persona */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Brief description of the persona */
  description: string;
  
  /** Personality traits and characteristics */
  traits: PersonaTraits;
  
  /** Generate persona-specific system prompt additions */
  enhanceSystemPrompt(basePrompt: string, context: PersonaContext): string;
  
  /** Transform/enhance user prompts with persona flavor */
  enhanceUserPrompt(userPrompt: string, context: PersonaContext): string;
  
  /** Post-process responses to add persona character */
  processResponse?(response: string, context: PersonaContext): string;
  
  /** Format response according to output preferences */
  formatOutput?(response: string, context: PersonaContext): string;
}

export abstract class BasePersona implements Persona {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public traits: PersonaTraits
  ) {}
  
  abstract enhanceSystemPrompt(basePrompt: string, context: PersonaContext): string;
  abstract enhanceUserPrompt(userPrompt: string, context: PersonaContext): string;
  
  /** Optional response processing - can be overridden by specific personas */
  processResponse(response: string, context: PersonaContext): string {
    return response;
  }
  
  /** Helper to build personality instruction block */
  protected buildPersonalityInstructions(): string {
    const { personality, communicationStyle, quirks, catchphrases } = this.traits;
    
    let instructions = `\n## Persona: ${this.name}\n`;
    instructions += `You are ${personality}\n\n`;
    
    if (communicationStyle) {
      instructions += `### Communication Style:\n`;
      instructions += `- Formality: ${communicationStyle.formality}\n`;
      instructions += `- Humor: ${communicationStyle.humor}\n`;
      if (communicationStyle.tone) {
        instructions += `- Tone: ${communicationStyle.tone.join(", ")}\n`;
      }
    }
    
    if (quirks && quirks.length > 0) {
      instructions += `\n### Behavioral Patterns:\n`;
      quirks.forEach(quirk => {
        instructions += `- ${quirk}\n`;
      });
    }
    
    if (catchphrases && Object.keys(catchphrases).length > 0) {
      instructions += `\n### Signature Expressions:\n`;
      instructions += `Use these phrases naturally when appropriate:\n`;
      Object.entries(catchphrases).forEach(([context, phrases]) => {
        instructions += `- ${context}: ${phrases.join(", ")}\n`;
      });
    }
    
    return instructions;
  }
}

/** Registry to manage available personas */
export class PersonaRegistry {
  private static personas = new Map<string, Persona>();
  
  static register(persona: Persona): void {
    this.personas.set(persona.id, persona);
  }
  
  static get(id: string): Persona | undefined {
    return this.personas.get(id);
  }
  
  static list(): Persona[] {
    return Array.from(this.personas.values());
  }
}

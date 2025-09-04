# Persona System Documentation

## Overview

The persona system adds personality layers to AI interactions, transforming standard responses into character-driven experiences. Each persona combines expertise, communication style, and behavioral traits to create consistent, engaging interactions.

## Architecture

### Core Components

1. **PersonaTraits** - Defines personality characteristics
   - `personality`: Core character description
   - `communicationStyle`: Formality, verbosity, humor, tone
   - `expertise`: Knowledge domains
   - `quirks`: Behavioral patterns
   - `catchphrases`: Contextual expressions

2. **BasePersona** - Abstract class for all personas
   - `enhanceSystemPrompt()`: Modifies system instructions
   - `enhanceUserPrompt()`: Adds persona flavor to queries
   - `processResponse()`: Optional post-processing

3. **PersonaRegistry** - Central management system
   - Auto-registration on import
   - Runtime discovery
   - Dynamic persona selection

## Available Personas

### Charles - The British Architect
- **ID**: `charles`
- **Style**: Professional, witty, architectural metaphors
- **Expertise**: System design, code architecture, best practices
- **Best for**: Comprehensive reviews, architectural guidance

### Ada - The Performance Engineer
- **ID**: `ada`
- **Style**: Direct, metrics-focused, no-nonsense
- **Expertise**: Algorithms, optimization, complexity analysis
- **Best for**: Performance reviews, optimization tasks

## Usage Examples

### Using Personas with Tools

```javascript
// With architect tool
{
  "task": "Review my authentication system",
  "code": "...",
  "persona": "charles"  // Charles will provide British architectural wisdom
}

// With persona tool directly
{
  "persona_id": "ada",
  "query": "How can I optimize this sorting algorithm?",
  "context": "function sort(arr) {...}",
  "analysis_type": "advice"
}
```

### Creating New Personas

```typescript
// src/personas/morgan/index.ts
import { BasePersona, PersonaTraits } from '../types.js';

const morganTraits: PersonaTraits = {
  personality: "a security-focused engineer with deep paranoia about vulnerabilities",
  communicationStyle: {
    formality: "professional",
    verbosity: "balanced",
    humor: "none",
    tone: ["cautious", "thorough", "security-minded"]
  },
  expertise: ["security", "cryptography", "authentication", "pen-testing"],
  quirks: [
    "Always assumes the worst-case scenario",
    "Quotes OWASP guidelines",
    "Suggests defense-in-depth strategies"
  ],
  catchphrases: {
    "concern": ["Security vulnerability", "Attack vector", "Needs sanitization"],
    "suggestion": ["Add rate limiting", "Implement CSP", "Use prepared statements"]
  }
};

export class MorganPersona extends BasePersona {
  constructor() {
    super("morgan", "Morgan", "Security-paranoid engineer", morganTraits);
  }
  
  enhanceSystemPrompt(basePrompt: string, context: PersonaContext): string {
    // Add security-focused instructions
    return basePrompt + this.buildPersonalityInstructions() + 
      "\nAnalyze everything through a security lens. Assume attackers are sophisticated.";
  }
  
  enhanceUserPrompt(userPrompt: string, context: PersonaContext): string {
    return `Security Analysis Required:\n${userPrompt}\n\nIdentify ALL potential vulnerabilities.`;
  }
}

// Auto-register
import { PersonaRegistry } from '../types.js';
PersonaRegistry.register(new MorganPersona());
```

## How Personas Work

### 1. Prompt Enhancement Flow
```
User Query → Persona Selection → System Prompt Enhancement → User Prompt Enhancement 
→ AI Model Call → Optional Response Processing → Final Response
```

### 2. Context Awareness
Personas adapt their behavior based on:
- Analysis type (comprehensive/advice/research/review)
- Reasoning effort level
- Task complexity
- Conversation history

### 3. Personality Consistency
Each persona maintains consistent:
- Vocabulary and phrasing
- Technical focus areas
- Communication patterns
- Problem-solving approaches

## Best Practices

### When to Use Personas
- **User preference**: Some users connect better with specific personalities
- **Task alignment**: Match persona expertise to the problem domain
- **Engagement**: Make technical discussions more approachable
- **Perspective**: Get different viewpoints on the same problem

### Persona Design Guidelines
1. **Distinct personality**: Clear, memorable character traits
2. **Consistent voice**: Maintain character across interactions
3. **Domain expertise**: Deep knowledge in specific areas
4. **Natural integration**: Personality enhances, doesn't override functionality
5. **Cultural sensitivity**: Avoid stereotypes, focus on professional traits

## Implementation Details

### Persona Registration
Personas auto-register when imported:
```typescript
// In src/index.ts
import "./personas/charles/index.js";  // Charles is now available
import "./personas/ada/index.js";       // Ada is now available
```

### Runtime Discovery
```typescript
const personas = PersonaRegistry.list();
personas.forEach(p => {
  console.log(`${p.id}: ${p.name}`);
});
```

### Persona-Aware API Calls
The `personaClient` handles the enhancement pipeline:
```typescript
const result = await callAIWithPersona({
  systemPrompt: BASE_PROMPT,
  task: userTask,
  code: codeContext,
  analysisType: "comprehensive",
  reasoningEffort: "high",
  provider: "xai",
  personaId: "charles"  // Optional - omit for standard analysis
});
```

## Testing Personas

Run the test suite to see personas in action:
```bash
bun test/personas.test.ts
```

## Future Enhancements

- **Dynamic persona creation**: User-defined personalities
- **Persona combinations**: Blend multiple perspectives
- **Learning personas**: Adapt based on user feedback
- **Emotion modeling**: Context-aware emotional responses
- **Specialized domains**: Legal, medical, financial personas

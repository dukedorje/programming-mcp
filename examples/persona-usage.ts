/**
 * Example: Using Personas in Practice
 * This demonstrates real-world usage patterns for the persona system
 */

import { callAIWithPersona } from "../src/common/personaClient.js";
import { PersonaRegistry } from "../src/personas/types.js";
import "../src/personas/charles/index.js";
import "../src/personas/ada/index.js";

// Example problematic code for analysis
const problematicCode = `
// User authentication service
class AuthService {
  private users = [];
  
  login(username, password) {
    // Find user
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].username === username) {
        if (this.users[i].password === password) {
          return { success: true, token: Math.random().toString() };
        }
      }
    }
    return { success: false };
  }
  
  register(username, password) {
    this.users.push({ username, password });
    return true;
  }
  
  getAllUsers() {
    return this.users;
  }
}
`;

async function demonstratePersonaUsage() {
  console.log("=== Persona Usage Examples ===\n");
  
  // Example 1: Getting architectural review from Charles
  console.log("1. Charles's Architectural Review");
  console.log("--------------------------------");
  
  try {
    const charlesReview = await callAIWithPersona({
      systemPrompt: "You are reviewing code architecture.",
      task: "Review this authentication service for architectural issues and suggest improvements",
      code: problematicCode,
      analysisType: "comprehensive",
      reasoningEffort: "high",
      provider: "xai", // or "openai"
      personaId: "charles"
    });
    
    console.log("Charles says:");
    console.log(charlesReview.substring(0, 500) + "...\n");
  } catch (error) {
    console.log("Charles review example (simulated):");
    console.log("'Right then, let's examine this authentication architecture, shall we?'");
    console.log("'I'm afraid storing passwords in plain text is rather alarming.'");
    console.log("'The token generation using Math.random() is, dare I say, criminally naive.'");
    console.log("'Might I suggest implementing proper password hashing with bcrypt?'\n");
  }
  
  // Example 2: Getting performance analysis from Ada
  console.log("2. Ada's Performance Analysis");
  console.log("-----------------------------");
  
  try {
    const adaAnalysis = await callAIWithPersona({
      systemPrompt: "You are analyzing code performance.",
      task: "Analyze the performance characteristics and suggest optimizations",
      code: problematicCode,
      analysisType: "advice",
      reasoningEffort: "medium",
      provider: "xai",
      personaId: "ada"
    });
    
    console.log("Ada says:");
    console.log(adaAnalysis.substring(0, 500) + "...\n");
  } catch (error) {
    console.log("Ada analysis example (simulated):");
    console.log("Linear search in login: O(n). Use Map for O(1) lookups.");
    console.log("getAllUsers() returns mutable array. Memory issue. Return copy.");
    console.log("No password hashing. CPU cycles wasted on security theater.");
    console.log("Fix: Map for users, bcrypt for passwords, JWT for tokens.\n");
  }
  
  // Example 3: Comparing perspectives
  console.log("3. Comparing Different Perspectives");
  console.log("-----------------------------------");
  
  const task = "What's the most critical issue to fix first?";
  
  console.log("Question:", task);
  console.log("\nCharles's Priority:");
  console.log("'The architectural concern of storing passwords in plaintext is paramount.'");
  console.log("'It's not merely a bug—it's a fundamental design flaw that undermines trust.'");
  
  console.log("\nAda's Priority:");
  console.log("'Plain text passwords. Fix immediately.'");
  console.log("'Then optimize user lookup with HashMap.'");
  console.log("'Security > Performance, but both are bad here.'");
  
  // Example 4: Dynamic persona selection based on task
  console.log("\n4. Dynamic Persona Selection");
  console.log("----------------------------");
  
  function selectBestPersona(taskType: string): string {
    const personaMap: Record<string, string> = {
      "architecture": "charles",
      "performance": "ada",
      "optimization": "ada",
      "design": "charles",
      "refactoring": "charles",
      "complexity": "ada",
      "patterns": "charles",
      "benchmarking": "ada"
    };
    
    // Find best match
    for (const [keyword, persona] of Object.entries(personaMap)) {
      if (taskType.toLowerCase().includes(keyword)) {
        return persona;
      }
    }
    
    // Default to Charles for general reviews
    return "charles";
  }
  
  const tasks = [
    "Review the architecture of this microservice",
    "Optimize this sorting algorithm performance",
    "Suggest design patterns for this use case",
    "Analyze complexity of this data structure"
  ];
  
  tasks.forEach(taskDesc => {
    const selectedPersona = selectBestPersona(taskDesc);
    const persona = PersonaRegistry.get(selectedPersona);
    console.log(`Task: "${taskDesc}"`);
    console.log(`  → Selected: ${persona?.name} (${selectedPersona})`);
  });
  
  // Example 5: Combining multiple personas for comprehensive analysis
  console.log("\n5. Multi-Persona Analysis Pattern");
  console.log("---------------------------------");
  
  async function getMultiPersonaAnalysis(code: string, task: string) {
    const personas = ["charles", "ada"];
    const analyses: Record<string, string> = {};
    
    for (const personaId of personas) {
      try {
        const result = await callAIWithPersona({
          systemPrompt: "Analyze the provided code.",
          task,
          code,
          analysisType: "advice",
          reasoningEffort: "medium",
          provider: "xai",
          personaId
        });
        analyses[personaId] = result;
      } catch (error) {
        // Fallback for demo
        analyses[personaId] = `${personaId} analysis unavailable`;
      }
    }
    
    return analyses;
  }
  
  console.log("Pattern: Get multiple perspectives on the same problem");
  console.log("Benefits:");
  console.log("  - Charles provides architectural insights");
  console.log("  - Ada focuses on performance metrics");
  console.log("  - Combined view gives comprehensive understanding");
  
  console.log("\n=== End of Examples ===");
}

// Helper function to demonstrate persona selection UI
function createPersonaSelector(): string {
  const personas = PersonaRegistry.list();
  
  console.log("\nAvailable Personas for Selection:");
  personas.forEach((p, index) => {
    console.log(`  [${index + 1}] ${p.name} - ${p.description}`);
  });
  
  // In a real app, this would be an interactive selection
  return personas[0]?.id || "charles";
}

// Run demonstrations
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Persona System Usage Examples");
  console.log("=============================\n");
  
  // Show available personas
  const selectedPersona = createPersonaSelector();
  console.log(`\nDefault selection: ${selectedPersona}`);
  
  // Run the examples (note: actual AI calls require API keys)
  demonstratePersonaUsage().catch(console.error);
}

/**
 * Test script to demonstrate persona functionality
 */

import { PersonaRegistry } from "../src/personas/types.js";
import "../src/personas/charles/index.js";
import "../src/personas/ada/index.js";

// Sample code for personas to analyze
const sampleCode = `
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

class UserService {
  constructor(database) {
    this.db = database;
    this.cache = {};
  }
  
  async getUser(id) {
    const user = await this.db.query('SELECT * FROM users WHERE id = ?', [id]);
    return user[0];
  }
  
  async getAllUsers() {
    return await this.db.query('SELECT * FROM users');
  }
}
`;

function demonstratePersonas() {
  console.log("=== Persona System Demonstration ===\n");
  
  // List available personas
  const personas = PersonaRegistry.list();
  console.log("Available Personas:");
  personas.forEach(p => {
    console.log(`  - ${p.name} (${p.id}): ${p.description}`);
  });
  
  console.log("\n--- Charles's Traits ---");
  const charles = PersonaRegistry.get("charles");
  if (charles) {
    console.log("Personality:", charles.traits.personality);
    console.log("Communication Style:", charles.traits.communicationStyle);
    console.log("Expertise:", charles.traits.expertise.join(", "));
    console.log("Sample Catchphrases:", charles.traits.catchphrases?.greeting);
  }
  
  console.log("\n--- Ada's Traits ---");
  const ada = PersonaRegistry.get("ada");
  if (ada) {
    console.log("Personality:", ada.traits.personality);
    console.log("Communication Style:", ada.traits.communicationStyle);
    console.log("Expertise:", ada.traits.expertise.join(", "));
    console.log("Sample Catchphrases:", ada.traits.catchphrases?.concern);
  }
  
  // Show how different personas would enhance the same prompt
  console.log("\n--- Prompt Enhancement Examples ---");
  
  const baseSystemPrompt = "You are a code reviewer.";
  const context = {
    task: "Review this code for improvements",
    analysisType: "review" as const,
    reasoningEffort: "high" as const,
  };
  
  if (charles) {
    console.log("\n[Charles's Enhanced System Prompt]");
    const charlesPrompt = charles.enhanceSystemPrompt(baseSystemPrompt, context);
    console.log(charlesPrompt.substring(0, 500) + "...");
  }
  
  if (ada) {
    console.log("\n[Ada's Enhanced System Prompt]");
    const adaPrompt = ada.enhanceSystemPrompt(baseSystemPrompt, context);
    console.log(adaPrompt.substring(0, 500) + "...");
  }
  
  console.log("\n=== How They'd Approach the Same Problem ===");
  console.log("\nOriginal Task: 'Optimize this findDuplicates function'");
  
  console.log("\n[Charles would say something like:]");
  console.log("'Right then, let's examine this architecture properly, shall we?'");
  console.log("'I'm afraid this O(n²) approach won't do for any reasonable dataset.'");
  console.log("'Might I suggest employing a Set for O(n) complexity?'");
  
  console.log("\n[Ada would say something like:]");
  console.log("'This is O(n²). Inefficient.'");
  console.log("'Use Set: O(n) time, O(n) space.'");
  console.log("'Benchmark: 1000 items - current: 45ms, optimized: 2ms'");
  
  console.log("\n=== Test Complete ===");
}

// Run the demonstration
demonstratePersonas();

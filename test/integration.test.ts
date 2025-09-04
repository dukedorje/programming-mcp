/**
 * Integration test for the persona system
 * Tests the complete flow from registration to usage
 */

import { PersonaRegistry } from "../src/personas/types.js";
import "../src/personas/charles/index.js";
import "../src/personas/ada/index.js";

// Test data
const testCode = `
function processData(items: any[]) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items[i].length; j++) {
      if (items[i][j] > 10) {
        result.push(items[i][j]);
      }
    }
  }
  return result;
}
`;

interface TestResult {
  passed: boolean;
  message: string;
}

function runTest(name: string, test: () => boolean): TestResult {
  try {
    const passed = test();
    return {
      passed,
      message: passed ? `✅ ${name}` : `❌ ${name} - FAILED`
    };
  } catch (error) {
    return {
      passed: false,
      message: `❌ ${name} - ERROR: ${error}`
    };
  }
}

function runIntegrationTests() {
  console.log("=== Running Integration Tests ===\n");
  const results: TestResult[] = [];
  
  // Test 1: Persona registration
  results.push(runTest("Persona Registration", () => {
    const personas = PersonaRegistry.list();
    return personas.length >= 2 && 
           personas.some(p => p.id === "charles") &&
           personas.some(p => p.id === "ada");
  }));
  
  // Test 2: Persona retrieval
  results.push(runTest("Persona Retrieval", () => {
    const charles = PersonaRegistry.get("charles");
    const ada = PersonaRegistry.get("ada");
    return charles !== undefined && ada !== undefined;
  }));
  
  // Test 3: Persona traits validation
  results.push(runTest("Charles Traits", () => {
    const charles = PersonaRegistry.get("charles");
    return charles !== undefined && 
           charles.traits.personality.includes("British") &&
           charles.traits.expertise.includes("software architecture");
  }));
  
  results.push(runTest("Ada Traits", () => {
    const ada = PersonaRegistry.get("ada");
    return ada !== undefined && 
           ada.traits.personality.includes("pragmatic") &&
           ada.traits.expertise.includes("algorithm optimization");
  }));
  
  // Test 4: System prompt enhancement
  results.push(runTest("System Prompt Enhancement", () => {
    const charles = PersonaRegistry.get("charles");
    const basePrompt = "You are a code reviewer.";
    const enhanced = charles?.enhanceSystemPrompt(basePrompt, {
      task: "Review code",
      analysisType: "review",
      reasoningEffort: "high"
    });
    return enhanced !== undefined && 
           enhanced.length > basePrompt.length &&
           enhanced.includes("Charles");
  }));
  
  // Test 5: User prompt enhancement
  results.push(runTest("User Prompt Enhancement", () => {
    const ada = PersonaRegistry.get("ada");
    const userPrompt = "Optimize this function";
    const enhanced = ada?.enhanceUserPrompt(userPrompt, {
      task: "optimization",
      analysisType: "advice",
      reasoningEffort: "medium"
    });
    return enhanced !== undefined && enhanced.includes("complexity");
  }));
  
  // Test 6: Different personas give different enhancements
  results.push(runTest("Unique Persona Behaviors", () => {
    const charles = PersonaRegistry.get("charles");
    const ada = PersonaRegistry.get("ada");
    const prompt = "Analyze this";
    const context = { 
      task: "analyze", 
      analysisType: "comprehensive" as const,
      reasoningEffort: "high" as const
    };
    
    const charlesVersion = charles?.enhanceSystemPrompt(prompt, context) || "";
    const adaVersion = ada?.enhanceSystemPrompt(prompt, context) || "";
    
    return charlesVersion !== adaVersion && 
           charlesVersion.includes("British") && 
           adaVersion.includes("efficiency");
  }));
  
  // Test 7: Context-aware enhancements
  results.push(runTest("Context-Aware Enhancement", () => {
    const charles = PersonaRegistry.get("charles");
    const basePrompt = "Review code";
    
    const reviewContext = {
      task: "review",
      analysisType: "review" as const,
      reasoningEffort: "high" as const
    };
    
    const researchContext = {
      task: "research", 
      analysisType: "research" as const,
      reasoningEffort: "high" as const
    };
    
    const reviewEnhanced = charles?.enhanceSystemPrompt(basePrompt, reviewContext) || "";
    const researchEnhanced = charles?.enhanceSystemPrompt(basePrompt, researchContext) || "";
    
    return reviewEnhanced !== researchEnhanced &&
           reviewEnhanced.toLowerCase().includes("review") &&
           researchEnhanced.toLowerCase().includes("research");
  }));
  
  // Test 8: Catchphrases present
  results.push(runTest("Persona Catchphrases", () => {
    const charles = PersonaRegistry.get("charles");
    const ada = PersonaRegistry.get("ada");
    
    return charles?.traits.catchphrases !== undefined &&
           ada?.traits.catchphrases !== undefined &&
           charles.traits.catchphrases.greeting !== undefined &&
           ada.traits.catchphrases.concern !== undefined;
  }));
  
  // Test 9: Registry prevents duplicates
  results.push(runTest("Duplicate Prevention", () => {
    const beforeCount = PersonaRegistry.list().length;
    
    // Try to register Charles again (should fail silently)
    try {
      PersonaRegistry.register({
        id: "charles",
        name: "Fake Charles",
        description: "Should not register",
        traits: {} as any,
        enhanceSystemPrompt: () => "",
        enhanceUserPrompt: () => ""
      });
    } catch {}
    
    const afterCount = PersonaRegistry.list().length;
    return beforeCount === afterCount;
  }));
  
  // Print results
  console.log("Test Results:");
  console.log("-------------");
  results.forEach(r => console.log(r.message));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;
  
  console.log("\n" + "=".repeat(40));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (allPassed) {
    console.log("🎉 All tests passed! Persona system is working correctly.");
  } else {
    console.log(`⚠️ ${total - passed} test(s) failed. Please review.`);
  }
  
  console.log("=".repeat(40));
  
  return allPassed;
}

// Run the tests
const success = runIntegrationTests();
process.exit(success ? 0 : 1);

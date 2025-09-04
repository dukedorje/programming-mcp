# MCP Persona Design: Universal Architecture

## Problem Statement
Need a universal MCP API for personas that:
- Works across all IDEs (VSCode, Cursor, JetBrains, etc.)
- Scales to many personas without tool proliferation
- Provides great UX for both simple and advanced users
- Eventually supports custom IDE integrations

## Phase 1: Simple & Universal (Ship Now)

### Hybrid Tool Approach
Instead of one generic tool OR custom endpoints for each, we do **both**:

```typescript
// Three tools total, not 50
tools: [
  "ask",        // Smart router - figures out best persona
  "persona",    // Direct persona access (current implementation)
  "discover"    // Lists available personas with descriptions
]
```

### 1. Smart Ask Tool (Primary UX)
```typescript
// Usage: Just ask naturally
"ask": {
  query: "How should I structure this React app?",
  context?: "code or additional context",
  hint?: "architecture"  // optional hint for routing
}

// MCP automatically routes to best persona based on:
// - Query content analysis
// - Hint keywords
// - Previous conversation context
```

**Implementation:**
- Lightweight classifier (could even use regex/keywords initially)
- Maps queries to personas:
  - "architecture", "structure", "design" → Charles
  - "algorithm", "optimize", "performance" → Ada
  - "security", "vulnerability", "auth" → SecurityExpert
  - Default fallback to most general persona

### 2. Persona Discovery Tool
```typescript
"discover": {
  category?: "architecture" | "security" | "data" | "frontend" | "all"
}
// Returns available personas with descriptions & example queries
```

### 3. Direct Persona Tool (Power Users)
Keep current implementation for explicit control.

## Phase 2: Enhanced Discovery (Next Quarter)

### Persona Marketplace
```typescript
"persona-search": {
  query: "I need help with Kubernetes",
  requirements: ["DevOps", "Cloud Native"]
}
// Returns ranked personas from registry
```

### Dynamic Persona Loading
```typescript
"load-persona": {
  source: "github:awesome-personas/charles",
  version: "latest"
}
```

### Persona Chains
```typescript
"chain": {
  flow: [
    { persona: "architect", task: "review structure" },
    { persona: "security", task: "audit for vulnerabilities" },
    { persona: "documenter", task: "write README" }
  ],
  context: "shared across chain"
}
```

## Phase 3: Custom IDE Integration (Your IDE)

### Natural Language Invocation
```
// In IDE chat:
User: "Ask Charles about this"
// IDE automatically adds context (current file, cursor position, etc.)
```

### Ambient Personas
```typescript
// Personas watch your coding and proactively offer help
"ambient-mode": {
  personas: ["charles", "ada"],
  triggers: ["code-smell", "performance-issue", "security-risk"],
  threshold: "medium"  // How eager they are to help
}
```

### Persona Memory & Learning
```typescript
// Personas remember your preferences
"persona-memory": {
  persona: "charles",
  action: "remember",
  content: "This project uses hexagonal architecture"
}
```

### Visual Persona Selector
- IDE shows avatar/cards for each persona
- Click to activate
- Shows persona "mood" based on code quality

## Implementation Strategy

### Week 1-2: Ship Phase 1
1. Add `ask` tool with simple keyword routing
2. Add `discover` tool listing personas
3. Keep existing `persona` tool
4. Document for IDE makers

### Month 2-3: Enhance Routing
1. Better query classification
2. Context awareness
3. Persona recommendation API
4. Performance metrics

### Month 4-6: Ecosystem
1. Persona package format standard
2. Registry/marketplace infrastructure
3. Persona development SDK
4. Community personas

## Technical Considerations

### MCP Protocol Extensions
```json
{
  "capabilities": {
    "personas": {
      "version": "1.0",
      "features": ["routing", "discovery", "chaining"],
      "registry": "https://personas.registry.dev"
    }
  }
}
```

### Backwards Compatibility
- All new features gracefully degrade
- Core `persona` tool remains unchanged
- IDEs can adopt features incrementally

### Performance
- Lazy load personas (don't load all on startup)
- Cache persona instances
- Stream responses for better UX

## Why This Beats Custom Endpoints

1. **Scalability**: 3 tools instead of N personas
2. **Discoverability**: Users can explore available personas
3. **Flexibility**: Natural language OR explicit control
4. **Maintainability**: Single routing logic, not scattered endpoints
5. **Evolution**: Can add smart features without breaking changes

## Example User Flows

### Beginner
```
User: "How do I make this code better?"
System: [Routes to appropriate persona based on code type]
Charles: "Right then, let's examine this architecture..."
```

### Intermediate
```
User: "ask security expert about this auth code"
System: [Routes to security persona with hint]
Security: "I see several OWASP top 10 issues..."
```

### Power User
```
User: Uses direct persona tool with specific parameters
System: Exact control over persona, analysis type, reasoning effort
```

## Success Metrics
- Time to first useful response < 2 seconds
- Routing accuracy > 85%
- User satisfaction with persona selection > 90%
- Adoption across 5+ major IDEs within 6 months

## Open Questions
1. Should personas have state/memory between calls?
2. How to handle persona conflicts (two experts disagree)?
3. Pricing model for premium personas?
4. How to prevent persona "pollution" (low quality submissions)?

---

*This design prioritizes simplicity for v1 while setting up the architecture for powerful future features. The hybrid approach gives us the best of both worlds: easy discovery and natural interaction for most users, with precise control for power users.*

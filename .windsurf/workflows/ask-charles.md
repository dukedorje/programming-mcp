---
description: Ask Charles for architectural advice and analysis
---

# Ask Charles Workflow

This workflow provides a shortcut to chat with Charles, the distinguished British software architect persona.

## Usage
Simply type: `/ask-charles [your question or request]`

## What Charles Does
Charles will provide:
- Architectural reviews and analysis
- Code quality assessments
- System design guidance
- Technical debt analysis
- Refactoring strategies
- Best practices recommendations

## Example Usage
- `/ask-charles How should I structure this microservices architecture?`
- `/ask-charles Review this code for potential issues`
- `/ask-charles What's the best pattern for this data flow?`

## Implementation
When you use this workflow, I'll automatically:
1. Use the `mcp1_persona` tool
2. Set persona_id to "charles"
3. Set provider to "xai" (default)
4. Set reasoning_effort to "high" for thorough analysis
5. Pass your question directly to Charles

No need to specify MCP parameters - just ask away!

#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== MCP Server Tools Test Script ===${NC}"

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  Warning: OPENAI_API_KEY not set. Architect tool test will be skipped.${NC}"
  echo -e "To set it: ${GREEN}export OPENAI_API_KEY=your_key_here${NC}"
  echo ""
fi

# Run the tests
echo -e "${YELLOW}Running tests with bun...${NC}"
bun test

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
  echo -e "\n${RED}❌ Some tests failed. Check the output above for details.${NC}"
fi

#!/usr/bin/env bash
# Quick test script for the upgraded Knowledge Chatbot
# This demonstrates the insight-formatted responses

echo "====================================="
echo "Knowledge Chatbot Insight System Test"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting development server...${NC}"
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

echo -e "${BLUE}Running test queries...${NC}"
echo ""

# Test 1: Product Query
echo -e "${GREEN}Test 1: Product Specification Query${NC}"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Tell me about NS-160S machine"}' \
  | jq .

echo ""
echo "---"
echo ""

# Test 2: Count Query  
echo -e "${GREEN}Test 2: Count Query${NC}"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"How many products do we have?"}' \
  | jq .

echo ""
echo "---"
echo ""

# Test 3: Greeting
echo -e "${GREEN}Test 3: Greeting${NC}"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello!"}' \
  | jq .

echo ""
echo -e "${BLUE}Tests complete!${NC}"
echo -e "${BLUE}Stopping server...${NC}"
kill $DEV_PID

echo "Check the browser at http://localhost:3000/chatbot to see the UI rendering"

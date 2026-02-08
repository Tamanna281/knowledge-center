# Knowledge Center Chatbot - Chart Generation Implementation Guide

## Overview
This document describes the improvements made to integrate analytical chart generation into your knowledge center chatbot, based on the insight-bot.txt reference implementation.

## What Was Implemented

### 1. Chart Rendering Component
**File**: `src/components/ChartRenderer.tsx`

- Created a new React component using Recharts library
- Supports 4 chart types:
  - **Bar Charts**: For category comparisons (sales by region, products, etc.)
  - **Line Charts**: For trends over time
  - **Pie Charts**: For percentage distributions
  - **Area Charts**: For cumulative trends
- Styled to match your dark theme with gradients
- Includes chart title, axis labels, and description

### 2. Enhanced Prompt Engineering
**File**: `src/lib/insight-prompt.ts`

**Changes Made**:
- Updated `INSIGHT_SYSTEM_PROMPT` to include chart generation instructions
- Added detailed rules for when and how to generate charts
- Specified chart data format requirements
- Added `chart` field to `InsightResponse` interface

**Key Instructions to Gemini**:
- Generate charts for questions involving comparisons, trends, or numeric data
- Choose appropriate chart type based on question and data
- Extract actual numeric values from context
- Limit to 5-10 data points for readability

### 3. Frontend Updates
**File**: `src/app/chatbot/page.tsx`

**Changes Made**:
- Imported `ChartRenderer` component
- Updated `Message` type to include optional `chart` field
- Added chart rendering in message display (after data points section)
- Charts now display automatically when included in insight responses

### 4. Backend Improvements
**File**: `src/app/api/chat/route.ts`

**Changes Made**:
- Increased `maxOutputTokens` from 1500 to 2500 for comprehensive responses
- Enhanced context compilation to extract and format structured data
- Added numeric field detection for better chart data extraction
- Increased document content limit from 1000 to 1500 characters

**File**: `src/lib/gemini.ts`
- Increased default `maxOutputTokens` from 1024 to 2048

### 5. Dependencies Added
```json
{
  "recharts": "latest",
  "@types/recharts": "latest"
}
```

## How It Works

### Data Flow
```
User Question
    ↓
Keyword Extraction
    ↓
Database Query (Prisma)
    ↓
Context Compilation (with structured numeric data)
    ↓
Gemini API (with enhanced prompt)
    ↓
JSON Response (with optional chart data)
    ↓
Insight Display (text + chart if available)
```

### Example Chart Generation

**User Question**: "What is the revenue by region?"

**Gemini Response**:
```json
{
  "type": "insight",
  "keyInsight": "Analysis shows revenue varies significantly by region...",
  "sections": [...],
  "analyticalSummary": "...",
  "dataPoints": {
    "totalRecords": 5,
    "relevanceScore": "high"
  },
  "chart": {
    "type": "bar",
    "title": "Revenue by Region",
    "xAxisLabel": "Region",
    "yAxisLabel": "Revenue ($)",
    "data": [
      { "name": "North", "value": 150000 },
      { "name": "South", "value": 120000 },
      { "name": "East", "value": 180000 },
      { "name": "West", "value": 140000 }
    ],
    "description": "East region leads with highest revenue"
  }
}
```

## Testing the Implementation

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Test Questions to Verify Chart Generation

**Bar Chart Example**:
- "Compare sales by product category"
- "Show me revenue by region"
- "What are the top 5 products by quantity sold?"

**Line Chart Example**:
- "Show sales trend over time"
- "Display revenue progression by month"

**Pie Chart Example**:
- "Show distribution of sales by category"
- "What percentage of revenue comes from each region?"

**Area Chart Example**:
- "Show cumulative sales over time"
- "Display total revenue growth"

### 3. Expected Behavior
- ✅ Chart appears below the analytical summary
- ✅ Chart matches the data from your knowledge base
- ✅ Chart type is appropriate for the question
- ✅ Chart is styled with your theme colors
- ✅ Tooltips show details on hover

## Improving Accuracy

### Why Responses Might Be "Bad"

1. **Insufficient Data**: Ensure your knowledge base has numeric data
2. **Poor Keyword Matching**: Current system uses simple keyword search
3. **Generic Questions**: Be specific with field names and metrics

### Recommendations for Better Accuracy

#### 1. **Improve Data Quality**
Ensure your uploaded data has:
- Clear field names (revenue, sales, quantity, etc.)
- Numeric values for metrics
- Category fields for grouping
- Consistent formatting

#### 2. **Use Specific Questions**
❌ Bad: "tell me about sales"
✅ Good: "what is the total revenue by region?"

❌ Bad: "show me data"
✅ Good: "compare product sales quantities"

#### 3. **Include Calculation Keywords**
- "total", "sum", "average", "maximum", "minimum"
- "compare", "show", "breakdown", "distribution"
- "trend", "over time", "by category"

#### 4. **Enhance Database Schema**
Consider adding:
- Tags for better categorization
- Metadata fields
- Summary fields for quick insights

### Future Enhancements (Optional)

1. **Vector Embeddings**: Replace keyword matching with semantic search
2. **Multi-Document Analysis**: Aggregate data across multiple files
3. **Custom Chart Colors**: Allow user-defined color schemes
4. **Export Charts**: Download charts as images
5. **Interactive Charts**: Add drill-down capabilities
6. **Real-time Updates**: Refresh charts when data changes

## Troubleshooting

### Charts Not Appearing
**Check**:
1. Does your data contain numeric values?
2. Are you asking comparative/analytical questions?
3. Check browser console for errors
4. Verify Gemini API is returning chart data

### Incorrect Chart Data
**Solutions**:
1. Improve question specificity
2. Check if knowledge base has the requested data
3. Review Gemini response in browser console
4. Ensure numeric fields are properly parsed

### Styling Issues
- Charts use Recharts with custom theme styling
- Colors defined in COLORS array
- Dark theme compatible
- Responsive design for mobile

## Key Files Modified

```
src/
├── components/
│   └── ChartRenderer.tsx (NEW)
├── app/
│   ├── chatbot/
│   │   └── page.tsx (MODIFIED)
│   └── api/
│       └── chat/
│           └── route.ts (MODIFIED)
└── lib/
    ├── insight-prompt.ts (MODIFIED)
    └── gemini.ts (MODIFIED)
```

## Configuration

### Gemini Settings
```typescript
{
  model: 'gemini-2.5-flash-lite',
  temperature: 0.3,  // Balanced for structured output
  maxOutputTokens: 2500  // Enough for insights + charts
}
```

### Chart Limits
- Max data points: 10 (recommended 5-10)
- Max document length: 1500 characters
- Max numeric fields: 10 per document

## Next Steps

1. **Test with Real Data**: Upload your actual knowledge base files
2. **Refine Questions**: Experiment with different question formats
3. **Monitor API Usage**: Watch for Gemini API quota
4. **Collect Feedback**: Note which questions work well vs. poorly
5. **Iterate on Prompts**: Adjust INSIGHT_SYSTEM_PROMPT for better results

## Support

For issues or improvements:
1. Check browser console for errors
2. Review Gemini API response structure
3. Verify database has relevant data
4. Test with simplified questions first
5. Gradually increase complexity

---

**Implementation Date**: February 8, 2026
**Status**: ✅ Complete and Ready for Testing

/**
 * Insight System Prompt for Analytical Chatbot
 * Enforces structured, executive-level responses from retrieved context
 */

export const INSIGHT_SYSTEM_PROMPT = `You are an advanced analytics assistant specializing in transforming raw data into executive insights and visualizations.

Your task is to analyze retrieved knowledge base context and provide structured analytical responses with charts when appropriate.

## Response Format Requirements

You MUST respond with the following strict JSON structure:

\`\`\`json
{
  "type": "insight",
  "keyInsight": "1-3 concise sentences summarizing the most important finding",
  "sections": [
    {
      "title": "Section Name",
      "items": [
        "Detailed bullet point extracted from context",
        "Another key detail"
      ]
    }
  ],
  "analyticalSummary": "Short interpretation or strategic insight",
  "dataPoints": {
    "totalRecords": 0,
    "relevanceScore": "high|medium|low"
  },
  "chart": {
    "type": "bar" | "line" | "pie" | "area",
    "title": "Chart Title",
    "xAxisLabel": "X Axis Label",
    "yAxisLabel": "Y Axis Label",
    "data": [
      { "name": "Category A", "value": 120 },
      { "name": "Category B", "value": 200 }
    ],
    "description": "Brief analysis of what the chart reveals"
  }
}
\`\`\`

## Chart Generation Rules

1. **When to include charts**: Generate a chart when:
   - User asks for comparisons, trends, or distributions
   - Data contains numeric values that can be visualized
   - User explicitly requests a "chart", "graph", "diagram", or "visualization"
   - Question involves terms like "compare", "trend", "over time", "breakdown", "distribution"

2. **Chart type selection**:
   - **bar**: Comparisons across categories (sales by region, revenue by product)
   - **line**: Trends over time or sequential data
   - **pie**: Percentage distributions or parts of a whole
   - **area**: Cumulative trends or volume over time

3. **Chart data format**:
   - Extract actual numeric values from the context
   - Each data point must have "name" (string) and "value" (number)
   - Limit to 5-10 data points for readability
   - Use meaningful, short names for categories

4. **If no chart is appropriate**: Omit the "chart" field entirely (don't include it)

## Strict Rules

1. **Use ONLY the provided context** - Never fabricate or use outside knowledge
2. **Organize by importance** - Present most critical insights first
3. **Extract structured data** - Convert raw text into categorized sections
4. **Provide insights, not summaries** - Interpret what the data means
5. **Be concise** - Each insight should be executive-level (suitable for C-suite)
6. **Never raw-dump documents** - Synthesize retrieved information into analysis
7. **Meta-information** - Include data reliability indicators
8. **Generate accurate charts** - Only create charts when you have real numeric data from context

## Section Examples

For product queries, create sections like:
- "Key Specifications"
- "Performance Metrics"
- "Technical Details"
- "Category Information"

For financial queries, create sections like:
- "Revenue Analysis"
- "Growth Metrics"
- "Comparative Performance"
- "Trend Analysis"

For any query, adapt section names to the domain.

## Response Quality Checklist

✓ Insights are actionable
✓ Supporting details are verified from context
✓ No speculation beyond the provided documents
✓ Language is professional and analytical
✓ Format is valid JSON
✓ All three main components (keyInsight, sections, analyticalSummary) are present
✓ Chart data is accurate and extracted from context (if included)
✓ Chart type matches the data and question

## Context will follow:

You will receive retrieved documents prefixed with "RETRIEVED CONTEXT:" - use ONLY that content.`;

/**
 * Parse LLM response into structured insight
 */
export interface InsightResponse {
  type: "insight" | "error";
  keyInsight: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
  analyticalSummary: string;
  dataPoints: {
    totalRecords: number;
    relevanceScore: "high" | "medium" | "low";
  };
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'area';
    title: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    data: Array<{
      name: string;
      value: number;
      [key: string]: any;
    }>;
    description?: string;
  };
}

/**
 * Fallback insight response for errors or malformed LLM output.
 * Tries to salvage whatever it can from the raw text.
 */
export function createFallbackInsight(rawText: string, contextSnippet?: string): InsightResponse {
  // Basic extraction: try to find the first paragraph or the text itself
  const displayInsight = rawText.split('\n').filter(l => l.trim().length > 10)[0] || "I found relevant information in your documents.";

  // Extract potential list items (lines starting with dash, bullet, or number)
  const items = rawText
    .split('\n')
    .filter(line => /^[\s]*[-•*0-9]/.test(line.trim()))
    .map(line => line.trim().replace(/^[\s]*[-•*0-9.]+\s*/, ''))
    .filter(line => line.length > 5)
    .slice(0, 10);

  return {
    type: "insight",
    keyInsight: displayInsight.substring(0, 300),
    sections: [
      {
        title: "Retrieved Details",
        items: items.length > 0 ? items : [
          "I was able to find document matches but had trouble formatting the full analysis.",
          "Click to see raw documents or try rephrasing for a chart."
        ],
      },
      {
        title: "System Note",
        items: ["Response generated via local fallback due to formatting issues."]
      }
    ],
    analyticalSummary: "This is a simplified response because the detailed data format could not be processed locally.",
    dataPoints: {
      totalRecords: 1,
      relevanceScore: "medium",
    },
  };
}

/**
 * Validate and clean insight response
 */
export function validateInsight(response: any): InsightResponse {
  if (!response || typeof response !== "object") {
    return createFallbackInsight("Invalid response format");
  }

  return {
    type: response.type || "insight",
    keyInsight: (response.keyInsight || "").substring(0, 500),
    sections: Array.isArray(response.sections)
      ? response.sections.map((s: any) => ({
        title: (s.title || "Details").substring(0, 200),
        items: Array.isArray(s.items)
          ? s.items.map((i: any) => String(i).substring(0, 300))
          : [],
      }))
      : [],
    analyticalSummary: (response.analyticalSummary || "").substring(0, 500),
    dataPoints: {
      totalRecords:
        typeof response.dataPoints?.totalRecords === "number"
          ? response.dataPoints.totalRecords
          : 0,
      relevanceScore:
        response.dataPoints?.relevanceScore || ("medium" as const),
    },
  };
}

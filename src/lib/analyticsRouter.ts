import { generateLLMResponse } from './llmFallback';
import { INSIGHT_SYSTEM_PROMPT, validateInsight, createFallbackInsight, InsightResponse } from './insight-prompt';

export interface RouterResponse {
    type: 'text' | 'analytics' | 'chart';
    data: any;
    message?: string;
}

/**
 * Fast local intent detection using keyword matching
 * This avoids unnecessary LLM calls and improves reliability
 */
function detectIntentLocally(question: string): 'text' | 'analytics' | 'chart' {
    const lowerQ = question.toLowerCase();

    // Chart keywords - explicit visualization requests
    const chartKeywords = ['chart', 'graph', 'plot', 'visualize', 'visualization', 'diagram', 'show me a bar', 'show me a line', 'show me a pie'];
    if (chartKeywords.some(kw => lowerQ.includes(kw))) {
        return 'chart';
    }

    // Analytics keywords - data analysis requests (expanded to catch more queries)
    const analyticsKeywords = [
        'what', 'which', 'who', 'when', 'where', 'how',
        'total', 'sum', 'average', 'avg', 'mean', 'median',
        'highest', 'lowest', 'max', 'min', 'maximum', 'minimum',
        'top ', 'bottom', 'compare', 'comparison', 'trend', 'growth',
        'revenue', 'sales', 'profit', 'count', 'how many', 'how much',
        'breakdown', 'distribution', 'by region', 'by product', 'by category',
        'calculate', 'analyze', 'analysis', 'speed', 'capacity', 'specification',
        'tell me', 'show me', 'give me', 'list', 'find'
    ];
    if (analyticsKeywords.some(kw => lowerQ.includes(kw))) {
        return 'analytics';
    }

    // Default to analytics for most queries (better safe than sorry)
    return 'analytics';
}

/**
 * Analyzes the user query and routes it to the appropriate generation logic
 */
export async function analyticsRouter(
    question: string,
    retrievedContext: string,
    recordCount: number
): Promise<RouterResponse> {
    try {
        // 1. Fast local intent detection (no LLM call needed)
        const intent = detectIntentLocally(question);
        console.log(`[Analytics Router] Detected intent: ${intent}`);

        // 2. Always use the insight engine for better structured responses
        // The insight engine is smart enough to handle both simple and complex queries
        const analyticalPrompt = `${INSIGHT_SYSTEM_PROMPT}\n\nUser Question: ${question}\n\nRETRIEVED CONTEXT:\n${retrievedContext}\n\nBased ONLY on the retrieved context above, provide a structured analytical insight response.`;
        const result = await generateLLMResponse(analyticalPrompt);

        // Parse the insight response
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // If JSON parsing fails, return the raw text
            return {
                type: 'text',
                data: { text: result.text },
                message: "Generated response but failed to format as JSON."
            };
        }

        const parsedInsight = JSON.parse(jsonMatch[0]);
        const validatedInsight = validateInsight(parsedInsight);

        // Add record count
        validatedInsight.dataPoints.totalRecords = recordCount;

        // Final routing decision based on whether a chart was actually produced
        if (intent === 'chart' && parsedInsight.chart) {
            return {
                type: 'chart',
                data: {
                    ...validatedInsight,
                    chart: parsedInsight.chart
                },
                message: "Chart and data insights generated."
            };
        }

        return {
            type: 'analytics',
            data: validatedInsight,
            message: "Analytical insights generated."
        };

    } catch (error: any) {
        console.error("[Analytics Router] Error routing request:", error);

        // --- LOCAL INTELLIGENCE FALLBACK ---
        try {
            const { extractNumericDataFromContext, suggestChartType } = await import('./chart-debug');
            const numericData = extractNumericDataFromContext(retrievedContext);
            const chartType = suggestChartType(question, numericData.length);

            const localInsight: InsightResponse = {
                type: "insight",
                keyInsight: `[Local Intelligence Mode] Based on your documents, I found ${recordCount} relevant records. Note: AI interpretation is currently limited as all LLM providers are unavailable.`,
                sections: [
                    {
                        title: "Extracted Data points",
                        items: retrievedContext.split('\n').filter(l => l.includes(':')).slice(0, 5)
                    },
                    {
                        title: "System Status",
                        items: ["All LLM Providers Unavailable: Using local heuristic extraction.", "Charts generated from raw value mapping."]
                    }
                ],
                analyticalSummary: "This analysis was generated locally using statistical extraction because all LLM providers are unavailable.",
                dataPoints: {
                    totalRecords: recordCount,
                    relevanceScore: "medium"
                },
                chart: numericData.length >= 2 ? {
                    type: chartType || 'bar',
                    title: `Extracted Data: ${question}`,
                    data: numericData,
                    description: "Diagram generated via local heuristic extraction."
                } : undefined
            };

            return {
                type: numericData.length >= 2 ? 'chart' : 'analytics',
                data: localInsight,
                message: "Generated via Local Intelligence fallback due to provider failure."
            };
        } catch (localError) {
            console.error("[Analytics Router] Local fallback failed too:", localError);
            return {
                type: 'text',
                data: { text: "I encountered a critical error while analyzing your data. Please try again later." },
                message: `Critical Error: ${error.message}`
            };
        }
    }
}

/**
 * Specialized generator for analytics (can be expanded later)
 */
export async function generateAnalyticalResponse(query: string, context: string) {
    // Currently handled within the main router for simplicity, but can be extracted
    return analyticsRouter(query, context, 0);
}

/**
 * Specialized generator for graph data
 */
export async function generateGraphData(query: string, context: string) {
    // Currently handled within the main router for simplicity, but can be extracted
    return analyticsRouter(query, context, 0);
}

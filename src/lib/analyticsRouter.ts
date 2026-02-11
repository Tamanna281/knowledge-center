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
        const analyticalPrompt = `${INSIGHT_SYSTEM_PROMPT}\n\nUser Question: ${question}\n\nRETRIEVED CONTEXT:\n${retrievedContext}\n\nBased ONLY on the retrieved context above, provide a structured analytical insight response.`;
        const result = await generateLLMResponse(analyticalPrompt);

        // Parse the insight response with robust error handling
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        let parsedInsight;

        try {
            if (!jsonMatch) throw new Error("No JSON found");
            parsedInsight = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.warn("[Analytics Router] JSON Parse failed, attempting smart repair...", parseError);

            try {
                let salvagedText = jsonMatch ? jsonMatch[0] : result.text;

                // --- SMART REPAIR ENGINE ---
                // 1. Remove trailing junk text after the last potential JSON closing
                salvagedText = salvagedText.replace(/\n[^\{\}\[\]]*$/, '');

                // 2. Fix unclosed arrays and objects by counting and appending
                const stack: string[] = [];
                for (let i = 0; i < salvagedText.length; i++) {
                    const char = salvagedText[i];
                    if (char === '{') stack.push('}');
                    else if (char === '[') stack.push(']');
                    else if (char === '}' || char === ']') {
                        if (stack.length > 0 && stack[stack.length - 1] === char) {
                            stack.pop();
                        }
                    }
                }

                // Append missing closings in reverse order
                if (stack.length > 0) {
                    salvagedText += stack.reverse().join('');
                }

                parsedInsight = JSON.parse(salvagedText);
                console.log("[Analytics Router] Successfully salvaged JSON!");
            } catch (salvageError) {
                console.error("[Analytics Router] JSON Salvage failed. Falling back to local intelligence.");
                // IF SALVAGE FAILS: We manually build a safe response from the raw text
                parsedInsight = createFallbackInsight(result.text, retrievedContext);
            }
        }

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

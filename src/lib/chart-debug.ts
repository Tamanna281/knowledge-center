/**
 * Chart Generation Debug Utility
 * 
 * This file helps debug chart generation by logging
 * the AI response and chart data structure
 */

export function logChartDebugInfo(response: any, context: string = '') {
    console.group('🎨 Chart Generation Debug Info');

    console.log('Context:', context);
    console.log('Full Response:', JSON.stringify(response, null, 2));

    if (response?.chart) {
        console.log('✅ Chart Data Found:');
        console.log('  Type:', response.chart.type);
        console.log('  Title:', response.chart.title);
        console.log('  Data Points:', response.chart.data?.length || 0);
        console.log('  Data:', response.chart.data);
    } else {
        console.log('❌ No chart data in response');
    }

    console.groupEnd();
}

export function validateChartData(chart: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!chart) {
        return { valid: false, errors: ['Chart data is null or undefined'] };
    }

    // Check required fields
    if (!chart.type || !['bar', 'line', 'pie', 'area'].includes(chart.type)) {
        errors.push(`Invalid chart type: ${chart.type}`);
    }

    if (!chart.title || typeof chart.title !== 'string') {
        errors.push('Chart title is missing or invalid');
    }

    if (!Array.isArray(chart.data)) {
        errors.push('Chart data must be an array');
    } else if (chart.data.length === 0) {
        errors.push('Chart data array is empty');
    } else {
        // Validate data points
        chart.data.forEach((point: any, index: number) => {
            if (!point.name) {
                errors.push(`Data point ${index} missing 'name' field`);
            }
            if (typeof point.value !== 'number') {
                errors.push(`Data point ${index} 'value' must be a number (got: ${typeof point.value})`);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function extractNumericDataFromContext(context: string): Array<{ name: string, value: number }> {
    const data: Array<{ name: string, value: number }> = [];

    // Simple extraction of "name: value" patterns
    const patterns = [
        /([A-Za-z\s-]+):\s*\$?([\d,]+\.?\d*)/g,
        /([A-Za-z\s-]+)\s*[-–]\s*\$?([\d,]+\.?\d*)/g,
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(context)) !== null) {
            const name = match[1].trim();
            const valueStr = match[2].replace(/,/g, '');
            const value = parseFloat(valueStr);

            if (!isNaN(value) && name.length > 0 && name.length < 50) {
                data.push({ name, value });
            }
        }
    }

    return data.slice(0, 10); // Limit to 10 points
}

export function suggestChartType(question: string, dataPoints: number): 'bar' | 'line' | 'pie' | 'area' | null {
    const lowerQuestion = question.toLowerCase();

    // Explicit chart type requests
    if (lowerQuestion.includes('pie chart')) return 'pie';
    if (lowerQuestion.includes('bar chart')) return 'bar';
    if (lowerQuestion.includes('line chart') || lowerQuestion.includes('trend')) return 'line';
    if (lowerQuestion.includes('area chart')) return 'area';

    // Infer from question context
    if (lowerQuestion.includes('distribution') || lowerQuestion.includes('percentage') || lowerQuestion.includes('share')) {
        return 'pie';
    }

    if (lowerQuestion.includes('trend') || lowerQuestion.includes('over time') || lowerQuestion.includes('progression')) {
        return 'line';
    }

    if (lowerQuestion.includes('compare') || lowerQuestion.includes('comparison') || lowerQuestion.includes('vs')) {
        return 'bar';
    }

    if (lowerQuestion.includes('growth') || lowerQuestion.includes('cumulative')) {
        return 'area';
    }

    // Default based on data points
    if (dataPoints <= 5) {
        return 'pie'; // Good for small categories
    } else if (dataPoints <= 10) {
        return 'bar'; // Good for comparisons
    }

    return null;
}

/**
 * Example usage in your API route:
 * 
 * import { logChartDebugInfo, validateChartData } from '@/lib/chart-debug';
 * 
 * // After getting insight response
 * logChartDebugInfo(insight, question);
 * 
 * if (insight.chart) {
 *   const validation = validateChartData(insight.chart);
 *   if (!validation.valid) {
 *     console.error('Chart validation errors:', validation.errors);
 *   }
 * }
 */

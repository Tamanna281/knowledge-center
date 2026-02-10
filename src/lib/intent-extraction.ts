// src/lib/intent-extraction.ts
import { z } from 'zod';

// ============ ALLOWED VALUES ============

export const ALLOWED_TABLES = ['sales', 'orders', 'products', 'customers'] as const;
export const ALLOWED_AGGREGATIONS = ['sum', 'avg', 'max', 'min', 'count'] as const;
export const ALLOWED_GROUP_BY_FIELDS = ['product', 'region', 'date', 'customer', 'category'] as const;

// Metric constraints per table
export const TABLE_METRICS = {
    sales: ['quantity', 'revenue', 'price'],
    orders: ['total_amount', 'order_count'],
    products: ['price'],
    customers: ['customer_count'],
} as const;

// ============ ZOD SCHEMAS ============

// Filter value can be string, number, or array
const FilterValueSchema = z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
]);

// Filters object with dynamic keys
const FiltersSchema = z.record(z.string(), FilterValueSchema).nullable();

// Supported intent schema
export const IntentSchema = z.object({
    table: z.enum(ALLOWED_TABLES),
    aggregation: z.enum(ALLOWED_AGGREGATIONS),
    metric: z.string(),
    group_by: z.enum(ALLOWED_GROUP_BY_FIELDS).nullable(),
    filters: FiltersSchema,
    sort_by: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    limit: z.number().int().positive().optional(),
});

// Unsupported intent schema
export const UnsupportedIntentSchema = z.object({
    unsupported: z.literal(true),
});

// Combined schema - either supported or unsupported
export const ExtractedIntentSchema = z.union([
    IntentSchema,
    UnsupportedIntentSchema,
]);

// ============ TYPES ============

export type TableName = (typeof ALLOWED_TABLES)[number];
export type Aggregation = (typeof ALLOWED_AGGREGATIONS)[number];
export type GroupByField = (typeof ALLOWED_GROUP_BY_FIELDS)[number];
export type Intent = z.infer<typeof IntentSchema>;
export type UnsupportedIntent = z.infer<typeof UnsupportedIntentSchema>;
export type ExtractedIntent = z.infer<typeof ExtractedIntentSchema>;

// ============ VALIDATION HELPERS ============

/**
 * Validates that the metric is allowed for the given table
 */
export function validateMetricForTable(table: TableName, metric: string): boolean {
    const metrics = TABLE_METRICS[table] as readonly string[];
    return metrics.includes(metric);
}

/**
 * Validates the full extracted intent with business rules
 */
export function validateIntent(intent: ExtractedIntent): {
    valid: boolean;
    error?: string;
    intent?: Intent;
} {
    // If unsupported, it's valid as-is
    if ('unsupported' in intent && intent.unsupported) {
        return { valid: true };
    }

    // Validate Zod schema first
    const parsed = IntentSchema.safeParse(intent);
    if (!parsed.success) {
        return {
            valid: false,
            error: `Schema validation failed: ${parsed.error.message}`
        };
    }

    const validIntent = parsed.data;

    // Validate metric against table
    if (!validateMetricForTable(validIntent.table, validIntent.metric)) {
        return {
            valid: false,
            error: `Metric '${validIntent.metric}' is not allowed for table '${validIntent.table}'. ` +
                `Allowed metrics: ${TABLE_METRICS[validIntent.table].join(', ')}`
        };
    }

    return { valid: true, intent: validIntent };
}

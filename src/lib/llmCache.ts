/**
 * Simple in-memory cache for LLM responses
 * Helps speed up repeated queries and reduce API costs
 */

import crypto from 'crypto';

interface CacheEntry {
    text: string;
    provider: string;
    model: string;
    timestamp: string;
    expiresAt: number;
}

class LLMCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number = 100; // Maximum number of cached entries
    private ttlMs: number = 1000 * 60 * 30; // 30 minutes TTL

    /**
     * Generate a cache key from the prompt
     */
    private generateKey(prompt: string): string {
        return crypto.createHash('md5').update(prompt.trim().toLowerCase()).digest('hex');
    }

    /**
     * Get cached response if available and not expired
     */
    get(prompt: string): CacheEntry | null {
        const key = this.generateKey(prompt);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        console.log(`✓ Cache hit for question: "${prompt.substring(0, 60)}..."`);
        return entry;
    }

    /**
     * Store a response in the cache
     */
    set(prompt: string, response: CacheEntry): void {
        const key = this.generateKey(prompt);

        // If cache is full, remove oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        // Add expiration time
        const entryWithExpiry = {
            ...response,
            expiresAt: Date.now() + this.ttlMs,
        };

        this.cache.set(key, entryWithExpiry);
    }

    /**
     * Clear all cached entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; maxSize: number; ttlMinutes: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlMinutes: this.ttlMs / (1000 * 60),
        };
    }

    /**
     * Remove expired entries
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Singleton instance
export const llmCache = new LLMCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
    llmCache.cleanup();
}, 1000 * 60 * 10);

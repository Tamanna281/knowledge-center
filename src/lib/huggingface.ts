import axios from 'axios';

/**
 * Hugging Face Inference API Client
 * Used for calling Sarvam-M, Perplexity Embeddings, or other HF models
 */

const HF_MODEL = process.env.HF_MODEL || 'sarvamai/sarvam-m';
const HF_EMBED_MODEL = process.env.HF_EMBED_MODEL || 'perplexity-ai/pplx-embed-v1-0.6b';
const HF_TOKEN = process.env.HF_Tokens;

export interface HFConfig {
    model?: string;
    temperature?: number;
    maxNewTokens?: number;
}

/**
 * Generate content using Hugging Face Inference API (Text Generation)
 */
export async function generateWithHuggingFace(
    prompt: string,
    config: HFConfig = {}
): Promise<string> {
    const {
        model = HF_MODEL,
        temperature = 0.1,
        maxNewTokens = 1024,
    } = config;

    if (!HF_TOKEN) {
        throw new Error('HF_Tokens not found in environment variables');
    }

    try {
        console.log(`[HuggingFace] Calling generation model: ${model}`);

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                inputs: prompt,
                parameters: {
                    max_new_tokens: maxNewTokens,
                    temperature: temperature,
                    return_full_text: false,
                    do_sample: temperature > 0,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 45000,
            }
        );

        let text = '';
        if (Array.isArray(response.data)) {
            text = response.data[0]?.generated_text || '';
        } else if (response.data?.generated_text) {
            text = response.data.generated_text;
        } else if (typeof response.data === 'string') {
            text = response.data;
        }

        if (!text) {
            console.error('[HuggingFace] Response data:', JSON.stringify(response.data));
            throw new Error('No text content in Hugging Face response');
        }

        return text.trim();
    } catch (error: any) {
        handleHFError(error);
        return ''; // Unreachable
    }
}

/**
 * Generate text embeddings using Hugging Face Inference API (Feature Extraction)
 * Optimized for models like perplexity-ai/pplx-embed-v1-0.6b
 */
export async function generateHuggingFaceEmbeddings(
    text: string | string[],
    model: string = HF_EMBED_MODEL
): Promise<number[][]> {
    if (!HF_TOKEN) {
        throw new Error('HF_Tokens not found in environment variables');
    }

    try {
        console.log(`[HuggingFace] Calling embedding model: ${model}`);

        const response = await axios.post(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                inputs: text,
            },
            {
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        if (Array.isArray(response.data)) {
            if (Array.isArray(response.data[0])) {
                return response.data;
            } else if (typeof response.data[0] === 'number') {
                return [response.data];
            }
        }

        console.error('[HuggingFace] Embedding response data format unknown:', typeof response.data);
        throw new Error('Unexpected response format from embedding model');
    } catch (error: any) {
        handleHFError(error);
        return []; // Unreachable
    }
}

/**
 * Centralized error handler for HF API
 */
function handleHFError(error: any): never {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error.message;

    console.error(`[HuggingFace] API Error - Status: ${status}, Message: ${message}`);

    if (status === 503) {
        const estimatedTime = error?.response?.data?.estimated_time || 20;
        throw new Error(`Hugging Face model is loading. Estimated time: ${estimatedTime}s. Please retry.`);
    }

    if (status === 429) {
        throw new Error('Hugging Face rate limit exceeded.');
    }

    throw new Error(`Hugging Face error: ${message}`);
}

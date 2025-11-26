import crypto from 'crypto';
import type { z } from 'zod';

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  lastAccessedAt: number;
}

interface CacheOptions {
  maxSize?: number;
  ttlMs?: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export class ExtractionCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options?: CacheOptions) {
    this.cache = new Map();
    this.maxSize = options?.maxSize || DEFAULT_MAX_SIZE;
    this.ttlMs = options?.ttlMs || DEFAULT_TTL_MS;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    const isExpired = now - entry.createdAt > this.ttlMs;

    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    entry.lastAccessedAt = now;
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      lastAccessedAt: now,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

export interface CacheKeyInput {
  text: string | string[];
  schema: z.ZodTypeAny;
  modelName: string;
  context?: Record<string, any>;
}

export function generateCacheKey(input: CacheKeyInput): string {
  const textStr = Array.isArray(input.text) ? input.text.join('\n') : input.text;

  const schemaStr = JSON.stringify(input.schema._def);

  const contextStr = input.context ? JSON.stringify(input.context) : '';

  const combined = `${textStr}|${schemaStr}|${input.modelName}|${contextStr}`;

  return crypto.createHash('sha256').update(combined).digest('hex');
}

let cacheInstance: ExtractionCache | undefined;

export function getCache(): ExtractionCache {
  if (!cacheInstance) {
    cacheInstance = new ExtractionCache();
  }
  return cacheInstance;
}

export function clearCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
}
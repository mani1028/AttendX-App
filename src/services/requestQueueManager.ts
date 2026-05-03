import AsyncStorage from '@react-native-async-storage/async-storage';

interface PendingRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  params?: any;
  timestamp: number;
  retries: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const QUEUE_STORAGE_KEY = 'offline_request_queue';
const CACHE_STORAGE_KEY = 'api_response_cache';
const MAX_RETRIES = 3;
const CACHE_TTL_DEFAULT = 5 * 60 * 1000; // 5 minutes

class RequestQueueManager {
  private queue: PendingRequest[] = [];
  private requestDedup: Map<string, Promise<any>> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private isProcessing = false;

  constructor() {
    this.loadQueueFromStorage();
    this.loadCacheFromStorage();
  }

  /**
   * Generate a unique ID for a request for deduplication
   */
  private getRequestId(method: string, url: string, data?: any): string {
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  /**
   * Check if response is cached and valid
   */
  getCachedResponse(method: string, url: string): any | null {
    if (method !== 'GET') return null; // Only cache GET requests

    const key = `${method}:${url}`;
    const cached = this.cache.get(key);

    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache] Hit: ${key}`);
    return cached.data;
  }

  /**
   * Cache a successful response
   */
  setCacheResponse(method: string, url: string, data: any, ttl: number = CACHE_TTL_DEFAULT): void {
    if (method !== 'GET') return; // Only cache GET requests

    const key = `${method}:${url}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    this.saveCacheToStorage();
  }

  /**
   * Clear cache for a specific pattern or all
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
    this.saveCacheToStorage();
  }

  /**
   * Get or execute a request with deduplication
   */
  async executeWithDedup<T>(
    method: string,
    url: string,
    executeFn: () => Promise<T>,
    data?: any,
  ): Promise<T> {
    const requestId = this.getRequestId(method, url, data);

    // Return existing promise if request is already in flight
    const existing = this.requestDedup.get(requestId);
    if (existing) {
      console.log(`[Dedup] Returning existing request: ${requestId}`);
      return existing;
    }

    // Execute and store promise
    const promise = executeFn()
      .then((result) => {
        this.requestDedup.delete(requestId);
        return result;
      })
      .catch((error) => {
        this.requestDedup.delete(requestId);
        throw error;
      });

    this.requestDedup.set(requestId, promise);
    return promise;
  }

  /**
   * Add request to offline queue
   */
  async addToQueue(method: string, url: string, data?: any, params?: any): Promise<void> {
    const request: PendingRequest = {
      id: `${Date.now()}_${Math.random()}`,
      method,
      url,
      data,
      params,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(request);
    await this.saveQueueToStorage();
    console.log(`[Queue] Added: ${method} ${url} (${this.queue.length} total)`);
  }

  /**
   * Get all pending requests
   */
  getQueue(): PendingRequest[] {
    return [...this.queue];
  }

  /**
   * Remove request from queue
   */
  async removeFromQueue(requestId: string): Promise<void> {
    this.queue = this.queue.filter((r) => r.id !== requestId);
    await this.saveQueueToStorage();
  }

  /**
   * Update retries for a request
   */
  async updateRetries(requestId: string, retries: number): Promise<void> {
    const request = this.queue.find((r) => r.id === requestId);
    if (request) {
      request.retries = retries;
      await this.saveQueueToStorage();
    }
  }

  /**
   * Clear all pending requests
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueueToStorage();
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[Queue] Failed to save to storage:', error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[Queue] Loaded ${this.queue.length} pending requests`);
      }
    } catch (error) {
      console.error('[Queue] Failed to load from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.entries());
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.error('[Cache] Failed to save to storage:', error);
    }
  }

  /**
   * Load cache from AsyncStorage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const cacheArray = JSON.parse(stored);
        this.cache = new Map(cacheArray);
        console.log(`[Cache] Loaded ${this.cache.size} cached entries`);
      }
    } catch (error) {
      console.error('[Cache] Failed to load from storage:', error);
      this.cache = new Map();
    }
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      cacheSize: this.cache.size,
      isProcessing: this.isProcessing,
    };
  }
}

export const requestQueueManager = new RequestQueueManager();
export default requestQueueManager;

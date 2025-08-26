/**
 * QueryDeduplicator - Prevents duplicate API requests by caching in-flight promises
 * 
 * This utility ensures that multiple components requesting the same data
 * will share a single API call rather than making duplicate requests.
 */

export class QueryDeduplicator {
  private static instance: QueryDeduplicator;
  private pendingQueries = new Map<string, Promise<any>>();
  private queryTimestamps = new Map<string, number>();
  
  // TTL for deduplication (5 seconds) - prevents stale requests from being reused
  private readonly DEDUPLICATION_TTL = 5000;

  static getInstance(): QueryDeduplicator {
    if (!QueryDeduplicator.instance) {
      QueryDeduplicator.instance = new QueryDeduplicator();
    }
    return QueryDeduplicator.instance;
  }

  /**
   * Deduplicate a query by key. If the same query is already in flight,
   * return the existing promise. Otherwise, execute the query function.
   */
  async deduplicate<T>(key: string, queryFn: () => Promise<T>): Promise<T> {
    // Clean up expired entries
    this.cleanupExpired();

    // Check if we already have this query in flight
    if (this.pendingQueries.has(key)) {
      const timestamp = this.queryTimestamps.get(key) || 0;
      const age = Date.now() - timestamp;
      
      // If the query is still fresh, return the existing promise
      if (age < this.DEDUPLICATION_TTL) {
        console.debug(`[QueryDeduplicator] Reusing in-flight query: ${key}`);
        return this.pendingQueries.get(key) as Promise<T>;
      } else {
        // Query is too old, remove it
        this.pendingQueries.delete(key);
        this.queryTimestamps.delete(key);
      }
    }

    // Execute the query and cache the promise
    console.debug(`[QueryDeduplicator] Executing new query: ${key}`);
    const promise = queryFn();
    
    this.pendingQueries.set(key, promise);
    this.queryTimestamps.set(key, Date.now());

    // Clean up when the promise resolves or rejects
    promise.finally(() => {
      // Use a small delay to allow other components to potentially reuse the result
      setTimeout(() => {
        this.pendingQueries.delete(key);
        this.queryTimestamps.delete(key);
      }, 100);
    });

    return promise;
  }

  /**
   * Generate a cache key from query parameters
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort();
    const keyParts = sortedKeys.map(key => {
      const value = params[key];
      if (value === null || value === undefined) {
        return `${key}:null`;
      }
      if (typeof value === 'object') {
        // For objects like geometries or date ranges, create a stable string representation
        return `${key}:${JSON.stringify(value)}`;
      }
      return `${key}:${value}`;
    });
    
    return `${prefix}:${keyParts.join('|')}`;
  }

  /**
   * Generate a geometry-based cache key
   */
  static generateGeometryKey(prefix: string, geometry: __esri.Geometry | null, additionalParams: Record<string, any> = {}): string {
    let geometryHash = 'null';
    
    if (geometry && geometry.extent && geometry.extent.xmin !== undefined) {
      // Create a hash based on geometry extent for consistent caching
      const extent = geometry.extent;
      geometryHash = `${extent.xmin.toFixed(6)},${extent.ymin.toFixed(6)},${extent.xmax.toFixed(6)},${extent.ymax.toFixed(6)}`;
    }
    
    return this.generateKey(prefix, {
      geometry: geometryHash,
      ...additionalParams
    });
  }

  /**
   * Clear all cached queries (useful for testing or manual cache invalidation)
   */
  clearAll(): void {
    this.pendingQueries.clear();
    this.queryTimestamps.clear();
  }

  /**
   * Get current cache statistics
   */
  getStats(): { pendingQueries: number; oldestQuery: number | null } {
    const now = Date.now();
    let oldestQuery: number | null = null;
    
    for (const timestamp of this.queryTimestamps.values()) {
      const age = now - timestamp;
      if (oldestQuery === null || age > oldestQuery) {
        oldestQuery = age;
      }
    }
    
    return {
      pendingQueries: this.pendingQueries.size,
      oldestQuery
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, timestamp] of this.queryTimestamps.entries()) {
      if (now - timestamp > this.DEDUPLICATION_TTL) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.pendingQueries.delete(key);
      this.queryTimestamps.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.debug(`[QueryDeduplicator] Cleaned up ${expiredKeys.length} expired queries`);
    }
  }
}

// Export singleton instance for convenience
export const queryDeduplicator = QueryDeduplicator.getInstance();

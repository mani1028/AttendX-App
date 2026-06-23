import API from './api';
import { requestQueueManager } from './requestQueueManager';
import { isOnline } from '../hooks/useNetworkState';
import eventEmitter from '../utils/eventEmitter';

class OfflineQueueSync {
  private isSyncing = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start monitoring network and sync when online
   */
  startMonitoring(): void {
    // Initial check
    this.checkAndSync();

    // Check periodically every 30 seconds
    this.syncInterval = setInterval(() => {
      this.checkAndSync();
    }, 30000);

    // Also sync when app comes to foreground
    eventEmitter.on('app-foreground', () => {
      this.checkAndSync();
    });

    console.log('[OfflineSync] Started monitoring');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[OfflineSync] Stopped monitoring');
  }

  /**
   * Check if online and sync queued requests
   */
  private async checkAndSync(): Promise<void> {
    if (!isOnline()) {
      console.log('[OfflineSync] Offline - skipping sync');
      return;
    }

    const queue = requestQueueManager.getQueue();
    if (queue.length === 0) {
      return;
    }

    await this.syncQueue();
  }

  /**
   * Process all queued requests
   */
  async syncQueue(): Promise<void> {
    if (this.isSyncing) {
      console.log('[OfflineSync] Already syncing, skipping...');
      return;
    }

    this.isSyncing = true;
    const queue = requestQueueManager.getQueue();

    console.log(`[OfflineSync] Starting sync of ${queue.length} requests`);

    for (const request of queue) {
      try {
        if (!isOnline()) {
          console.log('[OfflineSync] Lost connection, stopping sync');
          break;
        }

        await this.processRequest(request);
        await requestQueueManager.removeFromQueue(request.id);
      } catch (error) {
        console.error(`[OfflineSync] Failed to sync request ${request.id}:`, error);

        // Update retry count
        const newRetries = request.retries + 1;
        await requestQueueManager.updateRetries(request.id, newRetries);

        // Remove after max retries
        if (newRetries >= 3) {
          console.log(`[OfflineSync] Max retries reached for ${request.id}, removing from queue`);
          await requestQueueManager.removeFromQueue(request.id);
        }
      }
    }

    this.isSyncing = false;
    console.log('[OfflineSync] Sync complete');
  }

  /**
   * Process a single request
   */
  private async processRequest(request: any): Promise<any> {
    console.log(`[OfflineSync] Processing: ${request.method} ${request.url} (retry ${request.retries})`);

    const config: any = {
      method: request.method.toLowerCase(),
      url: request.url,
    };

    if (request.data) {
      config.data = request.data;
    }

    if (request.params) {
      config.params = request.params;
    }

    const response = await API(config);
    return response.data;
  }

  /**
   * Get sync stats
   */
  getStats() {
    const queue = requestQueueManager.getQueue();
    return {
      isOnline: isOnline(),
      isSyncing: this.isSyncing,
      queuedRequests: queue.length,
      oldestRequest: queue.length > 0 ? new Date(queue[0].timestamp) : null,
      ...requestQueueManager.getStats(),
    };
  }
}

export const offlineQueueSync = new OfflineQueueSync();
export default offlineQueueSync;

// BullMQ Types

export interface RedisInstance {
  name: string;
  host: string;
  port: number;
  password?: string;
}

export interface QueueStats {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  // Calculated metrics
  totalJobs: number;
  failureRate: number;
  isPaused: boolean;
}

export interface QueueJob {
  id: string;
  name: string;
  data: unknown;
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
}

export interface BullMQOverview {
  instance: string;
  connected: boolean;
  queues: QueueStats[];
  totalQueues: number;
  totalJobs: number;
  totalFailed: number;
  totalActive: number;
  error?: string;
}

export interface BullMQApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface QueueJobsResponse {
  queue: string;
  instance: string;
  jobs: QueueJob[];
  total: number;
  status: string;
}

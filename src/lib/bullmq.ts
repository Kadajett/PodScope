import Redis from "ioredis";
import type { BullMQOverview, QueueJob, QueueStats, RedisInstance } from "@/types/bullmq";

// Parse Redis instances from env
export function getRedisInstances(): RedisInstance[] {
  const instancesStr = process.env.REDIS_INSTANCES || "";
  if (!instancesStr) return [];

  return instancesStr.split(",").map((instance) => {
    const parts = instance.trim().split(":");
    return {
      name: parts[0] || "default",
      host: parts[1] || "localhost",
      port: parseInt(parts[2] || "6379", 10),
      password: parts[3] || undefined,
    };
  });
}

// Create Redis client with timeout
function createRedisClient(instance: RedisInstance): Redis {
  return new Redis({
    host: instance.host,
    port: instance.port,
    password: instance.password,
    connectTimeout: 5000,
    commandTimeout: 10000,
    lazyConnect: true,
    retryStrategy: () => null, // Don't retry on failure
  });
}

// Discover all BullMQ queues in a Redis instance
export async function discoverQueues(instance: RedisInstance): Promise<string[]> {
  const client = createRedisClient(instance);

  try {
    await client.connect();

    // BullMQ uses keys like "bull:<queueName>:id"
    // Scan for queue patterns
    const queues = new Set<string>();

    let cursor = "0";
    do {
      const [newCursor, keys] = await client.scan(cursor, "MATCH", "bull:*:id", "COUNT", 100);
      cursor = newCursor;

      keys.forEach((key) => {
        // Extract queue name from "bull:<queueName>:id"
        const match = key.match(/^bull:([^:]+):id$/);
        if (match) {
          queues.add(match[1]);
        }
      });
    } while (cursor !== "0");

    return Array.from(queues).sort();
  } finally {
    client.disconnect();
  }
}

// Get stats for a specific queue
export async function getQueueStats(
  instance: RedisInstance,
  queueName: string
): Promise<QueueStats> {
  const client = createRedisClient(instance);

  try {
    await client.connect();

    // Get counts from sorted sets
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      client.zcard(`bull:${queueName}:wait`).catch(() => 0),
      client.zcard(`bull:${queueName}:active`).catch(() => 0),
      client.zcard(`bull:${queueName}:completed`).catch(() => 0),
      client.zcard(`bull:${queueName}:failed`).catch(() => 0),
      client.zcard(`bull:${queueName}:delayed`).catch(() => 0),
    ]);

    // Check if paused
    const pausedKey = await client.exists(`bull:${queueName}:paused`);
    const isPaused = pausedKey === 1;

    const totalJobs = waiting + active + completed + failed + delayed;
    const failureRate = totalJobs > 0 ? (failed / totalJobs) * 100 : 0;

    return {
      name: queueName,
      counts: {
        waiting: Number(waiting),
        active: Number(active),
        completed: Number(completed),
        failed: Number(failed),
        delayed: Number(delayed),
        paused: isPaused ? 1 : 0,
      },
      totalJobs,
      failureRate: Math.round(failureRate * 100) / 100,
      isPaused,
    };
  } finally {
    client.disconnect();
  }
}

// Get overview of all queues in an instance
export async function getBullMQOverview(instance: RedisInstance): Promise<BullMQOverview> {
  const client = createRedisClient(instance);

  try {
    await client.connect();

    // Discover queues
    const queueNames = await discoverQueues(instance);

    // Get stats for each queue
    const queues: QueueStats[] = [];
    let totalJobs = 0;
    let totalFailed = 0;
    let totalActive = 0;

    for (const queueName of queueNames) {
      const stats = await getQueueStats(instance, queueName);
      queues.push(stats);
      totalJobs += stats.totalJobs;
      totalFailed += stats.counts.failed;
      totalActive += stats.counts.active;
    }

    return {
      instance: instance.name,
      connected: true,
      queues,
      totalQueues: queues.length,
      totalJobs,
      totalFailed,
      totalActive,
    };
  } catch (error) {
    return {
      instance: instance.name,
      connected: false,
      queues: [],
      totalQueues: 0,
      totalJobs: 0,
      totalFailed: 0,
      totalActive: 0,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  } finally {
    client.disconnect();
  }
}

// Get jobs from a specific queue and status
export async function getQueueJobs(
  instance: RedisInstance,
  queueName: string,
  status: "waiting" | "active" | "completed" | "failed" | "delayed",
  limit = 20
): Promise<QueueJob[]> {
  const client = createRedisClient(instance);

  try {
    await client.connect();

    const statusKey = status === "waiting" ? "wait" : status;
    const jobIds = await client.zrange(`bull:${queueName}:${statusKey}`, 0, limit - 1);

    const jobs: QueueJob[] = [];

    for (const jobId of jobIds) {
      const jobData = await client.hgetall(`bull:${queueName}:${jobId}`);

      if (jobData && Object.keys(jobData).length > 0) {
        jobs.push({
          id: jobId,
          name: jobData.name || "unknown",
          data: jobData.data ? JSON.parse(jobData.data) : {},
          timestamp: parseInt(jobData.timestamp || "0", 10),
          attemptsMade: parseInt(jobData.attemptsMade || "0", 10),
          failedReason: jobData.failedReason,
          processedOn: jobData.processedOn ? parseInt(jobData.processedOn, 10) : undefined,
          finishedOn: jobData.finishedOn ? parseInt(jobData.finishedOn, 10) : undefined,
        });
      }
    }

    return jobs;
  } finally {
    client.disconnect();
  }
}

// Get Redis info
export async function getRedisInfo(instance: RedisInstance): Promise<Record<string, string>> {
  const client = createRedisClient(instance);

  try {
    await client.connect();
    const info = await client.info();

    // Parse Redis INFO output
    const result: Record<string, string> = {};
    info.split("\n").forEach((line) => {
      const [key, value] = line.split(":");
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });

    return result;
  } finally {
    client.disconnect();
  }
}

/**
 * Mock API responses for different data source states
 * Used to simulate various setup scenarios in e2e tests
 */

export const mockHealthResponses = {
  // All services healthy
  healthy: {
    status: "healthy",
    checks: {
      kubernetes: {
        status: "healthy",
        message: "Connected to Kubernetes cluster",
        context: "default",
        server: "https://kubernetes.default.svc",
      },
      prometheus: {
        status: "healthy",
        message: "Prometheus is reachable",
        url: "http://prometheus:9090",
        version: "2.45.0",
      },
      redis: {
        status: "healthy",
        message: "2 Redis instances configured",
        instances: 2,
      },
    },
  },

  // Critical services up, optional services not configured
  degraded: {
    status: "degraded",
    checks: {
      kubernetes: {
        status: "healthy",
        message: "Connected to Kubernetes cluster",
        context: "default",
        server: "https://kubernetes.default.svc",
      },
      prometheus: {
        status: "healthy",
        message: "Prometheus is reachable",
        url: "http://prometheus:9090",
        version: "2.45.0",
      },
      redis: {
        status: "not_configured",
        message: "No Redis instances configured",
      },
    },
  },

  // Kubernetes unavailable
  kubernetesDown: {
    status: "unhealthy",
    checks: {
      kubernetes: {
        status: "unhealthy",
        message: "Failed to connect to Kubernetes cluster",
        error: "ECONNREFUSED",
      },
      prometheus: {
        status: "healthy",
        message: "Prometheus is reachable",
        url: "http://prometheus:9090",
        version: "2.45.0",
      },
      redis: {
        status: "not_configured",
        message: "No Redis instances configured",
      },
    },
  },

  // Prometheus unavailable
  prometheusDown: {
    status: "unhealthy",
    checks: {
      kubernetes: {
        status: "healthy",
        message: "Connected to Kubernetes cluster",
        context: "default",
        server: "https://kubernetes.default.svc",
      },
      prometheus: {
        status: "unhealthy",
        message: "Failed to connect to Prometheus",
        error: "ECONNREFUSED",
        url: "http://prometheus:9090",
      },
      redis: {
        status: "not_configured",
        message: "No Redis instances configured",
      },
    },
  },

  // All services down
  allDown: {
    status: "unhealthy",
    checks: {
      kubernetes: {
        status: "unhealthy",
        message: "Failed to connect to Kubernetes cluster",
        error: "ECONNREFUSED",
      },
      prometheus: {
        status: "unhealthy",
        message: "Failed to connect to Prometheus",
        error: "ECONNREFUSED",
        url: "http://prometheus:9090",
      },
      redis: {
        status: "not_configured",
        message: "No Redis instances configured",
      },
    },
  },
};

export const mockDataSourcesResponses = {
  healthy: {
    kubernetes: {
      configured: true,
      healthy: true,
      context: "default",
      server: "https://kubernetes.default.svc",
    },
    prometheus: {
      configured: true,
      healthy: true,
      url: "http://prometheus:9090",
      version: "2.45.0",
    },
    redis: {
      configured: true,
      healthy: true,
      instances: [
        { name: "main", host: "localhost", port: 6379 },
        { name: "cache", host: "localhost", port: 6380 },
      ],
    },
    victoriametrics: {
      configured: false,
    },
    grafana: {
      configured: false,
    },
  },

  degraded: {
    kubernetes: {
      configured: true,
      healthy: true,
      context: "default",
      server: "https://kubernetes.default.svc",
    },
    prometheus: {
      configured: true,
      healthy: true,
      url: "http://prometheus:9090",
      version: "2.45.0",
    },
    redis: {
      configured: false,
    },
    victoriametrics: {
      configured: false,
    },
    grafana: {
      configured: false,
    },
  },
};

export const mockKubernetesData = {
  namespaces: {
    items: [
      { metadata: { name: "default" } },
      { metadata: { name: "kube-system" } },
      { metadata: { name: "monitoring" } },
      { metadata: { name: "production" } },
    ],
  },

  pods: {
    items: [
      {
        metadata: {
          name: "nginx-7d5b8c4f9d-abc12",
          namespace: "default",
          creationTimestamp: "2025-11-19T10:00:00Z",
        },
        status: {
          phase: "Running",
          containerStatuses: [
            {
              name: "nginx",
              ready: true,
              restartCount: 0,
              state: { running: { startedAt: "2025-11-19T10:00:05Z" } },
            },
          ],
        },
        spec: {
          containers: [{ name: "nginx", image: "nginx:latest" }],
        },
      },
      {
        metadata: {
          name: "postgres-0",
          namespace: "default",
          creationTimestamp: "2025-11-18T10:00:00Z",
        },
        status: {
          phase: "Running",
          containerStatuses: [
            {
              name: "postgres",
              ready: true,
              restartCount: 2,
              state: { running: { startedAt: "2025-11-19T08:00:05Z" } },
            },
          ],
        },
        spec: {
          containers: [{ name: "postgres", image: "postgres:14" }],
        },
      },
    ],
  },

  nodes: {
    items: [
      {
        metadata: {
          name: "node-1",
          creationTimestamp: "2025-11-01T10:00:00Z",
        },
        status: {
          conditions: [
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2025-11-20T10:00:00Z",
            },
            { type: "MemoryPressure", status: "False" },
            { type: "DiskPressure", status: "False" },
          ],
          nodeInfo: {
            kubeletVersion: "v1.28.0",
            osImage: "Ubuntu 22.04.3 LTS",
          },
        },
      },
      {
        metadata: {
          name: "node-2",
          creationTimestamp: "2025-11-01T10:00:00Z",
        },
        status: {
          conditions: [
            {
              type: "Ready",
              status: "True",
              lastHeartbeatTime: "2025-11-20T10:00:00Z",
            },
            { type: "MemoryPressure", status: "False" },
            { type: "DiskPressure", status: "False" },
          ],
          nodeInfo: {
            kubeletVersion: "v1.28.0",
            osImage: "Ubuntu 22.04.3 LTS",
          },
        },
      },
    ],
  },

  events: {
    items: [
      {
        metadata: {
          name: "event-1",
          namespace: "default",
          creationTimestamp: "2025-11-20T09:55:00Z",
        },
        involvedObject: {
          kind: "Pod",
          name: "nginx-7d5b8c4f9d-abc12",
          namespace: "default",
        },
        reason: "Created",
        message: "Created container nginx",
        type: "Normal",
        firstTimestamp: "2025-11-20T09:55:00Z",
        lastTimestamp: "2025-11-20T09:55:00Z",
      },
    ],
  },
};

export const mockPrometheusData = {
  querySuccess: {
    status: "success",
    data: {
      resultType: "vector",
      result: [
        {
          metric: { __name__: "up", job: "kubernetes-nodes" },
          value: [1700000000, "1"],
        },
      ],
    },
  },

  queryRangeSuccess: {
    status: "success",
    data: {
      resultType: "matrix",
      result: [
        {
          metric: { instance: "node-1" },
          values: [
            [1700000000, "0.25"],
            [1700000060, "0.30"],
            [1700000120, "0.28"],
          ],
        },
      ],
    },
  },

  queryError: {
    status: "error",
    errorType: "bad_data",
    error: "invalid query syntax",
  },
};

export const mockBullMQData = {
  overview: {
    totalQueues: 3,
    totalJobs: 150,
    instances: [
      {
        name: "main",
        host: "localhost",
        port: 6379,
        queues: 2,
        jobs: 100,
      },
      {
        name: "cache",
        host: "localhost",
        port: 6380,
        queues: 1,
        jobs: 50,
      },
    ],
  },

  queues: [
    {
      name: "email-queue",
      instance: "main",
      counts: {
        waiting: 5,
        active: 2,
        completed: 80,
        failed: 3,
        delayed: 1,
      },
    },
    {
      name: "video-processing",
      instance: "main",
      counts: {
        waiting: 0,
        active: 1,
        completed: 10,
        failed: 0,
        delayed: 0,
      },
    },
  ],
};

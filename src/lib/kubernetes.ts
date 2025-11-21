import * as k8s from "@kubernetes/client-node";
import log from "@/lib/logger";
import type {
  KubectlExecRequest,
  KubectlExecResponse,
  KubernetesEvent,
  KubernetesNamespace,
  KubernetesNode,
  KubernetesPod,
  KubernetesService,
} from "@/types/kubernetes";
import { containsBlockedArgs, isAllowedKubectlCommand } from "./config";

// Initialize Kubernetes client
let kc: k8s.KubeConfig | null = null;
let k8sApi: k8s.CoreV1Api | null = null;

// Load config (auto-detects in-cluster or ~/.kube/config)
function initializeK8sClient() {
  if (kc && k8sApi) {
    return { kc, k8sApi };
  }

  try {
    kc = new k8s.KubeConfig();
    kc.loadFromDefault();
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    return { kc, k8sApi };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    log.error({ error }, "Failed to initialize K8s client");
    throw new Error(
      `Failed to initialize Kubernetes client: ${errorMsg}. Make sure kubectl is configured (try 'kubectl cluster-info').`
    );
  }
}

// Helper to get initialized client
function getClient() {
  const client = initializeK8sClient();
  if (!client.k8sApi) {
    throw new Error("Kubernetes API client not initialized");
  }
  return client.k8sApi;
}

export async function getNamespaces(): Promise<KubernetesNamespace[]> {
  try {
    const api = getClient();
    const response = await api.listNamespace();
    const data = (response as any).body || response;

    return data.items.map((item: any) => ({
      name: item.metadata?.name || "",
      status: item.status?.phase || "Unknown",
      creationTimestamp: item.metadata?.creationTimestamp?.toISOString() || "",
      labels: item.metadata?.labels,
    }));
  } catch (error) {
    throw new Error(
      `Failed to get namespaces: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getPods(namespace?: string): Promise<KubernetesPod[]> {
  try {
    const api = getClient();
    const response = namespace
      ? await api.listNamespacedPod({ namespace })
      : await api.listPodForAllNamespaces();

    // Handle response - it might be response.body or just response directly
    const data = (response as any).body || response;

    if (!data?.items) {
      throw new Error("Invalid response from Kubernetes API: missing items array");
    }

    return data.items.map((item: any) => {
      const containerStatuses = item.status?.containerStatuses || [];
      const readyCount = containerStatuses.filter((c: any) => c.ready).length;
      const totalCount = item.spec?.containers.length || 0;

      // Calculate age
      const createdAt = item.metadata?.creationTimestamp
        ? new Date(item.metadata.creationTimestamp)
        : new Date();
      const now = new Date();
      const ageMs = now.getTime() - createdAt.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const ageMinutes = Math.floor((ageMs % (1000 * 60 * 60)) / (1000 * 60));
      let age = "";
      if (ageDays > 0) age = `${ageDays}d`;
      else if (ageHours > 0) age = `${ageHours}h`;
      else age = `${ageMinutes}m`;

      const totalRestarts = containerStatuses.reduce(
        (sum: number, c: any) => sum + (c.restartCount || 0),
        0
      );

      return {
        name: item.metadata?.name || "",
        namespace: item.metadata?.namespace || "",
        status: item.status?.phase || "Unknown",
        ready: `${readyCount}/${totalCount}`,
        restarts: totalRestarts,
        age,
        ip: item.status?.podIP,
        node: item.spec?.nodeName,
        labels: item.metadata?.labels,
        containers: (item.spec?.containers || []).map(
          (container: { name: string; image: string }, index: number) => {
            const status = containerStatuses[index];
            return {
              name: container.name,
              image: container.image || "",
              ready: status?.ready,
              restartCount: status?.restartCount || 0,
              state: status?.state ? Object.keys(status.state)[0] : "unknown",
            };
          }
        ),
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to get pods: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getNodes(): Promise<KubernetesNode[]> {
  try {
    const api = getClient();
    const response = await api.listNode();
    const data = (response as any).body || response;

    return data.items.map((item: any) => {
      const labels = item.metadata?.labels || {};
      const roles: string[] = [];

      // Extract roles from labels
      Object.keys(labels).forEach((key) => {
        if (key.startsWith("node-role.kubernetes.io/")) {
          roles.push(key.replace("node-role.kubernetes.io/", ""));
        }
      });

      const internalIP =
        item.status?.addresses?.find(
          (addr: { type: string; address: string }) => addr.type === "InternalIP"
        )?.address || "";

      return {
        name: item.metadata?.name || "",
        status:
          item.status?.conditions?.find((c: { type: string; status: string }) => c.type === "Ready")
            ?.status === "True"
            ? "Ready"
            : "NotReady",
        roles: roles.length > 0 ? roles : ["<none>"],
        version: item.status?.nodeInfo?.kubeletVersion || "",
        internalIP,
        osImage: item.status?.nodeInfo?.osImage || "",
        kernelVersion: item.status?.nodeInfo?.kernelVersion || "",
        containerRuntime: item.status?.nodeInfo?.containerRuntimeVersion || "",
        labels: item.metadata?.labels,
        capacity: {
          cpu: item.status?.capacity?.cpu || "0",
          memory: item.status?.capacity?.memory || "0",
          pods: item.status?.capacity?.pods || "0",
          ephemeralStorage: item.status?.capacity?.["ephemeral-storage"] || "0",
        },
        allocatable: {
          cpu: item.status?.allocatable?.cpu || "0",
          memory: item.status?.allocatable?.memory || "0",
          pods: item.status?.allocatable?.pods || "0",
          ephemeralStorage: item.status?.allocatable?.["ephemeral-storage"] || "0",
        },
        conditions: (item.status?.conditions || []).map(
          (c: { type: string; status: string; reason: string; message: string }) => ({
            type: c.type,
            status: c.status,
            reason: c.reason || "",
            message: c.message || "",
          })
        ),
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to get nodes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getServices(namespace?: string): Promise<KubernetesService[]> {
  try {
    const api = getClient();
    const data = namespace
      ? await api.listNamespacedService({ namespace })
      : await api.listServiceForAllNamespaces();

    return data.items.map((item) => {
      let externalIP: string | undefined;

      if (item.spec?.externalIPs && item.spec.externalIPs.length > 0) {
        externalIP = item.spec.externalIPs[0];
      } else if (
        item.status?.loadBalancer?.ingress &&
        item.status.loadBalancer.ingress.length > 0
      ) {
        const ingress = item.status.loadBalancer.ingress[0];
        externalIP = ingress.ip || ingress.hostname;
      }

      return {
        name: item.metadata?.name || "",
        namespace: item.metadata?.namespace || "",
        type: item.spec?.type || "",
        clusterIP: item.spec?.clusterIP || "",
        externalIP,
        labels: item.metadata?.labels,
        ports: (item.spec?.ports || []).map((port) => ({
          name: port.name,
          protocol: port.protocol || "",
          port: port.port,
          targetPort: typeof port.targetPort === "number" ? port.targetPort : 0,
          nodePort: port.nodePort,
        })),
        selector: item.spec?.selector,
        creationTimestamp: item.metadata?.creationTimestamp?.toISOString() || "",
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to get services: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function getEvents(
  namespace?: string,
  eventType?: string,
  limit?: number
): Promise<KubernetesEvent[]> {
  try {
    const api = getClient();
    const data = namespace
      ? await api.listNamespacedEvent({ namespace })
      : await api.listEventForAllNamespaces();

    if (!data?.items) {
      throw new Error("Invalid response from Kubernetes API: missing items array");
    }

    // Map and filter events
    let events = data.items.map((item): KubernetesEvent => {
      // Calculate age for sorting (most recent first)
      const lastTimestamp = item.lastTimestamp || item.metadata?.creationTimestamp;

      const eventType = item.type || "Normal";
      const normalizedType =
        eventType === "Normal" || eventType === "Warning" || eventType === "Error"
          ? eventType
          : ("Normal" as const);

      return {
        type: normalizedType,
        reason: item.reason || "",
        message: item.message || "",
        namespace: item.metadata?.namespace || "",
        involvedObject: {
          kind: item.involvedObject?.kind || "",
          name: item.involvedObject?.name || "",
          namespace: item.involvedObject?.namespace,
        },
        source: {
          component: item.source?.component || "",
          host: item.source?.host,
        },
        count: item.count || 1,
        firstTimestamp:
          item.firstTimestamp?.toDateString() ||
          item.metadata?.creationTimestamp?.toDateString() ||
          "",
        lastTimestamp: lastTimestamp?.toDateString() || "",
      };
    });

    // Filter by event type if specified
    if (eventType && eventType !== "all") {
      events = events.filter(
        (e: KubernetesEvent) => e.type.toLowerCase() === eventType.toLowerCase()
      );
    }

    // Sort by lastTimestamp descending (most recent first)
    events.sort((a: KubernetesEvent, b: KubernetesEvent) => {
      const timeA = new Date(a.lastTimestamp).getTime();
      const timeB = new Date(b.lastTimestamp).getTime();
      return timeB - timeA;
    });

    // Apply limit if specified
    if (limit && limit > 0) {
      events = events.slice(0, limit);
    }

    return events;
  } catch (error) {
    throw new Error(
      `Failed to get events: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function executeKubectl(request: KubectlExecRequest): Promise<KubectlExecResponse> {
  const { command, args = [], namespace } = request;

  // Security: Check if command is allowed
  if (!isAllowedKubectlCommand(command)) {
    return {
      success: false,
      error: `Command '${command}' is not allowed. Allowed commands: get, describe, logs, top, api-resources, api-versions, cluster-info, version`,
    };
  }

  // Security: Check for blocked arguments
  if (containsBlockedArgs(args)) {
    return {
      success: false,
      error: "Command contains blocked arguments related to authentication/security",
    };
  }

  try {
    // For 'get' commands, use the K8s API directly
    if (command === "get" && args.length > 0) {
      const resourceType = args[0];
      const resourceName = args[1];

      switch (resourceType) {
        case "pods":
        case "pod": {
          const pods = await getPods(namespace);
          if (resourceName) {
            const pod = pods.find((p) => p.name === resourceName);
            return {
              success: true,
              output: pod || { error: "Pod not found" },
            };
          }
          return { success: true, output: pods };
        }

        case "namespaces":
        case "namespace":
        case "ns": {
          const namespaces = await getNamespaces();
          if (resourceName) {
            const ns = namespaces.find((n) => n.name === resourceName);
            return {
              success: true,
              output: ns || { error: "Namespace not found" },
            };
          }
          return { success: true, output: namespaces };
        }

        case "nodes":
        case "node": {
          const nodes = await getNodes();
          if (resourceName) {
            const node = nodes.find((n) => n.name === resourceName);
            return {
              success: true,
              output: node || { error: "Node not found" },
            };
          }
          return { success: true, output: nodes };
        }

        case "services":
        case "service":
        case "svc": {
          const services = await getServices(namespace);
          if (resourceName) {
            const svc = services.find((s) => s.name === resourceName);
            return {
              success: true,
              output: svc || { error: "Service not found" },
            };
          }
          return { success: true, output: services };
        }

        default:
          return {
            success: false,
            error: `Resource type '${resourceType}' not supported via API. Use kubectl directly for this resource.`,
          };
      }
    }

    // For other commands (describe, logs, top, etc.), return error
    // These could be implemented with additional K8s client methods if needed
    return {
      success: false,
      error: `Command '${command}' is not yet implemented via K8s API client. Supported get commands: pods, namespaces, nodes, services`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function getClusterInfo(): {
  context: string;
  server: string;
} {
  try {
    const { kc: kubeConfig } = initializeK8sClient();
    const currentContext = kubeConfig.getCurrentContext();
    const cluster = kubeConfig.getCurrentCluster();

    return {
      context: currentContext || "unknown",
      server: cluster?.server || "unknown",
    };
  } catch (error) {
    throw new Error(
      `Failed to get cluster info: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Export the K8s client for use in other modules (like logs)
export function getK8sClient() {
  const { kc: kubeConfig, k8sApi: api } = initializeK8sClient();
  return { kc: kubeConfig, k8sApi: api };
}

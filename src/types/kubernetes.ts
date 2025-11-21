// Kubernetes API Types

export interface KubernetesNamespace {
  name: string;
  status: string;
  creationTimestamp: string;
  labels?: Record<string, string>;
}

export interface KubernetesPod {
  name: string;
  namespace: string;
  status: string;
  ready: string;
  restarts: number;
  age: string;
  ip?: string;
  node?: string;
  labels?: Record<string, string>;
  containers: {
    name: string;
    image: string;
    ready: boolean;
    restartCount: number;
    state: string;
  }[];
}

export interface KubernetesNode {
  name: string;
  status: string;
  roles: string[];
  version: string;
  internalIP: string;
  osImage: string;
  kernelVersion: string;
  containerRuntime: string;
  labels?: Record<string, string>;
  taints?: {
    key: string;
    value?: string;
    effect: string;
  }[];
  capacity: {
    cpu: string;
    memory: string;
    pods: string;
    ephemeralStorage: string;
  };
  allocatable: {
    cpu: string;
    memory: string;
    pods: string;
    ephemeralStorage: string;
  };
  conditions: {
    type: string;
    status: string;
    reason: string;
    message: string;
  }[];
}

export interface KubernetesService {
  name: string;
  namespace: string;
  type: string;
  clusterIP: string;
  externalIP?: string;
  labels?: Record<string, string>;
  ports: {
    name?: string;
    protocol: string;
    port: number;
    targetPort: number | string;
    nodePort?: number;
  }[];
  selector?: Record<string, string>;
  creationTimestamp: string;
}

export interface KubectlExecRequest {
  command: string;
  args?: string[];
  namespace?: string;
}

export interface KubectlExecResponse {
  success: boolean;
  output?: unknown;
  error?: string;
  rawOutput?: string;
}

export interface KubernetesApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Raw kubectl JSON output types
export interface KubectlNamespaceList {
  apiVersion: string;
  kind: "NamespaceList";
  items: {
    metadata: {
      name: string;
      creationTimestamp: string;
      labels?: Record<string, string>;
    };
    status: {
      phase: string;
    };
  }[];
}

export interface KubectlPodList {
  apiVersion: string;
  kind: "PodList";
  items: {
    metadata: {
      name: string;
      namespace: string;
      creationTimestamp: string;
    };
    spec: {
      containers: {
        name: string;
        image: string;
      }[];
      nodeName?: string;
    };
    status: {
      phase: string;
      podIP?: string;
      containerStatuses?: {
        name: string;
        ready: boolean;
        restartCount: number;
        state: Record<string, unknown>;
      }[];
    };
  }[];
}

export interface KubectlNodeList {
  apiVersion: string;
  kind: "NodeList";
  items: {
    metadata: {
      name: string;
      labels?: Record<string, string>;
    };
    spec: {
      taints?: unknown[];
    };
    status: {
      capacity: Record<string, string>;
      allocatable: Record<string, string>;
      conditions: {
        type: string;
        status: string;
        reason: string;
        message: string;
      }[];
      addresses: {
        type: string;
        address: string;
      }[];
      nodeInfo: {
        osImage: string;
        kernelVersion: string;
        containerRuntimeVersion: string;
        kubeletVersion: string;
      };
    };
  }[];
}

export interface KubectlServiceList {
  apiVersion: string;
  kind: "ServiceList";
  items: {
    metadata: {
      name: string;
      namespace: string;
      creationTimestamp: string;
    };
    spec: {
      type: string;
      clusterIP: string;
      externalIPs?: string[];
      ports: {
        name?: string;
        protocol: string;
        port: number;
        targetPort: number | string;
        nodePort?: number;
      }[];
      selector?: Record<string, string>;
    };
    status?: {
      loadBalancer?: {
        ingress?: {
          ip?: string;
          hostname?: string;
        }[];
      };
    };
  }[];
}

export interface KubernetesEvent {
  type: "Normal" | "Warning" | "Error";
  reason: string;
  message: string;
  namespace: string;
  involvedObject: {
    kind: string;
    name: string;
    namespace?: string;
  };
  source: {
    component: string;
    host?: string;
  };
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

export interface KubectlEventList {
  apiVersion: string;
  kind: "EventList";
  items: {
    metadata: {
      name: string;
      namespace: string;
      creationTimestamp: string;
    };
    type: string;
    reason: string;
    message: string;
    involvedObject: {
      kind: string;
      name: string;
      namespace?: string;
      apiVersion?: string;
      resourceVersion?: string;
      uid?: string;
    };
    source: {
      component: string;
      host?: string;
    };
    count: number;
    firstTimestamp: string;
    lastTimestamp: string;
  }[];
}

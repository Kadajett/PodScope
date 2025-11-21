import { type KubeQuery, parseKubeQueryRef } from "@/config/schema";
import type {
  KubernetesNamespace,
  KubernetesNode,
  KubernetesPod,
  KubernetesService,
} from "@/types/kubernetes";
import { loadConfig } from "./config-storage";
import { getNamespaces, getNodes, getPods, getServices } from "./kubernetes";

/**
 * Get a Kubernetes query definition from the config
 */
export function getKubeQueryFromConfig(queryRef: string): KubeQuery {
  const config = loadConfig();

  if (!config.kubeQueries) {
    throw new Error("No kubeQueries defined in config");
  }

  const { namespace, queryName } = parseKubeQueryRef(queryRef);

  const queryNamespace = config.kubeQueries[namespace];
  if (!queryNamespace) {
    throw new Error(`Kube query namespace '${namespace}' not found in config`);
  }

  const queryDef = queryNamespace[queryName];
  if (!queryDef) {
    throw new Error(`Kube query '${queryName}' not found in namespace '${namespace}'`);
  }

  return queryDef;
}

/**
 * Execute a Kubernetes query
 */
export async function executeKubeQuery(query: KubeQuery): Promise<{
  resourceType: string;
  items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>;
  count: number;
}> {
  let items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>;

  // Fetch the resources based on type
  switch (query.resourceType) {
    case "pods":
      items = await getPods(query.namespace);
      break;
    case "services":
      items = await getServices(query.namespace);
      break;
    case "nodes":
      items = await getNodes();
      break;
    case "namespaces":
      items = await getNamespaces();
      break;
    default:
      throw new Error(`Resource type '${query.resourceType}' not yet supported`);
  }

  // Apply field selector filtering (client-side for now)
  if (query.fieldSelector) {
    items = applyFieldSelector(items, query.fieldSelector);
  }

  // Apply label selector filtering (client-side for now)
  if (query.labelSelector) {
    items = applyLabelSelector(items, query.labelSelector);
  }

  // Apply limit
  if (query.limit && query.limit > 0) {
    items = items.slice(0, query.limit);
  }

  return {
    resourceType: query.resourceType,
    items,
    count: items.length,
  };
}

/**
 * Apply field selector filtering (client-side)
 * Supports simple field selectors like "status.phase=Running"
 */
function applyFieldSelector(items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>, fieldSelector: string): Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace> {
  const selectors = fieldSelector.split(",");

  return items.filter((item) => {
    return selectors.every((selector) => {
      const [fieldPath, expectedValue] = selector.split("=");
      if (!(fieldPath && expectedValue)) return true;

      const actualValue = getNestedValue(item, fieldPath.trim());
      return actualValue === expectedValue.trim();
    });
  });
}

/**
 * Apply label selector filtering (client-side)
 * Supports simple label selectors like "app=nginx,env=prod"
 */
function applyLabelSelector(items: Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace>, labelSelector: string): Array<KubernetesPod | KubernetesService | KubernetesNode | KubernetesNamespace> {
  const selectors = labelSelector.split(",");

  return items.filter((item) => {
    const labels = item.labels || {};

    return selectors.every((selector) => {
      const [key, expectedValue] = selector.split("=");
      if (!key) return true;

      const actualValue = labels[key.trim()];
      if (!expectedValue) {
        // Key existence check
        return actualValue !== undefined;
      }

      return actualValue === expectedValue.trim();
    });
  });
}

/**
 * Get a nested value from an object using dot notation
 * Example: getNestedValue({status: {phase: "Running"}}, "status.phase") => "Running"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let value: unknown = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

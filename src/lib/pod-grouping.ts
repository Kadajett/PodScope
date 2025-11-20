import type { KubernetesPod } from "@/types/kubernetes";

export interface ReplicaSetGroup {
  name: string;
  namespace: string;
  pods: KubernetesPod[];
  // Aggregate stats
  readyCount: number;
  totalCount: number;
  totalRestarts: number;
  oldestAge: string;
  statuses: Record<string, number>;
}

export interface NamespaceWithReplicaSets {
  namespace: string;
  replicaSets: ReplicaSetGroup[];
  standalonePods: KubernetesPod[]; // Pods not in a ReplicaSet
}

// Parse pod name to extract ReplicaSet/Deployment name
// Pod names typically follow: <deployment>-<replicaset-hash>-<pod-hash>
// Example: nginx-deployment-7d4f8c9b5f-abc123
export function extractReplicaSetName(podName: string): string | null {
  // Match pattern: name-<hash>-<hash> where hashes are alphanumeric
  const match = podName.match(/^(.+)-([a-z0-9]{8,10})-([a-z0-9]{5})$/);
  if (match) {
    // Return deployment-replicaset portion
    return `${match[1]}-${match[2]}`;
  }

  // Alternative pattern for StatefulSets: name-<number>
  const statefulMatch = podName.match(/^(.+)-(\d+)$/);
  if (statefulMatch) {
    return statefulMatch[1]; // Group by StatefulSet name
  }

  // DaemonSet or standalone pod - no grouping
  return null;
}

// Group pods by ReplicaSet within each namespace
export function groupPodsByReplicaSet(pods: KubernetesPod[]): NamespaceWithReplicaSets[] {
  // First group by namespace
  const namespaceMap = new Map<string, KubernetesPod[]>();

  pods.forEach((pod) => {
    if (!namespaceMap.has(pod.namespace)) {
      namespaceMap.set(pod.namespace, []);
    }
    namespaceMap.get(pod.namespace)?.push(pod);
  });

  const result: NamespaceWithReplicaSets[] = [];

  // For each namespace, group pods by ReplicaSet
  namespaceMap.forEach((namespacePods, namespace) => {
    const replicaSetMap = new Map<string, KubernetesPod[]>();
    const standalonePods: KubernetesPod[] = [];

    namespacePods.forEach((pod) => {
      const rsName = extractReplicaSetName(pod.name);
      if (rsName) {
        if (!replicaSetMap.has(rsName)) {
          replicaSetMap.set(rsName, []);
        }
        replicaSetMap.get(rsName)?.push(pod);
      } else {
        standalonePods.push(pod);
      }
    });

    // Convert to ReplicaSetGroup with aggregates
    const replicaSets: ReplicaSetGroup[] = [];

    replicaSetMap.forEach((rsPods, rsName) => {
      // Only group if there's more than 1 pod (otherwise it's effectively standalone)
      if (rsPods.length > 1) {
        const group = createReplicaSetGroup(rsName, namespace, rsPods);
        replicaSets.push(group);
      } else {
        // Single pod in "group" - treat as standalone
        standalonePods.push(...rsPods);
      }
    });

    // Sort ReplicaSets by name
    replicaSets.sort((a, b) => a.name.localeCompare(b.name));
    standalonePods.sort((a, b) => a.name.localeCompare(b.name));

    result.push({
      namespace,
      replicaSets,
      standalonePods,
    });
  });

  // Sort namespaces
  result.sort((a, b) => a.namespace.localeCompare(b.namespace));

  return result;
}

function createReplicaSetGroup(
  name: string,
  namespace: string,
  pods: KubernetesPod[]
): ReplicaSetGroup {
  let readyCount = 0;
  let totalRestarts = 0;
  const statuses: Record<string, number> = {};

  pods.forEach((pod) => {
    // Count ready pods (parse "1/1" format)
    const [ready, total] = pod.ready.split("/").map(Number);
    if (ready === total && total > 0) {
      readyCount++;
    }

    totalRestarts += pod.restarts;

    // Count statuses
    if (!statuses[pod.status]) {
      statuses[pod.status] = 0;
    }
    statuses[pod.status]++;
  });

  // Find oldest age (simplified - just use first pod's age for now)
  const oldestAge = pods[0]?.age || "0m";

  return {
    name,
    namespace,
    pods,
    readyCount,
    totalCount: pods.length,
    totalRestarts,
    oldestAge,
    statuses,
  };
}

// Get health color based on replica status
export function getReplicaSetHealthColor(group: ReplicaSetGroup): string {
  const healthyRatio = group.readyCount / group.totalCount;

  if (healthyRatio === 1 && group.statuses.Running === group.totalCount) {
    return "green";
  }
  if (healthyRatio >= 0.5) {
    return "yellow";
  }
  return "red";
}

// Get deployment name from ReplicaSet name (remove hash)
export function getDeploymentName(replicaSetName: string): string {
  const match = replicaSetName.match(/^(.+)-[a-z0-9]{8,10}$/);
  return match ? match[1] : replicaSetName;
}

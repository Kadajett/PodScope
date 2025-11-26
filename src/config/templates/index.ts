import type { DashboardConfig } from "@/config/schema";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: "minimal" | "kubernetes" | "prometheus" | "full" | "custom";
  tags: string[];
  preview?: string; // Path to screenshot
  author?: string;
  version: string;
}

export interface Template extends TemplateMetadata {
  config: DashboardConfig;
}

import kubernetesFocusedConfig from "./kubernetes-focused.json";
// Import template configs
import minimalConfig from "./minimal.json";
import multiPageConfig from "./multi-page.json";
import prometheusFullConfig from "./prometheus-full.json";

export const templates: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    description:
      "A clean starting point with just cluster metrics and pod list. Perfect for getting started or building your own custom dashboard.",
    category: "minimal",
    tags: ["starter", "simple", "clean"],
    version: "1.0.0",
    config: minimalConfig as DashboardConfig,
  },
  {
    id: "kubernetes-focused",
    name: "Kubernetes Focused",
    description:
      "Comprehensive Kubernetes monitoring with node status, events, pods across namespaces, and kubectl terminal.",
    category: "kubernetes",
    tags: ["kubernetes", "pods", "nodes", "events", "terminal"],
    version: "1.0.0",
    config: kubernetesFocusedConfig as DashboardConfig,
  },
  {
    id: "prometheus-full",
    name: "Prometheus Full",
    description:
      "Rich Prometheus query library with CPU, memory, disk, network metrics and custom query panels for advanced monitoring.",
    category: "prometheus",
    tags: ["prometheus", "metrics", "advanced", "queries"],
    version: "1.0.0",
    config: prometheusFullConfig as DashboardConfig,
  },
  {
    id: "multi-page",
    name: "Multi-Page Dashboard",
    description:
      "Demonstrates multi-page layouts with Overview, Kubernetes, Queues, and Debug pages. Great for organizing complex monitoring setups.",
    category: "full",
    tags: ["multi-page", "organized", "complete"],
    version: "1.0.0",
    config: multiPageConfig as DashboardConfig,
  },
];

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: Template["category"]): Template[] {
  return templates.filter((t) => t.category === category);
}

export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

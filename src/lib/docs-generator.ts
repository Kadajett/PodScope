/**
 * Documentation Generator for K8s Dashboard
 *
 * Generates comprehensive markdown documentation optimized for:
 * - Human reading (with proper formatting, code blocks, examples)
 * - AI assistants (with complete schemas, configs, and context)
 */

import { COMPONENT_METADATA } from "@/config/component-registry";
import defaultConfig from "@/config/default-dashboard.json";

// Convert COMPONENT_METADATA to componentRegistry format
const componentRegistry = Object.values(COMPONENT_METADATA).map((metadata) => ({
  type: metadata.name,
  metadata: {
    displayName: metadata.displayName,
    description: metadata.description,
    category: metadata.category,
    defaultW: metadata.defaultSize?.w || 6,
    defaultH: metadata.defaultSize?.h || 4,
    minW: metadata.category === "kubernetes" ? 5 : 4,
    minH: metadata.category === "kubernetes" ? 6 : 3,
  },
}));

export interface DocSection {
  id: string;
  title: string;
  content: string;
  subsections?: DocSection[];
}

/**
 * Generate all documentation sections
 */
export function generateDocSections(): DocSection[] {
  return [
    {
      id: "overview",
      title: "Overview",
      content: generateOverview(),
    },
    {
      id: "quick-start",
      title: "Quick Start",
      content: generateQuickStart(),
    },
    {
      id: "environment",
      title: "Environment Setup",
      content: generateEnvironmentSetup(),
    },
    {
      id: "configuration",
      title: "Configuration",
      content: generateConfigurationGuide(),
      subsections: [
        {
          id: "dashboard-config",
          title: "Dashboard Configuration",
          content: generateDashboardConfig(),
        },
        {
          id: "query-system",
          title: "Query System",
          content: generateQuerySystem(),
        },
        {
          id: "pages-layout",
          title: "Pages & Layout",
          content: generatePagesLayout(),
        },
      ],
    },
    {
      id: "components",
      title: "Components",
      content: generateComponentsGuide(),
      subsections: componentRegistry.map((comp) => ({
        id: `component-${comp.type}`,
        title: comp.metadata.displayName,
        content: generateComponentDocs(comp),
      })),
    },
    {
      id: "queues",
      title: "Queue Monitoring",
      content: generateQueueMonitoringGuide(),
      subsections: [
        {
          id: "queue-overview",
          title: "Queue System Overview",
          content: generateQueueSystemOverview(),
        },
        {
          id: "queue-providers",
          title: "Queue Providers",
          content: generateQueueProvidersGuide(),
        },
        {
          id: "queue-queries",
          title: "Queue Queries",
          content: generateQueueQueriesGuide(),
        },
        {
          id: "queue-bullmq",
          title: "BullMQ Provider",
          content: generateBullMQProviderGuide(),
        },
        {
          id: "queue-future",
          title: "Adding New Providers",
          content: generateAddingProvidersGuide(),
        },
      ],
    },
    {
      id: "api",
      title: "API Reference",
      content: generateAPIReference(),
      subsections: [
        {
          id: "api-kubernetes",
          title: "Kubernetes API",
          content: generateKubernetesAPI(),
        },
        {
          id: "api-prometheus",
          title: "Prometheus API",
          content: generatePrometheusAPI(),
        },
        {
          id: "api-queue",
          title: "Queue API",
          content: generateQueueAPI(),
        },
      ],
    },
    {
      id: "deployment",
      title: "Deployment",
      content: generateDeploymentGuide(),
      subsections: [
        {
          id: "deploy-local",
          title: "Local Development",
          content: generateLocalDeployment(),
        },
        {
          id: "deploy-cluster",
          title: "In-Cluster Deployment",
          content: generateClusterDeployment(),
        },
        {
          id: "deploy-external",
          title: "External VM Deployment",
          content: generateExternalDeployment(),
        },
      ],
    },
    {
      id: "examples",
      title: "Examples",
      content: generateExamples(),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: generateTroubleshooting(),
    },
  ];
}

/**
 * Generate AI-optimized markdown export
 */
export function generateAIMarkdown(): string {
  const sections = generateDocSections();
  return `# K8s Dashboard - Complete Documentation

> **AI Assistant Context**: This is a comprehensive documentation export for a Next.js-based Kubernetes monitoring dashboard. It includes complete configuration schemas, API references, component documentation, and examples.

## Quick Setup for AI Assistants

### Minimal Setup
\`\`\`bash
# 1. Install dependencies
npm install

# 2. Create .env.local with ONE required variable
PROMETHEUS_URL=http://localhost:9090

# 3. Run dev server (kubectl must be configured)
npm run dev
\`\`\`

That's it! The dashboard will automatically:
- Load kubeconfig from ~/.kube/config (or in-cluster ServiceAccount)
- Connect to Prometheus at the URL provided
- Display default dashboard with cluster metrics

### Tech Stack
- **Framework**: Next.js 16.0.3 (App Router) + React 19.2.0
- **UI**: Tailwind CSS 4 + Radix UI + Lucide Icons
- **State**: TanStack Query (React Query) v5
- **Kubernetes**: @kubernetes/client-node v1.4.0 (NO kubectl subprocess needed!)
- **Grid**: react-grid-layout v1.5.2
- **Validation**: Zod v4
- **Charts**: recharts v2
- **Code Editor**: Monaco Editor

### Core Architecture

\`\`\`
Dashboard Config (JSON)
  ├─ Query Library (Prometheus queries)
  ├─ Kube Query Library (K8s filters)
  ├─ Queue Providers (BullMQ, RabbitMQ, etc.)
  └─ Pages (layout + components)
       └─ Components reference queries by name
\`\`\`

### Key Files
- \`/src/config/schema.ts\` - Zod schemas for validation
- \`/src/config/default-dashboard.json\` - Default config
- \`/src/config/component-registry.ts\` - Available components
- \`/src/lib/kubernetes.ts\` - K8s API client wrapper
- \`/src/lib/prometheus.ts\` - Prometheus HTTP client
- \`/src/lib/queues/\` - Queue provider system
- \`/src/lib/config-storage.ts\` - localStorage persistence

### Component Pattern

\`\`\`typescript
{
  i: "unique-id",              // Unique ID for grid
  x: 0, y: 0, w: 6, h: 4,     // Position and size (12-col grid)
  component: "ComponentType",  // From component registry
  config: {
    title: "My Component",
    showHeader: true,
    queryRef: "promQueries.nodeMetrics.cpu_usage_v1-0-0"
  }
}
\`\`\`

### Query Reference Pattern

Queries use dot notation: \`[type].[namespace].[queryName_version]\`

Examples:
- \`promQueries.nodeMetrics.cpu_usage_v1-0-0\`
- \`kubeQueries.podFilters.failed_pods_v1-0-0\`
- \`queueQueries.jobFilters.failed_jobs_v1-0-0\`

PromQL variables: \`{{variable}}\` (replaced at runtime)

${sections.map((section) => renderSection(section, 2)).join("\n\n")}

---

## Complete Default Configuration

\`\`\`json
${JSON.stringify(defaultConfig, null, 2)}
\`\`\`
`;
}

function renderSection(section: DocSection, level: number): string {
  const heading = "#".repeat(level);
  let output = `${heading} ${section.title}\n\n${section.content}`;

  if (section.subsections) {
    output += `\n\n${section.subsections.map((sub) => renderSection(sub, level + 1)).join("\n\n")}`;
  }

  return output;
}

// ============================================================================
// OVERVIEW
// ============================================================================

function generateOverview(): string {
  return `# K8s Dashboard

A **fast, configurable Kubernetes monitoring dashboard** built as a lightweight alternative to Grafana.

## What It Monitors

- **Kubernetes**: Pods, nodes, services, deployments, namespaces
- **Prometheus/VictoriaMetrics**: Custom PromQL queries and metrics
- **Queue Systems**: BullMQ, RabbitMQ, SQS, Kafka (provider-agnostic)

## Why Use This Instead of Grafana?

✅ **Simpler** - One JSON config file, no complex datasource setup
✅ **Faster** - Direct K8s API calls, no kubectl subprocess overhead
✅ **Kubernetes-native** - Built specifically for K8s monitoring
✅ **Drag-and-drop** - Visual layout editor, no DSL to learn
✅ **Type-safe** - Full TypeScript with Zod validation
✅ **Modern stack** - Next.js 16, React 19, Tailwind CSS 4

## Key Features

### 🎯 100% Configuration-Driven
- Edit entire dashboard via JSON in Monaco editor
- Import/Export configurations
- Query library with versioning (e.g., \`cpu_usage_v1-0-0\`)
- Multi-page dashboards with tabs

### ⚡ Performance
- Direct Kubernetes API via @kubernetes/client-node (no kubectl needed!)
- TanStack Query for intelligent caching
- Optimistic updates and configurable auto-refresh

### 🔒 Security
- RBAC-ready for in-cluster deployment
- Command whitelist and rate limiting
- No credential exposure in configs

### 🎨 Modern UI
- Dark theme with 50+ Radix UI components
- Monaco Editor for PromQL queries
- Real-time log viewer with streaming
- Responsive 12-column grid layout

## Architecture

The dashboard is a standard Next.js app that connects directly to:

\`\`\`
┌──────────────────────────────────┐
│  Next.js 16 App (Runs anywhere:  │
│  local, in-cluster, or VM)       │
└────────┬─────────┬────────┬──────┘
         │         │        │
         ▼         ▼        ▼
    K8s API   Prometheus  Redis
                          (queues)
\`\`\`

**No kubectl subprocess calls!** Uses @kubernetes/client-node library.

## Project Structure

\`\`\`
/src
├── /app
│   ├── /api               # API routes (K8s, Prometheus, Queues)
│   ├── /docs              # This documentation page
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main dashboard
├── /components
│   ├── /dashboard         # Core dashboard components
│   ├── /macro             # Configurable widgets
│   └── /ui                # Radix UI components
├── /config
│   ├── schema.ts          # Zod validation schemas
│   ├── component-registry.ts  # Available components
│   └── default-dashboard.json # Default config
├── /hooks                 # React Query hooks
├── /lib
│   ├── kubernetes.ts      # K8s API wrapper
│   ├── prometheus.ts      # Prometheus client
│   ├── /queues            # Queue provider system
│   ├── kube-query.ts      # K8s query engine
│   └── config-storage.ts  # localStorage persistence
└── /providers             # React Context providers
\`\`\`

## Tech Stack

| Purpose | Technology |
|---------|------------|
| Framework | Next.js 16.0.3 (App Router) |
| UI | React 19.2.0 + Tailwind CSS 4 + Radix UI |
| State | TanStack Query v5 |
| K8s Client | @kubernetes/client-node v1.4.0 |
| Layout | react-grid-layout v1.5.2 |
| Validation | Zod v4 |
| Charts | recharts v2 |
| Editor | Monaco Editor |`.trim();
}

// ============================================================================
// QUICK START
// ============================================================================

function generateQuickStart(): string {
  return `## Prerequisites

1. **Node.js 20+** installed
2. **kubectl configured** with access to a cluster (~/.kube/config)
3. **Prometheus** accessible via HTTP (typically port 9090)

## Installation (3 steps)

### 1. Install Dependencies

\`\`\`bash
git clone <your-repo-url>
cd podscope
npm install
\`\`\`

### 2. Configure Environment

Create \`.env.local\` with ONE required variable:

\`\`\`bash
# Required: Prometheus URL
PROMETHEUS_URL=http://localhost:9090
\`\`\`

**That's it!** Kubernetes will auto-configure from ~/.kube/config.

<details>
<summary>Optional: Additional Configuration</summary>

\`\`\`bash
# Optional: Specify kubectl context (default uses current context)
KUBECTL_CONTEXT=my-cluster

# Optional: Victoria Metrics (Prometheus alternative)
VICTORIA_METRICS_URL=http://localhost:8428

# Optional: BullMQ monitoring (comma-separated Redis instances)
REDIS_INSTANCES=default:localhost:6379

# Optional: Rate limiting for dangerous operations
KUBECTL_EXEC_RATE_LIMIT=10
\`\`\`
</details>

### 3. Run the Dashboard

\`\`\`bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build && npm start
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## Verify It's Working

✅ **Navbar shows "Connected"** - K8s context badge is green
✅ **Prometheus badge shows version** - e.g., "Prometheus 2.45.0"
✅ **Cluster metrics display** - CPU, memory, pod counts visible
✅ **Pod list populates** - Can see pods from your cluster

## Common Issues

| Problem | Solution |
|---------|----------|
| "Disconnected" badge | Verify: \`kubectl cluster-info\` works |
| "Prometheus Down" badge | Check: \`curl $PROMETHEUS_URL/api/v1/status/config\` |
| Empty/zero metrics | Ensure Prometheus scrapes: node_exporter, kube-state-metrics, cAdvisor |
| "No pods found" | Verify: \`kubectl get pods --all-namespaces\` shows pods |

## What Gets Loaded by Default?

The dashboard loads with:
- **Overview page** with 3 widgets: Cluster Metrics, BullMQ Monitor, Pod Explorer
- **15+ Prometheus queries** for CPU, memory, pods, nodes
- **8+ Kubernetes queries** for filtering pods, services, nodes
- **BullMQ provider** (if Redis is configured)

You can customize everything via the UI or by editing the JSON config!`.trim();
}

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

function generateEnvironmentSetup(): string {
  return `## Environment Variables

All configuration is in \`.env.local\` at the project root.

### Required Variables

\`\`\`bash
# Only 1 required variable!
PROMETHEUS_URL=http://localhost:9090
\`\`\`

### Optional Variables

\`\`\`bash
# Kubernetes: Specify context (default uses current kubectl context)
KUBECTL_CONTEXT=my-prod-cluster

# Alternative metrics backend
VICTORIA_METRICS_URL=http://localhost:8428

# BullMQ monitoring (comma-separated: name:host:port[:password])
REDIS_INSTANCES=default:localhost:6379,cache:localhost:6380:secret

# Security: Rate limit dangerous operations (requests/minute)
KUBECTL_EXEC_RATE_LIMIT=10
\`\`\`

## How Kubernetes Connection Works

The dashboard uses **@kubernetes/client-node** (official K8s JavaScript client):

1. **Local development**: Reads ~/.kube/config automatically
2. **In-cluster**: Uses ServiceAccount token from /var/run/secrets/
3. **Remote**: Reads kubeconfig from KUBECTL_CONTEXT

**No kubectl binary needed!** Direct API calls are faster and more reliable.

## How Prometheus Connection Works

Simple HTTP client that queries the Prometheus API:
- \`/api/v1/query\` - Instant queries
- \`/api/v1/query_range\` - Range queries
- \`/api/v1/status/config\` - Health check

**Required Prometheus scrapers:**
- **node_exporter** - Node-level metrics (CPU, memory, disk)
- **kube-state-metrics** - Cluster metrics (pods, deployments, etc.)
- **cAdvisor** - Container metrics (per-pod CPU/memory)

## Security Features

Built-in security for production deployments:

- ✅ **Command whitelist** - Only safe kubectl commands allowed
- ✅ **Argument blacklist** - Blocks \`--token\`, \`--password\`, etc.
- ✅ **Rate limiting** - Configurable per endpoint
- ✅ **RBAC ready** - Works with K8s ServiceAccounts

## Deployment Modes

### 1. Local Development (Simplest)

\`\`\`bash
# Prerequisites: kubectl configured, Prometheus accessible
npm install
echo "PROMETHEUS_URL=http://localhost:9090" > .env.local
npm run dev
\`\`\`

### 2. In-Cluster (Production)

Deploy as a K8s pod with ServiceAccount. The app auto-detects in-cluster mode.

**Minimal RBAC:**
\`\`\`yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k8s-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: k8s-dashboard-read
rules:
  - apiGroups: [""]
    resources: ["pods", "nodes", "services", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: k8s-dashboard
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: k8s-dashboard-read
subjects:
  - kind: ServiceAccount
    name: k8s-dashboard
    namespace: default
\`\`\`

### 3. External VM (Remote Access)

\`\`\`bash
# Prerequisites: kubectl configured on VM
npm run build
npm start
# Or use PM2: pm2 start npm --name "k8s-dashboard" -- start
\`\`\``.trim();
}

// ============================================================================
// CONFIGURATION GUIDE
// ============================================================================

function generateConfigurationGuide(): string {
  return `The dashboard is **100% configuration-driven**. Everything is JSON - no database, no complex setup.

## Where Config Lives

- **Storage**: Browser localStorage
- **Key**: \`podscope-dashboard-config\`
- **Format**: JSON validated with Zod schemas
- **Backup**: Export to file anytime

## Config Structure (Simple!)

\`\`\`json
{
  "version": "1.0.0",
  "queries": { /* Prometheus queries */ },
  "kubeQueries": { /* K8s filters */ },
  "queueProviders": { /* Queue systems */ },
  "queueQueries": { /* Queue filters */ },
  "pages": [ /* Dashboard layout */ ]
}
\`\`\`

That's it! Four main sections:

1. **queries** - PromQL query library (reusable)
2. **kubeQueries** - K8s resource filters (reusable)
3. **queueProviders** - Queue system configs
4. **queueQueries** - Queue filters (reusable)
5. **pages** - Dashboard pages (reference queries by name)

## How to Edit Config

### Option 1: Via UI (Easiest)

The dashboard has a built-in Monaco editor (VS Code editor):

1. Open any page in the dashboard
2. Components will have an edit button/icon
3. Click to open Monaco editor with that component's config
4. Edit JSON → Save → Changes apply immediately
5. Invalid JSON shows errors inline

### Option 2: Import/Export

1. Click **Settings** in navbar
2. **Export Config** → Downloads \`dashboard-config.json\`
3. Edit in your favorite editor (VS Code, vim, etc.)
4. **Import Config** → Upload modified file
5. Config is validated before applying

### Option 3: Browser Console (For Devs)

\`\`\`javascript
// Read config
const cfg = JSON.parse(localStorage.getItem('podscope-dashboard-config'));

// Modify
cfg.pages[0].name = "My New Dashboard";

// Save
localStorage.setItem('podscope-dashboard-config', JSON.stringify(cfg));
location.reload();
\`\`\`

## Validation

Every config change is validated with Zod schemas. Invalid configs show:
- **Field-level errors** - "Expected string, received number"
- **Missing required fields** - "Missing: config.queryRef"
- **Type mismatches** - "Invalid enum value"

This prevents broken dashboards!`.trim();
}

function generateDashboardConfig(): string {
  return `## Dashboard Configuration Schema

\`\`\`typescript
interface DashboardConfig {
  version: string;              // Config version (e.g., "1.0.0")
  queries: QueryLibrary;        // Prometheus query library
  kubeQueries: KubeQueryLibrary; // Kubernetes query library
  pages: PageConfig[];          // Dashboard pages
}
\`\`\`

## Complete Example

\`\`\`json
${JSON.stringify(defaultConfig, null, 2)}
\`\`\`

## Default Dashboard

The default dashboard includes:

- **Overview Page**: Cluster metrics, BullMQ monitor, Pod explorer
- **Query Library**: 15+ pre-built Prometheus queries
- **Kube Query Library**: 8+ Kubernetes resource filters

## Custom Dashboards

You can create completely custom dashboards:

1. **Multiple Pages**: Add tabs for different views (Overview, Pods, Nodes, etc.)
2. **Custom Components**: Mix and match components
3. **Custom Queries**: Define your own PromQL and K8s queries
4. **Layouts**: Drag-and-drop to arrange components`.trim();
}

function generateQuerySystem(): string {
  return `The dashboard uses a **query library system** that allows you to:

1. Define queries once, reference them everywhere
2. Version your queries (e.g., \`cpu_usage_v1-0-0\`)
3. Organize queries by namespace
4. Use variable substitution in PromQL

## Prometheus Query Library

### Structure

\`\`\`typescript
interface QueryLibrary {
  [namespace: string]: {
    [queryName: string]: string; // PromQL string
  };
}
\`\`\`

### Example

\`\`\`json
{
  "queries": {
    "nodeMetrics": {
      "cpu_usage_v1-0-0": "100 - (avg(rate(node_cpu_seconds_total{mode=\\"idle\\"}[5m])) * 100)",
      "memory_total_v1-0-0": "node_memory_MemTotal_bytes"
    },
    "podMetrics": {
      "cpu_rate_v1-0-0": "sum(rate(container_cpu_usage_seconds_total{pod=\\"{{pod}}\\"}[5m])) by (pod)"
    }
  }
}
\`\`\`

### Query References

Reference queries using dot notation: \`promQueries.namespace.queryName\`

Example: \`promQueries.nodeMetrics.cpu_usage_v1-0-0\`

### Variable Substitution

Use \`{{variable}}\` in PromQL for dynamic values:

\`\`\`promql
sum(rate(container_cpu_usage_seconds_total{pod="{{pod}}"}[5m]))
\`\`\`

## Kubernetes Query Library

### Structure

\`\`\`typescript
interface KubeQuery {
  resourceType: "pods" | "services" | "nodes" | "namespaces";
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
}
\`\`\`

### Example

\`\`\`json
{
  "kubeQueries": {
    "podFilters": {
      "failed_pods_v1-0-0": {
        "resourceType": "pods",
        "fieldSelector": "status.phase=Failed"
      }
    }
  }
}
\`\`\`

### Inline Queries

You can also define queries inline in component config:

\`\`\`json
{
  "component": "KubeNamespacePodList",
  "config": {
    "query": {
      "resourceType": "pods",
      "fieldSelector": "status.phase=Failed"
    }
  }
}
\`\`\`

## Query Priority

1. **Inline query** (highest priority) - \`config.query\`
2. **Query reference** - \`config.queryRef\`
3. **Legacy filters** (lowest priority) - \`config.defaultNamespace\``.trim();
}

function generatePagesLayout(): string {
  return `## Pages

Pages are tabs in the dashboard. Each page has:

- **ID**: Unique identifier
- **Name**: Display name
- **Icon**: Lucide icon name
- **Layout**: Array of components with grid positions

### Page Schema

\`\`\`typescript
interface PageConfig {
  id: string;              // Unique ID
  name: string;            // Display name
  icon: string;            // Lucide icon name
  layout: ContainerConfig[]; // Components
}
\`\`\`

## Grid Layout

The dashboard uses a **12-column grid** with drag-and-drop:

- **Columns**: 12 (full width)
- **Row Height**: 60px
- **Compact**: Vertical auto-packing enabled
- **Draggable**: All components can be moved
- **Resizable**: All components can be resized

### Grid Position

\`\`\`typescript
interface GridPosition {
  i: string;   // Unique ID
  x: number;   // Column position (0-11)
  y: number;   // Row position (0+)
  w: number;   // Width in columns (1-12)
  h: number;   // Height in rows (1+)
  minW?: number; // Min width
  minH?: number; // Min height
}
\`\`\`

## Component Containers

Each component in a page is wrapped in a container:

\`\`\`typescript
interface ContainerConfig {
  i: string;              // Unique ID
  x: number;              // X position
  y: number;              // Y position
  w: number;              // Width
  h: number;              // Height
  component: string;      // Component type
  config: any;            // Component-specific config
  minW?: number;          // Min width
  minH?: number;          // Min height
}
\`\`\``.trim();
}

// ============================================================================
// COMPONENTS
// ============================================================================

function generateComponentsGuide(): string {
  return `The dashboard includes **${componentRegistry.length} configurable components** that can be added to any page.

## Available Components

${componentRegistry.map((comp) => `- **${comp.metadata.displayName}** (${comp.metadata.category}) - ${comp.metadata.description}`).join("\n")}

## Component Configuration

All components support:

- **title** (string) - Component title
- **showHeader** (boolean) - Show/hide header bar

Each component also has specific configuration options documented below.`.trim();
}

function generateComponentDocs(comp: any): string {
  const examples = getComponentExamples(comp.type);

  return `## ${comp.metadata.displayName}

${comp.metadata.description}

### Basic Info

- **Type**: \`${comp.type}\`
- **Category**: ${comp.metadata.category}
- **Default Size**: ${comp.metadata.defaultW}w × ${comp.metadata.defaultH}h
- **Minimum Size**: ${comp.metadata.minW}w × ${comp.metadata.minH}h

### Configuration Options

\`\`\`typescript
${getComponentConfigSchema(comp.type)}
\`\`\`

### Examples

${examples
  .map(
    (ex, _i) => `#### ${ex.title}

${ex.description}

\`\`\`json
${JSON.stringify(ex.config, null, 2)}
\`\`\``
  )
  .join("\n\n")}`.trim();
}

function getComponentConfigSchema(type: string): string {
  switch (type) {
    case "PrometheusNodeMetrics":
      return `interface PrometheusNodeMetricsConfig {
  title?: string;
  showHeader?: boolean;
  queryRefs: string[];    // Query references
}`;

    case "KubeNamespacePodList":
      return `interface KubeNamespacePodListConfig {
  title?: string;
  showHeader?: boolean;
  showMetrics?: boolean;
  showLogs?: boolean;
  query?: KubeQuery;      // Inline query
  queryRef?: string;      // Query reference
  defaultNamespace?: string;
}`;

    case "BullMQMonitor":
      return `interface BullMQMonitorConfig {
  title?: string;
  showHeader?: boolean;
}`;

    default:
      return `interface ${type}Config {
  title?: string;
  showHeader?: boolean;
}`;
  }
}

function getComponentExamples(
  type: string
): Array<{ title: string; description: string; config: any }> {
  switch (type) {
    case "KubeNamespacePodList":
      return [
        {
          title: "All Pods",
          description: "Show all pods across all namespaces",
          config: {
            component: "KubeNamespacePodList",
            config: {
              title: "All Pods",
              query: { resourceType: "pods" },
              showHeader: true,
              showMetrics: true,
            },
          },
        },
        {
          title: "Failed Pods",
          description: "Show only failed pods",
          config: {
            component: "KubeNamespacePodList",
            config: {
              title: "Failed Pods",
              query: {
                resourceType: "pods",
                fieldSelector: "status.phase=Failed",
              },
            },
          },
        },
      ];

    case "PrometheusNodeMetrics":
      return [
        {
          title: "Cluster Metrics",
          description: "Display cluster overview",
          config: {
            component: "PrometheusNodeMetrics",
            config: {
              title: "Cluster Metrics",
              queryRefs: [
                "promQueries.nodeMetrics.cpu_usage_v1-0-0",
                "promQueries.nodeMetrics.memory_total_v1-0-0",
              ],
            },
          },
        },
      ];

    default:
      return [];
  }
}

// ============================================================================
// API REFERENCE
// ============================================================================

function generateAPIReference(): string {
  return `The dashboard exposes several API routes for fetching data. All routes are under \`/api/*\`.

## API Categories

- **Kubernetes API** - K8s resource queries via @kubernetes/client-node
- **Prometheus API** - PromQL queries and metrics
- **BullMQ API** - Redis/BullMQ queue monitoring`.trim();
}

function generateKubernetesAPI(): string {
  return `## Kubernetes API Routes

All routes use \`@kubernetes/client-node\` for direct Kubernetes API calls.

### GET /api/kubernetes/pods

List pods (optionally filtered by namespace).

**Query Params:**
- \`namespace\` (optional) - Filter by namespace

**Response:**
\`\`\`typescript
{
  pods: Array<{
    name: string;
    namespace: string;
    status: string;
    phase: string;
    restarts: number;
    age: string;
  }>;
  count: number;
}
\`\`\`

### GET /api/kubernetes/query

Execute Kubernetes query.

**Query Params:**
- \`ref\` (required) - Query reference

**Example:**
\`\`\`
GET /api/kubernetes/query?ref=kubeQueries.podFilters.failed_pods_v1-0-0
\`\`\`

### POST /api/kubernetes/query

Execute inline Kubernetes query.

**Body:**
\`\`\`typescript
{
  resourceType: "pods" | "services" | "nodes";
  namespace?: string;
  labelSelector?: string;
  fieldSelector?: string;
}
\`\`\``.trim();
}

function generatePrometheusAPI(): string {
  return `## Prometheus API Routes

### GET /api/prometheus/metrics

Get pre-aggregated metrics.

**Response:**
\`\`\`typescript
{
  healthy: boolean;
  version: string;
  node: {
    cpuUsage: number;
    memoryTotal: number;
  };
  cluster: {
    nodeCount: number;
    runningPods: number;
  };
}
\`\`\`

### POST /api/prometheus/query

Execute PromQL query.

**Body:**
\`\`\`typescript
{
  query: string;      // PromQL query
  time?: string;      // Timestamp
}
\`\`\``.trim();
}

function generateQueueAPI(): string {
  return `## Queue API Routes

### GET /api/queue/providers

Get all configured queue providers and their health status.

**Response:**
\`\`\`typescript
{
  providers: Array<{
    name: string;
    type: "bullmq" | "rabbitmq" | "sqs" | "kafka";
    displayName: string;
    healthy: boolean;
  }>;
  count: number;
}
\`\`\`

### GET /api/queue/query

Execute queue query by reference.

**Query Params:**
- \`ref\` (required) - Query reference (e.g., "queueQueries.jobFilters.failed_jobs_v1-0-0")

**Example:**
\`\`\`
GET /api/queue/query?ref=queueQueries.jobFilters.failed_jobs_v1-0-0
\`\`\`

**Response:**
\`\`\`typescript
{
  provider: string;
  providerType: string;
  queue?: string;
  queues?: Array<QueueInfo>;
  jobs?: Array<Job>;
  count: number;
}
\`\`\`

### POST /api/queue/query

Execute inline queue query.

**Body:**
\`\`\`typescript
{
  provider: string;
  queue?: string;
  status?: "pending" | "processing" | "completed" | "failed" | "delayed";
  limit?: number;
  providerOptions?: {
    instance?: string;  // BullMQ specific
    topic?: string;     // Kafka specific
    // ... other provider-specific options
  };
}
\`\`\`

**Example:**
\`\`\`bash
curl -X POST /api/queue/query \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "redis-bullmq",
    "queue": "emails",
    "status": "failed",
    "limit": 20
  }'
\`\`\``.trim();
}

// ============================================================================
// QUEUE MONITORING
// ============================================================================

function generateQueueMonitoringGuide(): string {
  return `The dashboard includes a **generic, provider-agnostic queue monitoring system** that supports multiple queue technologies:

- **Redis-based**: BullMQ, Bull, Bee-Queue, Kue
- **Message Brokers**: RabbitMQ, NATS, Apache Kafka
- **Cloud Services**: AWS SQS, Google Cloud Pub/Sub, Azure Service Bus

## Key Features

### 🔌 Provider-Agnostic
- Monitor multiple queue systems simultaneously
- Consistent interface across all providers
- Easy to add new providers without code changes

### 📊 Normalized Data
- Unified job statuses: pending, processing, completed, failed, delayed
- Consistent queue statistics across providers
- Provider-specific metadata preserved

### 🎯 Query-Based
- Define queries once, reuse everywhere
- Inline queries or query references
- Version your queries like Prometheus/Kubernetes

### 🔧 Fully Configurable
- JSON-based provider configuration
- Environment variable support
- Multiple instances per provider type`.trim();
}

function generateQueueSystemOverview(): string {
  return `## Architecture

The queue monitoring system consists of three layers:

### 1. Provider Layer
Each queue technology (BullMQ, RabbitMQ, SQS, etc.) has an adapter that implements the \`QueueProvider\` interface:

\`\`\`typescript
interface QueueProvider {
  type: QueueProviderType;
  capabilities: ProviderCapabilities;

  connect(config: ProviderConnection): Promise<void>;
  disconnect(): Promise<void>;
  listQueues(): Promise<QueueInfo[]>;
  getQueueStats(queueName: string): Promise<QueueInfo>;
  getJobs(query: QueueQuery): Promise<Job[]>;
  isHealthy(): Promise<boolean>;
}
\`\`\`

### 2. Registry Layer
The \`QueueProviderRegistry\` manages all provider instances:
- Initializes providers from dashboard config
- Routes queries to appropriate providers
- Handles provider lifecycle

### 3. API Layer
REST endpoints for executing queries:
- \`GET /api/queue/providers\` - List configured providers
- \`GET /api/queue/query?ref=...\` - Execute by reference
- \`POST /api/queue/query\` - Execute inline query

## Normalized Job Status

All providers map their statuses to these normalized values:

| Normalized Status | BullMQ | RabbitMQ | SQS | Kafka |
|------------------|---------|----------|-----|-------|
| **pending** | waiting | ready | available | unconsumed |
| **processing** | active | unacked | in-flight | processing |
| **completed** | completed | acked | deleted | committed |
| **failed** | failed | rejected | - | failed |
| **delayed** | delayed | scheduled | delayed | - |

## Universal Concepts

Despite differences, all queue systems share:

| Concept | Description | Examples |
|---------|-------------|----------|
| **Queues/Topics** | Named containers for messages | Queue name, topic, exchange |
| **Jobs/Messages** | Individual work items | Job data, message payload |
| **States** | Current status | Pending, processing, done |
| **Metrics** | Statistics | Depth, rate, errors |
| **Dead Letter** | Failed message handling | DLQ, failed queue |`.trim();
}

function generateQueueProvidersGuide(): string {
  return `## Configuring Queue Providers

Queue providers are defined in the \`queueProviders\` section of your dashboard config.

### Provider Configuration Schema

\`\`\`typescript
{
  "queueProviders": {
    "[provider-name]": {
      "type": "bullmq" | "rabbitmq" | "sqs" | "kafka" | "gcp-pubsub",
      "displayName": "Human-readable name",
      "connection": {
        // Provider-specific connection config
      }
    }
  }
}
\`\`\`

### BullMQ Provider

\`\`\`json
{
  "queueProviders": {
    "redis-bullmq": {
      "type": "bullmq",
      "displayName": "Redis BullMQ",
      "connection": {
        "instances": "default:localhost:6379"
      }
    }
  }
}
\`\`\`

**Connection Options:**
- \`instances\`: References REDIS_INSTANCES env var or direct connection string

### RabbitMQ Provider (Future)

\`\`\`json
{
  "queueProviders": {
    "rabbitmq-prod": {
      "type": "rabbitmq",
      "displayName": "RabbitMQ Production",
      "connection": {
        "host": "rabbitmq.example.com",
        "port": 5672,
        "username": "guest",
        "password": "\${RABBITMQ_PASSWORD}",
        "vhost": "/"
      }
    }
  }
}
\`\`\`

### AWS SQS Provider (Future)

\`\`\`json
{
  "queueProviders": {
    "aws-sqs": {
      "type": "sqs",
      "displayName": "AWS SQS",
      "connection": {
        "region": "us-east-1",
        "credentials": "default"
      }
    }
  }
}
\`\`\`

### Apache Kafka Provider (Future)

\`\`\`json
{
  "queueProviders": {
    "kafka-cluster": {
      "type": "kafka",
      "displayName": "Kafka Production",
      "connection": {
        "brokers": ["kafka1:9092", "kafka2:9092"],
        "clientId": "k8s-dashboard",
        "ssl": true
      }
    }
  }
}
\`\`\`

### Google Cloud Pub/Sub Provider (Future)

\`\`\`json
{
  "queueProviders": {
    "gcp-pubsub": {
      "type": "gcp-pubsub",
      "displayName": "Google Cloud Pub/Sub",
      "connection": {
        "projectId": "my-project",
        "credentials": "\${GOOGLE_APPLICATION_CREDENTIALS}"
      }
    }
  }
}
\`\`\`

## Multiple Providers

You can configure multiple providers of the same type:

\`\`\`json
{
  "queueProviders": {
    "redis-cache": {
      "type": "bullmq",
      "displayName": "Redis Cache",
      "connection": { "instances": "cache:localhost:6380" }
    },
    "redis-jobs": {
      "type": "bullmq",
      "displayName": "Redis Jobs",
      "connection": { "instances": "jobs:localhost:6381" }
    }
  }
}
\`\`\`

## Environment Variables

Use environment variables for sensitive data:

\`\`\`bash
# .env.local
REDIS_INSTANCES=default:localhost:6379,cache:localhost:6380
RABBITMQ_PASSWORD=secret123
AWS_REGION=us-east-1
KAFKA_BROKERS=kafka1:9092,kafka2:9092
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
\`\`\`

Reference in config with \`\${VAR_NAME}\`:

\`\`\`json
{
  "connection": {
    "password": "\${RABBITMQ_PASSWORD}"
  }
}
\`\`\``.trim();
}

function generateQueueQueriesGuide(): string {
  return `## Defining Queue Queries

Queue queries are defined in the \`queueQueries\` section, organized by namespace.

### Query Schema

\`\`\`typescript
interface QueueQuery {
  provider: string;        // Reference to queueProviders
  queue?: string;          // Queue/topic name (optional for listing all)
  status?: "pending" | "processing" | "completed" | "failed" | "delayed";
  limit?: number;          // Max results (default: 20)
  providerOptions?: {      // Provider-specific options
    instance?: string;     // BullMQ: Redis instance
    topic?: string;        // Kafka: Topic name
    partition?: number;    // Kafka: Partition number
    // ... more provider-specific fields
  };
}
\`\`\`

### Example Queries

\`\`\`json
{
  "queueQueries": {
    "jobFilters": {
      "all_queues_v1-0-0": {
        "provider": "redis-bullmq"
      },
      "failed_jobs_v1-0-0": {
        "provider": "redis-bullmq",
        "status": "failed"
      },
      "email_queue_v1-0-0": {
        "provider": "redis-bullmq",
        "queue": "emails",
        "status": "failed",
        "limit": 50
      }
    },
    "sqs_queries": {
      "dead_letter_v1-0-0": {
        "provider": "aws-sqs",
        "queue": "my-app-dlq"
      }
    },
    "kafka_queries": {
      "order_events_v1-0-0": {
        "provider": "kafka-cluster",
        "providerOptions": {
          "topic": "orders",
          "partition": 0,
          "consumerGroup": "payment-processor"
        }
      }
    }
  }
}
\`\`\`

### Query Reference Format

Reference queries using dot notation:

\`\`\`
queueQueries.namespace.queryName_version
\`\`\`

Examples:
- \`queueQueries.jobFilters.failed_jobs_v1-0-0\`
- \`queueQueries.sqs_queries.dead_letter_v1-0-0\`
- \`queueQueries.kafka_queries.order_events_v1-0-0\`

### Inline Queries

You can also define queries inline in component config:

\`\`\`json
{
  "component": "QueueMonitor",
  "config": {
    "title": "Failed Email Jobs",
    "query": {
      "provider": "redis-bullmq",
      "queue": "emails",
      "status": "failed",
      "limit": 20
    }
  }
}
\`\`\`

### Query Priority

When a component supports multiple query methods:

1. **Inline query** (highest) - \`config.query\`
2. **Query reference** - \`config.queryRef\`
3. **Default behavior** (lowest) - Show all queues

## Query Versioning

Use semantic versioning in query names:

- \`failed_jobs_v1-0-0\` - Initial version
- \`failed_jobs_v1-1-0\` - Minor update (backward compatible)
- \`failed_jobs_v2-0-0\` - Major update (breaking change)

This allows:
- Multiple versions to coexist
- Gradual migration to new queries
- Rollback if needed`.trim();
}

function generateBullMQProviderGuide(): string {
  return `## BullMQ Provider

BullMQ is a Redis-based queue system for Node.js with advanced features.

### Current Status

✅ **Fully Implemented** - BullMQ provider is production-ready

### Prerequisites

1. **Redis** server accessible
2. **REDIS_INSTANCES** env var configured
3. BullMQ queues created in your application

### Configuration

**Environment Variable:**
\`\`\`bash
REDIS_INSTANCES=default:localhost:6379,cache:localhost:6380
\`\`\`

**Dashboard Config:**
\`\`\`json
{
  "queueProviders": {
    "redis-bullmq": {
      "type": "bullmq",
      "displayName": "Redis BullMQ",
      "connection": {
        "instances": "default:localhost:6379"
      }
    }
  }
}
\`\`\`

### Supported Features

| Feature | Supported | Notes |
|---------|-----------|-------|
| List queues | ✅ | All queues across instances |
| Queue stats | ✅ | Waiting, active, completed, failed, delayed counts |
| Job listing | ✅ | Filter by status |
| Job details | ✅ | Full job data, attempts, errors |
| Delayed jobs | ✅ | Scheduled jobs support |
| Job retry | ✅ | Attempt tracking |
| Priority | ✅ | Job priority metadata |
| Progress | ✅ | Job progress (0-100) |

### Example Queries

**List all queues:**
\`\`\`json
{
  "provider": "redis-bullmq"
}
\`\`\`

**Failed jobs in specific queue:**
\`\`\`json
{
  "provider": "redis-bullmq",
  "queue": "emails",
  "status": "failed",
  "limit": 50
}
\`\`\`

**Delayed jobs with instance filter:**
\`\`\`json
{
  "provider": "redis-bullmq",
  "status": "delayed",
  "providerOptions": {
    "instance": "cache"
  }
}
\`\`\`

### Status Mapping

| BullMQ Status | Normalized Status |
|---------------|-------------------|
| waiting | pending |
| active | processing |
| completed | completed |
| failed | failed |
| delayed | delayed |

### Job Metadata

BullMQ jobs include provider-specific metadata:

\`\`\`typescript
{
  providerMetadata: {
    delay: number;           // Delay in milliseconds
    priority: number;        // Job priority
    returnValue: any;        // Job return value
    name: string;           // Job name/type
  }
}
\`\`\``.trim();
}

function generateAddingProvidersGuide(): string {
  return `## Adding New Queue Providers

Want to add RabbitMQ, SQS, or Kafka support? Here's how!

### Step 1: Create Provider Adapter

Create a new file in \`src/lib/queues/[provider-name].ts\`:

\`\`\`typescript
import {
  QueueProvider,
  QueueProviderType,
  ProviderCapabilities,
  QueueQuery,
  QueueInfo,
  Job,
  QueueJobStatus,
} from "./base";

export class MyQueueProvider implements QueueProvider {
  type = QueueProviderType.MY_QUEUE;

  capabilities: ProviderCapabilities = {
    supportsDelayedJobs: true,     // Does provider support delayed jobs?
    supportsJobRetry: true,        // Does provider support retries?
    supportsPriority: false,       // Does provider support priority?
    supportsDeadLetter: true,      // Does provider have DLQ?
    supportsJobProgress: false,    // Does provider track progress?
    supportsMultipleQueues: true,  // Multiple queues per provider?
  };

  async connect(config: ProviderConnection): Promise<void> {
    // Initialize connection to queue system
  }

  async disconnect(): Promise<void> {
    // Clean up connections
  }

  async listQueues(): Promise<QueueInfo[]> {
    // Fetch all queues and return normalized QueueInfo[]
  }

  async getQueueStats(queueName: string): Promise<QueueInfo> {
    // Get stats for specific queue
  }

  async getJobs(query: QueueQuery): Promise<Job[]> {
    // Fetch jobs based on query
    // Map provider-specific status to normalized status
  }

  async isHealthy(): Promise<boolean> {
    // Check if provider is connected and operational
  }

  // Private helper methods for status mapping
  private normalizeStatus(providerStatus: string): QueueJobStatus {
    // Map provider statuses to normalized statuses
  }
}
\`\`\`

### Step 2: Register Provider Type

Add to \`QueueProviderType\` enum in \`base.ts\`:

\`\`\`typescript
export enum QueueProviderType {
  BULLMQ = "bullmq",
  MY_QUEUE = "my-queue",  // Add here
}
\`\`\`

### Step 3: Add to Provider Factory

Update \`createProvider()\` in \`registry.ts\`:

\`\`\`typescript
function createProvider(type: QueueProviderType): QueueProvider {
  switch (type) {
    case QueueProviderType.BULLMQ:
      return new BullMQProvider();

    case QueueProviderType.MY_QUEUE:
      return new MyQueueProvider();

    default:
      throw new Error(\`Unsupported provider: \${type}\`);
  }
}
\`\`\`

### Step 4: Add Connection Schema

Update \`schema.ts\`:

\`\`\`typescript
export const MyQueueConnectionSchema = z.object({
  host: z.string(),
  port: z.number(),
  // ... provider-specific fields
});

export const QueueProviderConfigSchema = z.object({
  type: z.enum(["bullmq", "my-queue", /* ... */]),
  displayName: z.string(),
  connection: z.union([
    BullMQConnectionSchema,
    MyQueueConnectionSchema,
    // ... other schemas
  ]),
});
\`\`\`

### Step 5: Document the Provider

Add provider-specific documentation (like this BullMQ guide).

### Example: RabbitMQ Provider

\`\`\`typescript
export class RabbitMQProvider implements QueueProvider {
  type = QueueProviderType.RABBITMQ;
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect(config: RabbitMQConnection): Promise<void> {
    this.connection = await amqp.connect({
      hostname: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      vhost: config.vhost,
    });
    this.channel = await this.connection.createChannel();
  }

  async listQueues(): Promise<QueueInfo[]> {
    // Use RabbitMQ management API to list queues
    const queues = await this.channel.assertQueue(...);
    return queues.map(q => this.normalizeQueueInfo(q));
  }

  // ... implement other methods
}
\`\`\`

### Testing Your Provider

1. **Unit Tests**: Test status mapping, normalization
2. **Integration Tests**: Test against real queue system
3. **Health Check**: Verify \`isHealthy()\` works correctly
4. **Error Handling**: Test connection failures, timeout scenarios

### Best Practices

1. ✅ **Always normalize statuses** - Use the standard 5 statuses
2. ✅ **Preserve metadata** - Put provider-specific data in \`providerMetadata\`
3. ✅ **Handle errors gracefully** - Don't crash on connection issues
4. ✅ **Implement health checks** - Return false, don't throw
5. ✅ **Document capabilities** - Be honest about what's supported
6. ✅ **Version your queries** - Use semantic versioning

### Contributing

Want to contribute a provider? We'd love:
- RabbitMQ
- AWS SQS
- Apache Kafka
- Google Cloud Pub/Sub
- Azure Service Bus

Open a PR with your provider implementation!`.trim();
}

// ============================================================================
// DEPLOYMENT
// ============================================================================

function generateDeploymentGuide(): string {
  return `Deploy the K8s Dashboard in various environments:

- **Local Development** - Run on your machine with kubectl configured
- **In-Cluster** - Deploy inside Kubernetes with ServiceAccount
- **External VM** - Deploy on a server with kubectl access`.trim();
}

function generateLocalDeployment(): string {
  return `## Local Development Setup

Run the dashboard on your local machine for development.

### Prerequisites

1. **Node.js 20+** installed
2. **kubectl** configured with \`~/.kube/config\`
3. **Prometheus** accessible (local or remote)

### Setup Steps

\`\`\`bash
# Clone repository
git clone <your-repo-url>
cd podscope

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
\`\`\`

### Environment Configuration

\`\`\`bash
# .env.local
PROMETHEUS_URL=http://localhost:9090
KUBECTL_CONTEXT=                    # Leave empty for default
REDIS_INSTANCES=default:localhost:6379
\`\`\`

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Dashboard available at: [http://localhost:3000](http://localhost:3000)`.trim();
}

function generateClusterDeployment(): string {
  return `## In-Cluster Deployment

Deploy the dashboard inside Kubernetes with ServiceAccount authentication.

### Prerequisites

1. Kubernetes cluster (1.19+)
2. Prometheus accessible from cluster
3. kubectl access to cluster

### Step 1: Create ServiceAccount & RBAC

\`\`\`yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k8s-dashboard
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: k8s-dashboard
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods", "nodes", "services"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: k8s-dashboard
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: k8s-dashboard
subjects:
  - kind: ServiceAccount
    name: k8s-dashboard
    namespace: monitoring
\`\`\`

### Step 2: Create Deployment

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-dashboard
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-dashboard
  template:
    metadata:
      labels:
        app: k8s-dashboard
    spec:
      serviceAccountName: k8s-dashboard
      containers:
        - name: dashboard
          image: your-registry/k8s-dashboard:latest
          ports:
            - containerPort: 3000
          env:
            - name: PROMETHEUS_URL
              value: "http://prometheus:9090"
\`\`\``.trim();
}

function generateExternalDeployment(): string {
  return `## External VM Deployment

Deploy on an external server with kubectl access.

### Prerequisites

1. **VM** with Node.js 20+
2. **kubectl** configured on VM
3. **Prometheus** accessible from VM

### Setup Steps

\`\`\`bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd podscope

# Install dependencies
npm install

# Build application
npm run build

# Configure environment
cp .env.example .env.local
nano .env.local

# Start with PM2
pm2 start npm --name "k8s-dashboard" -- start
pm2 save
pm2 startup
\`\`\``.trim();
}

// ============================================================================
// EXAMPLES
// ============================================================================

function generateExamples(): string {
  return `## Example Configurations

### Example 1: Failed Pods Monitor

\`\`\`json
{
  "i": "failed-pods",
  "x": 0, "y": 0, "w": 6, "h": 8,
  "component": "KubeNamespacePodList",
  "config": {
    "title": "Failed Pods",
    "query": {
      "resourceType": "pods",
      "fieldSelector": "status.phase=Failed"
    },
    "showLogs": true
  }
}
\`\`\`

### Example 2: Production Namespace

\`\`\`json
{
  "i": "prod-pods",
  "x": 0, "y": 0, "w": 12, "h": 8,
  "component": "KubeNamespacePodList",
  "config": {
    "title": "Production",
    "query": {
      "resourceType": "pods",
      "namespace": "production",
      "fieldSelector": "status.phase=Running"
    }
  }
}
\`\`\`

### Example 3: Frontend Tier

\`\`\`json
{
  "i": "frontend",
  "x": 0, "y": 0, "w": 6, "h": 8,
  "component": "KubeNamespacePodList",
  "config": {
    "title": "Frontend",
    "query": {
      "resourceType": "pods",
      "labelSelector": "tier=frontend"
    }
  }
}
\`\`\``.trim();
}

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

function generateTroubleshooting(): string {
  return `## Common Issues

### Kubernetes Connection Issues

**Symptom:** "Disconnected" badge in navbar

**Solutions:**

1. Check kubectl config:
\`\`\`bash
kubectl cluster-info
kubectl get nodes
\`\`\`

2. Verify kubeconfig:
\`\`\`bash
cat ~/.kube/config
\`\`\`

3. Check KUBECTL_CONTEXT in .env.local

### Prometheus Connection Issues

**Symptom:** "Prometheus Down" badge

**Solutions:**

1. Verify Prometheus URL:
\`\`\`bash
curl \${PROMETHEUS_URL}/api/v1/status/config
\`\`\`

2. Check Prometheus is scraping targets

### Empty Metrics

**Symptom:** Dashboard shows 0 or N/A for all metrics

**Solutions:**

1. Verify exporters are running:
\`\`\`bash
kubectl get pods -n kube-system | grep -E 'node-exporter|kube-state-metrics'
\`\`\`

2. Check Prometheus targets page

### Component Not Showing Data

**Symptom:** Component renders but shows "No data"

**Solutions:**

1. Check component config in browser console
2. Verify query references are correct
3. Test API endpoints directly`.trim();
}

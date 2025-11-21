# PodScope

A fast, lightweight Kubernetes monitoring dashboard. Built with Next.js 15, React 19, and TypeScript, this dashboard provides real-time visibility into your Kubernetes infrastructure and Prometheus metrics without the complexity of traditional monitoring solutions.

## Features

- **Real-time Kubernetes Monitoring** - Monitor pods, nodes, deployments, services, and other cluster resources
- **PromQL Query Support** - Execute custom Prometheus/VictoriaMetrics queries with a built-in macro system
- **BullMQ Queue Monitoring** - Track job queues, failed jobs, and queue metrics across multiple Redis instances
- **Customizable Dashboard** - Drag-and-drop layout with configurable panels and refresh intervals
- **Component Library** - Pre-built visualization components for common monitoring needs
- **In-Cluster Deployment** - Runs securely inside your cluster with RBAC support
- **No Database Required** - Configuration stored in browser localStorage for zero infrastructure overhead
- **Security First** - Command whitelisting, rate limiting, and RBAC support for production deployments
- **TypeScript Native** - Full type safety with Zod schema validation

## Prerequisites

- **Kubernetes Cluster** - Version 1.19 or higher
- **Helm 3** - For installation
- **Prometheus or VictoriaMetrics** - Accessible via HTTP (required for metrics queries)
- **Redis** (Optional) - Required only if you want to monitor BullMQ job queues

## Installation

### Install via Helm

Install PodScope from GitHub Container Registry:

```bash
helm install podscope oci://ghcr.io/kadajett/charts/podscope \
  --set config.prometheusUrl="http://prometheus.monitoring.svc.cluster.local:9090"
```

To install a specific version:

```bash
helm install podscope oci://ghcr.io/kadajett/charts/podscope --version 0.1.0 \
  --set config.prometheusUrl="http://prometheus.monitoring.svc.cluster.local:9090"
```

### Install with Custom Values

Create a `values.yaml` file with your configuration:

```yaml
# values.yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"
  victoriaMetricsUrl: ""
  grafanaUrl: ""
  redisInstances: "myapp:redis.default.svc.cluster.local:6379"
  kubectlExecRateLimit: "10"
  logging:
    level: "info"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: podscope.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: podscope-tls
      hosts:
        - podscope.example.com

resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

Install with your custom values:

```bash
helm install podscope oci://ghcr.io/kadajett/charts/podscope \
  --values values.yaml
```

## Configuration

### Required Configuration

The only required configuration is the Prometheus URL:

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"
```

### Optional Configuration

#### VictoriaMetrics Support

If you're using VictoriaMetrics instead of or alongside Prometheus:

```yaml
config:
  victoriaMetricsUrl: "http://victoria-metrics.monitoring.svc.cluster.local:8428"
```

#### BullMQ Queue Monitoring

Monitor BullMQ job queues by providing Redis connection details:

```yaml
config:
  redisInstances: "myapp:redis.default.svc.cluster.local:6379,cache:redis.cache.svc.cluster.local:6379"
```

Format: `name:host:port` or `name:host:port:password` (comma-separated for multiple instances)

#### Grafana Integration

Connect to Grafana for additional features:

```yaml
config:
  grafanaUrl: "http://grafana.monitoring.svc.cluster.local:3000"

secrets:
  grafanaApiKey: "your-grafana-api-key"
```

#### Security Configuration

Configure rate limiting for sensitive operations:

```yaml
config:
  kubectlExecRateLimit: "10"  # Requests per minute
```

### Ingress Configuration

#### Standard Kubernetes Ingress

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: podscope.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: podscope-tls
      hosts:
        - podscope.example.com
```

#### Tailscale Ingress (Optional)

For secure external access via Tailscale network (requires Tailscale Operator):

```yaml
tailscale:
  enabled: true
  hostname: "podscope"
  tags: "tag:k8s"
```

### RBAC Configuration

By default, PodScope creates a ServiceAccount with necessary ClusterRole permissions. To use an existing ServiceAccount:

```yaml
serviceAccount:
  create: false
  name: "existing-service-account"

rbac:
  create: false
```

To add additional permissions:

```yaml
rbac:
  create: true
  additionalRules:
    - apiGroups: ["custom.example.com"]
      resources: ["customresources"]
      verbs: ["get", "list", "watch"]
```

## Accessing the Dashboard

After installation, access PodScope based on your configuration:

### Via ClusterIP (default)

Port-forward to access locally:

```bash
kubectl port-forward svc/podscope 3000:80
```

Navigate to [http://localhost:3000](http://localhost:3000)

### Via Ingress

Access via your configured hostname (e.g., `https://podscope.example.com`)

### Via Tailscale

Access via your Tailscale hostname (e.g., `https://podscope.your-tailnet.ts.net`)

## Usage

### Dashboard Configuration

The dashboard layout and components are configured in your browser's localStorage:

- **Add Components** - Click "Add Component" to add monitoring panels
- **Configure Panels** - Click settings icon on each panel to customize
- **Rearrange** - Drag panels to reposition
- **Resize** - Drag panel corners to resize
- **Save/Load** - Export/import dashboard configurations via Settings

### Available Components

- **Pod List** - View and monitor pod status, restarts, and resource usage
- **Node Overview** - Cluster node health and capacity
- **Deployment Status** - Track deployment rollouts and replica counts
- **Service Endpoints** - Monitor service availability
- **PromQL Query** - Execute custom Prometheus queries
- **Queue Monitor** - BullMQ job queue metrics and failed jobs
- **Resource Charts** - CPU, memory, and network usage graphs
- **Event Stream** - Real-time Kubernetes events

### PromQL Macros

PodScope includes a macro system for PromQL queries:

- `@namespace` - Current selected namespace
- `@pod` - Selected pod name
- `@node` - Selected node name
- Custom macros can be defined in component settings

## Upgrading

```bash
# Update to latest version
helm upgrade podscope oci://ghcr.io/kadajett/charts/podscope \
  --reuse-values

# Update with new configuration
helm upgrade podscope oci://ghcr.io/kadajett/charts/podscope \
  --values values.yaml
```

## Uninstalling

```bash
helm uninstall podscope
```

## Troubleshooting

### Cannot connect to Kubernetes API

Check RBAC permissions:

```bash
kubectl describe clusterrole podscope
kubectl describe clusterrolebinding podscope
```

### Cannot query Prometheus

Verify Prometheus URL is accessible from within the cluster:

```bash
kubectl exec -it deployment/podscope -- curl http://prometheus.monitoring.svc.cluster.local:9090/-/healthy
```

### Dashboard not loading

Check pod logs:

```bash
kubectl logs -f deployment/podscope
```

Check pod status:

```bash
kubectl get pods -l app.kubernetes.io/name=podscope
```

## Support and Documentation

- **GitHub Issues**: [https://github.com/Kadajett/PodScope/issues](https://github.com/Kadajett/PodScope/issues)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Contributing Guide**: [CONTRIBUTORS.md](./CONTRIBUTORS.md)
- **In-App Documentation**: Navigate to `/docs` in the dashboard for component guides

## License

This project is licensed under the Business Source License 1.1 (BSL-1.1) - see the [LICENSE.md](./LICENSE.md) file for details.

**TL;DR:** Free for personal, homelab, and internal business use. After 5 years, each version becomes Apache 2.0. You cannot use it to build a competing commercial product.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [TanStack Query](https://tanstack.com/query) - Server state management
- [Kubernetes JavaScript Client](https://github.com/kubernetes-client/javascript) - K8s API access

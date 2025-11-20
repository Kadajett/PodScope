# PodScope Helm Chart

Lightweight Kubernetes monitoring dashboard with Prometheus integration.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- Prometheus or VictoriaMetrics accessible from the cluster

## Installation

### Add Helm Repository

```bash
helm repo add podscope https://kadajett.github.io/PodScope/
helm repo update
```

### Install Chart

```bash
# Install with default configuration
helm install podscope podscope/podscope

# Install with custom values
helm install podscope podscope/podscope -f values.yaml

# Install in specific namespace
helm install podscope podscope/podscope --namespace monitoring --create-namespace
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/Kadajett/PodScope.git
cd PodScope

# Install the chart
helm install podscope ./charts/podscope
```

## Configuration

The following table lists the configurable parameters and their default values.

### Application Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.prometheusUrl` | Prometheus server URL (required) | `http://prometheus.monitoring.svc.cluster.local:9090` |
| `config.victoriaMetricsUrl` | Victoria Metrics URL (optional) | `""` |
| `config.grafanaUrl` | Grafana URL (optional) | `""` |
| `config.kubectlContext` | Kubernetes context (empty for in-cluster) | `""` |
| `config.kubectlExecRateLimit` | Rate limit for exec endpoint | `"10"` |
| `config.redisInstances` | Redis instances for BullMQ monitoring | `""` |
| `config.logging.level` | Log level (trace/debug/info/warn/error/fatal) | `info` |
| `config.logging.destination` | Log destination (stdout/file path) | `stdout` |

### Deployment Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `1` |
| `image.repository` | Container image repository | `ghcr.io/kadajett/podscope` |
| `image.tag` | Container image tag | `Chart appVersion` |
| `image.pullPolicy` | Image pull policy | `Always` |
| `imagePullSecrets` | Image pull secrets | `[]` |

### Service Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `3000` |

### Ingress Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `""` |
| `ingress.annotations` | Ingress annotations | `{}` |
| `ingress.hosts` | Ingress hosts configuration | See `values.yaml` |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### Tailscale Configuration (Optional)

**Note:** Requires Tailscale Operator to be installed in your cluster. Alternative to standard Ingress.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `tailscale.enabled` | Enable Tailscale ingress | `false` |
| `tailscale.hostname` | Tailscale hostname | `podscope` |
| `tailscale.tags` | Tailscale tags | `tag:k8s` |

### RBAC Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rbac.create` | Create RBAC resources | `true` |
| `rbac.additionalRules` | Additional ClusterRole rules | `[]` |
| `serviceAccount.create` | Create service account | `true` |
| `serviceAccount.name` | Service account name | Chart fullname |
| `serviceAccount.annotations` | Service account annotations | `{}` |

### Resources

| Parameter | Description | Default |
|-----------|-------------|---------|
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |

### Secrets

| Parameter | Description | Default |
|-----------|-------------|---------|
| `secrets.existingSecret` | Use existing secret | `""` |
| `secrets.grafanaApiKey` | Grafana API key | `""` |
| `secrets.redisPassword` | Redis password | `""` |

## Example Configurations

### Minimal Installation

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"
```

```bash
helm install podscope podscope/podscope --set config.prometheusUrl=http://prometheus.monitoring.svc.cluster.local:9090
```

### With Ingress

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
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

### With BullMQ Monitoring

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"
  redisInstances: "app:redis.default.svc.cluster.local:6379,cache:redis.cache.svc.cluster.local:6379"
```

### With Tailscale

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"

tailscale:
  enabled: true
  hostname: "podscope"
  tags: "tag:k8s"
```

## Upgrading

```bash
helm upgrade podscope podscope/podscope -f values.yaml
```

## Uninstalling

```bash
helm uninstall podscope
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -l app.kubernetes.io/name=podscope
```

### View Logs

```bash
kubectl logs -l app.kubernetes.io/name=podscope -f
```

### Verify Configuration

```bash
kubectl get configmap podscope-config -o yaml
```

### Test Prometheus Connection

```bash
kubectl exec -it <podscope-pod-name> -- curl http://prometheus.monitoring.svc.cluster.local:9090/api/v1/status/config
```

## Support

- GitHub: https://github.com/Kadajett/PodScope
- Issues: https://github.com/Kadajett/PodScope/issues
- Documentation: https://github.com/Kadajett/PodScope#readme

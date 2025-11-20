# PodScope Deployment Guide

This guide covers deploying PodScope to your Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+ cluster with kubectl configured
- Helm 3.0+ (for Helm installation)
- Prometheus or VictoriaMetrics accessible from the cluster
- (Optional) Tailscale Operator for external access via Tailscale
- (Optional) Redis for BullMQ queue monitoring

## Installation Methods

### Method 1: Helm Chart (Recommended)

Helm is the easiest way to install and manage PodScope.

#### Quick Install

```bash
# Add the Helm repository
helm repo add podscope https://kadajett.github.io/PodScope/
helm repo update

# Install PodScope
helm install podscope podscope/podscope \
  --namespace monitoring \
  --create-namespace \
  --set config.prometheusUrl=http://prometheus.monitoring.svc.cluster.local:9090
```

#### Custom Installation

Create a `values.yaml` file:

```yaml
config:
  # Prometheus URL (required)
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"

  # Optional: BullMQ monitoring
  redisInstances: "app:redis.default.svc.cluster.local:6379"

  # Optional: Victoria Metrics
  victoriaMetricsUrl: ""

  # Optional: Grafana integration
  grafanaUrl: ""

# Enable ingress
ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: podscope.example.com
      paths:
        - path: /
          pathType: Prefix

# Resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

Install with custom values:

```bash
helm install podscope podscope/podscope -f values.yaml --namespace monitoring --create-namespace
```

#### Helm Configuration Options

See the [Helm Chart README](./charts/podscope/README.md) for all available configuration options.

**Common configurations:**

- `config.prometheusUrl` - Prometheus server URL (required)
- `config.redisInstances` - Redis instances for BullMQ monitoring
- `ingress.enabled` - Enable ingress controller
- `tailscale.enabled` - Enable Tailscale ingress
- `resources` - CPU and memory limits

#### Upgrading

```bash
helm upgrade podscope podscope/podscope -f values.yaml
```

#### Uninstalling

```bash
helm uninstall podscope --namespace monitoring
```

---

### Method 2: Manual kubectl (Advanced)

For users who prefer direct kubectl deployment or need customization beyond Helm.

#### Step 1: Build and Push Docker Image

```bash
# Build the image
docker build -t ghcr.io/kadajett/podscope:latest .

# Push to registry
docker push ghcr.io/kadajett/podscope:latest
```

#### Step 2: Configure the Application

Edit `k8s/configmap.yaml` to match your environment:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: podscope-config
  namespace: podscope
data:
  PROMETHEUS_URL: "http://prometheus.monitoring.svc.cluster.local:9090"
  REDIS_INSTANCES: "app:redis.default.svc.cluster.local:6379"
  KUBECTL_EXEC_RATE_LIMIT: "10"
  LOG_LEVEL: "info"
```

Update `k8s/deployment.yaml` with your image:

```yaml
image: ghcr.io/kadajett/podscope:latest
```

#### Step 3: Create Secrets (Optional)

If you need Grafana API access or Redis authentication:

```bash
cp k8s/secret.yaml.example k8s/secret.yaml
# Edit k8s/secret.yaml with your credentials
kubectl apply -f k8s/secret.yaml
```

#### Step 4: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply in order:
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Optional: Tailscale ingress
kubectl apply -f k8s/tailscale-ingress.yaml
```

#### Step 5: Verify Deployment

```bash
# Check pod status
kubectl get pods -n podscope

# View logs
kubectl logs -n podscope -l app=podscope -f

# Test the service
kubectl port-forward -n podscope svc/podscope 3000:80
# Open http://localhost:3000
```

---

## Access Methods

### ClusterIP (Default)

Access via port-forward:

```bash
kubectl port-forward svc/podscope 3000:80 -n monitoring
```

Open http://localhost:3000

### Ingress

Configure in `values.yaml`:

```yaml
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

### Tailscale

For secure external access via Tailscale:

```yaml
tailscale:
  enabled: true
  hostname: "podscope"
  tags: "tag:k8s"
```

Access at: `https://podscope.your-tailnet.ts.net`

### LoadBalancer / NodePort

Change service type in `values.yaml`:

```yaml
service:
  type: LoadBalancer  # or NodePort
  port: 80
```

---

## Configuration

### Prometheus Connection

PodScope needs to connect to your Prometheus instance:

```yaml
config:
  prometheusUrl: "http://prometheus.monitoring.svc.cluster.local:9090"
```

**In-cluster Prometheus:** Use the service DNS name
**External Prometheus:** Use the full URL including port

### Victoria Metrics

If using VictoriaMetrics instead of Prometheus:

```yaml
config:
  victoriaMetricsUrl: "http://victoriametrics.monitoring.svc.cluster.local:8428"
```

### BullMQ Queue Monitoring

Monitor BullMQ job queues from multiple Redis instances:

```yaml
config:
  redisInstances: "app:redis.default.svc.cluster.local:6379,cache:redis.cache.svc.cluster.local:6379:password"
```

Format: `name:host:port` or `name:host:port:password`

### Grafana Integration

Optional integration with Grafana API:

```yaml
config:
  grafanaUrl: "http://grafana.monitoring.svc.cluster.local:80"

secrets:
  grafanaApiKey: "your-api-key-here"
```

---

## RBAC Permissions

PodScope requires read-only access to cluster resources. The Helm chart automatically creates:

- ServiceAccount
- ClusterRole (read-only permissions)
- ClusterRoleBinding

**Required permissions:**
- Read pods, nodes, services, deployments, namespaces
- Read pod logs
- Read configmaps, secrets (optional for advanced features)

To customize RBAC:

```yaml
rbac:
  additionalRules:
    - apiGroups: ["custom.io"]
      resources: ["customresources"]
      verbs: ["get", "list"]
```

---

## Security Considerations

### Command Whitelisting

PodScope limits kubectl operations to safe, read-only commands:
- `get`, `describe`, `logs`, `top`
- Blocks destructive commands and sensitive flags

### Rate Limiting

API endpoints are rate-limited:

```yaml
config:
  kubectlExecRateLimit: "10"  # requests per minute
```

### Network Policies

Recommended: Restrict PodScope network access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: podscope-netpol
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: podscope
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9090  # Prometheus
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443  # Kubernetes API
```

---

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod -n monitoring -l app.kubernetes.io/name=podscope
kubectl logs -n monitoring -l app.kubernetes.io/name=podscope
```

**Common issues:**
- Missing Prometheus URL in configuration
- RBAC permissions not created
- Image pull errors

### Can't Connect to Prometheus

Test connectivity from within the pod:

```bash
kubectl exec -it -n monitoring <podscope-pod> -- curl http://prometheus.monitoring.svc.cluster.local:9090/api/v1/status/config
```

### High Memory Usage

Adjust resource limits:

```yaml
resources:
  limits:
    memory: "1Gi"
```

### Logs Not Showing

Check log level configuration:

```yaml
config:
  logging:
    level: "debug"  # or info, warn, error
```

---

## Monitoring PodScope

PodScope itself can be monitored! It exposes metrics at `/metrics` (coming soon).

### Health Checks

- **Liveness:** `GET /` (returns 200 if app is running)
- **Readiness:** `GET /` (returns 200 if app is ready)

---

## Advanced Topics

### Multi-Cluster Setup

Deploy PodScope in each cluster with unique names:

```bash
helm install podscope-prod podscope/podscope \
  --set config.prometheusUrl=http://prometheus.prod.svc.cluster.local:9090

helm install podscope-staging podscope/podscope \
  --set config.prometheusUrl=http://prometheus.staging.svc.cluster.local:9090
```

### Custom Dashboard Layouts

Dashboard configurations are stored in browser localStorage. Export/import via the UI settings.

### Extending with Custom Queries

Add custom PromQL queries via the UI. See the [Query Library documentation](./README.md#query-library).

---

## Support

- **GitHub:** https://github.com/Kadajett/PodScope
- **Issues:** https://github.com/Kadajett/PodScope/issues
- **Documentation:** https://github.com/Kadajett/PodScope#readme

## License

PodScope is licensed under BSL-1.1 (Business Source License 1.1). See [LICENSE.md](./LICENSE.md) for details.

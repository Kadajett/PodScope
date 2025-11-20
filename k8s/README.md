# Kubernetes Manifests

This directory contains all the Kubernetes manifests needed to deploy the PodScope dashboard.

## Files

- `namespace.yaml` - Creates the `podscope` namespace
- `serviceaccount.yaml` - ServiceAccount and RBAC permissions for cluster access
- `configmap.yaml` - Application configuration (Prometheus URL, Redis, etc.)
- `secret.yaml.example` - Example secrets file (copy to `secret.yaml` and customize)
- `deployment.yaml` - Main application deployment
- `service.yaml` - ClusterIP service for internal access
- `tailscale-ingress.yaml` - Tailscale ingress for external access via Tailscale network

## Quick Deploy

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply individually in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/tailscale-ingress.yaml
```

## Configuration

Before deploying, review and update:

1. **configmap.yaml** - Update PROMETHEUS_URL and other settings for your environment
2. **deployment.yaml** - Update the container image to your registry
3. **secret.yaml** - Copy from secret.yaml.example and add your actual secrets (if needed)

## Important Notes

- The `secret.yaml` file is in `.gitignore` - do not commit secrets to version control
- The application requires read-only access to the Kubernetes API
- Tailscale ingress requires the Tailscale Operator to be installed in your cluster

See the main [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed deployment instructions.

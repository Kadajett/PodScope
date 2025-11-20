# PodScope

A fast, lightweight Kubernetes monitoring dashboard. Built with Next.js 15, React 19, and TypeScript, this dashboard provides real-time visibility into your Kubernetes infrastructure and Prometheus metrics without the complexity of traditional monitoring solutions.

## Features

- **Real-time Kubernetes Monitoring** - Monitor pods, nodes, deployments, services, and other cluster resources
- **PromQL Query Support** - Execute custom Prometheus/VictoriaMetrics queries with a built-in macro system
- **BullMQ Queue Monitoring** - Track job queues, failed jobs, and queue metrics across multiple Redis instances
- **Customizable Dashboard** - Drag-and-drop layout with configurable panels and refresh intervals
- **Component Library** - Pre-built visualization components for common monitoring needs
- **In-Cluster or Remote** - Deploy inside your cluster or run externally with kubectl context
- **No Database Required** - Configuration stored in browser localStorage for zero infrastructure overhead
- **Security First** - Command whitelisting, rate limiting, and RBAC support for production deployments
- **TypeScript Native** - Full type safety with Zod schema validation

## Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js 20+** - Required for running the Next.js application
- **kubectl** - Configured with access to your Kubernetes cluster
- **Prometheus or VictoriaMetrics** - Accessible via HTTP (required for metrics queries)
- **Redis** (Optional) - Required only if you want to monitor BullMQ job queues

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kadajett/PodScope
   cd podscope
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and update it with your cluster details:
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set at minimum:
   ```bash
   PROMETHEUS_URL=http://your-prometheus:9090
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Kubernetes Configuration
# Leave empty to use current kubectl context, or specify a context name
KUBECTL_CONTEXT=""

# Prometheus/VictoriaMetrics URL (required)
PROMETHEUS_URL="http://prometheus.monitoring.svc.cluster.local:9090"

# Victoria Metrics URL (optional, if different from Prometheus)
VICTORIA_METRICS_URL=""

# Grafana API URL (optional, for integration features)
GRAFANA_URL=""

# Redis/BullMQ Configuration (optional)
# Format: name:host:port or name:host:port:password
# Comma-separated for multiple instances
REDIS_INSTANCES="myapp:redis.default.svc.cluster.local:6379"

# API Security
KUBECTL_EXEC_RATE_LIMIT="10"  # Requests per minute for exec endpoint
```

### Dashboard Configuration

The dashboard layout and component configuration is stored in your browser's localStorage. You can:

- Add/remove dashboard components
- Resize and reposition panels via drag-and-drop
- Configure individual component settings (namespace filters, refresh intervals, etc.)
- Save multiple dashboard configurations
- Export/import dashboard configs via the Settings page

## Deployment

### Kubernetes Deployment

For production Kubernetes deployment, including RBAC configuration, Ingress setup, and security best practices, see the comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md) guide.

**Quick deployment:**

1. Build and push Docker image:
   ```bash
   docker build -t ghcr.io/kadajett/podscope:latest .
   docker push ghcr.io/kadajett/podscope:latest
   ```

2. Update `k8s/deployment.yaml` with your image:
   ```yaml
   image: ghcr.io/kadajett/podscope:latest
   ```

3. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f k8s/
   ```

### Docker Deployment

Run locally using Docker:

```bash
docker build -t podscope .
docker run -p 3000:3000 \
  -e PROMETHEUS_URL="http://your-prometheus:9090" \
  -v ~/.kube/config:/app/.kube/config:ro \
  podscope
```

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS, shadcn/ui
- **State Management**: React Query (TanStack Query) for server state, Zustand for client state
- **Kubernetes Client**: @kubernetes/client-node
- **Validation**: Zod schemas with TypeScript
- **Queue Monitoring**: ioredis for Redis connections

### Key Components

- **Query Resolver** - Processes PromQL queries with macro expansion
- **Kubernetes Client** - Secure wrapper around kubectl with command whitelisting
- **Queue Registry** - Dynamic BullMQ queue discovery and monitoring
- **Component Registry** - Extensible dashboard component system
- **Config Storage** - Browser-based configuration persistence

### Security Features

- Command whitelist for kubectl operations (no arbitrary command execution)
- Argument blacklist (blocks `--token`, `--password`, etc.)
- Rate limiting on sensitive API endpoints
- RBAC-ready with minimal required permissions
- No credential storage (uses kubectl context)

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── app/              # Next.js app router pages and API routes
│   ├── api/         # REST API endpoints (kubernetes, prometheus, queues)
│   └── docs/        # Auto-generated documentation
├── components/       # React components
│   ├── dashboard/   # Dashboard-specific components
│   ├── macro/       # PromQL macro components
│   └── ui/          # Reusable UI components (shadcn/ui)
├── config/          # Configuration schemas and defaults
├── hooks/           # React hooks (React Query)
├── lib/             # Core library code
│   ├── kubernetes.ts    # K8s client wrapper
│   ├── prometheus.ts    # Prometheus client
│   ├── query-resolver.ts # PromQL query processing
│   └── queues/          # BullMQ monitoring
├── providers/       # React context providers
└── types/           # TypeScript type definitions
```

### Adding Custom Components

See the auto-generated documentation at `/docs` for detailed guides on:

- Creating custom dashboard components
- Adding new queue providers
- Extending the PromQL macro system
- Implementing custom Kubernetes queries

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Guidelines

- Follow the existing code style (ESLint configuration)
- Add TypeScript types for all new code
- Test your changes thoroughly
- Update documentation as needed

## License

This project is licensed under the Business Source License 1.1 (BSL-1.1) - see the [LICENSE.md](./LICENSE.md) file for details.

**TL;DR:** Free for personal, homelab, and internal business use. After 5 years, each version becomes Apache 2.0. You cannot use it to build a competing commercial product.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [TanStack Query](https://tanstack.com/query) - Server state management
- [Kubernetes JavaScript Client](https://github.com/kubernetes-client/javascript) - K8s API access

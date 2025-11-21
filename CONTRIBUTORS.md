# Contributing to PodScope

Thank you for your interest in contributing to PodScope! This guide will help you get started with development, testing, and submitting contributions.

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js 20+** - Required for running the Next.js application
- **kubectl** - Configured with access to your Kubernetes cluster
- **Prometheus or VictoriaMetrics** - Accessible via HTTP (required for metrics queries)
- **Redis** (Optional) - Required only if you want to monitor BullMQ job queues
- **Docker** (Optional) - For building and testing container images

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

## Environment Variables

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

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

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

## Development Guides

### Adding Custom Dashboard Components

1. Create a new component in `src/components/dashboard/`
2. Register it in the component registry
3. Add configuration schema using Zod
4. Implement the component interface with required props
5. Add to the component selector UI

See the auto-generated documentation at `/docs` in the running application for detailed guides.

### Adding New Queue Providers

1. Create a provider class extending `QueueProvider`
2. Implement required methods: `connect()`, `getQueues()`, `getJobs()`
3. Register in `src/lib/queues/registry.ts`
4. Add configuration schema

### Extending the PromQL Macro System

1. Define macro handler in `src/lib/query-resolver.ts`
2. Add macro documentation in component settings
3. Test with various PromQL queries

### Implementing Custom Kubernetes Queries

1. Add query function in `src/lib/kubernetes.ts`
2. Create corresponding API endpoint in `src/app/api/`
3. Add React Query hook in `src/hooks/`
4. Use in dashboard components

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Manual Testing

1. Test with different Kubernetes versions (1.19+)
2. Test with both Prometheus and VictoriaMetrics
3. Test RBAC permissions with restricted ServiceAccount
4. Test with multiple Redis instances
5. Test dashboard configuration save/load
6. Test component drag-and-drop and resize

## Building for Production

### Local Build

```bash
# Build the application
npm run build

# Test production build locally
npm run start
```

### Docker Build

```bash
# Build Docker image
docker build -t podscope .

# Run locally
docker run -p 3000:3000 \
  -e PROMETHEUS_URL="http://your-prometheus:9090" \
  -v ~/.kube/config:/app/.kube/config:ro \
  podscope
```

### Helm Chart Development

The Helm chart is located in `charts/podscope/`. To test changes:

```bash
# Lint the chart
helm lint charts/podscope

# Test template rendering
helm template podscope charts/podscope --values charts/podscope/values.yaml

# Install locally for testing
helm install podscope-test charts/podscope \
  --set config.prometheusUrl="http://prometheus.monitoring.svc.cluster.local:9090"
```

## Deployment

For detailed production deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Contributing Guidelines

### Code Style

- Follow the existing code style (ESLint configuration)
- Add TypeScript types for all new code
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and single-purpose

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb (Add, Fix, Update, Remove, etc.)
- Reference issue numbers when applicable
- Example: `Add support for VictoriaMetrics authentication (#123)`

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run lint && npm test`)
5. Commit your changes with clear messages
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request with a clear description of changes

### Pull Request Guidelines

- Include a clear description of the changes
- Reference any related issues
- Add screenshots for UI changes
- Ensure all tests pass
- Update documentation as needed
- Keep PRs focused on a single feature/fix

## Security

### Reporting Security Issues

If you discover a security vulnerability, please email jeremy.ryan.stover@gmail.com instead of using the issue tracker.

### Security Best Practices

- Never commit credentials or secrets
- Use environment variables for sensitive configuration
- Test RBAC permissions with minimal ServiceAccounts
- Validate all user input with Zod schemas
- Follow the principle of least privilege

## License

This project is licensed under the Business Source License 1.1 (BSL-1.1). By contributing, you agree that your contributions will be licensed under the same license.

See [LICENSE.md](./LICENSE.md) for details.

## Questions?

- Check the [README.md](./README.md) for usage information
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment guides
- Browse existing [GitHub Issues](https://github.com/Kadajett/PodScope/issues)
- Open a new issue for bugs or feature requests
- Join discussions in the issue tracker

## Acknowledgments

Thank you to all contributors who help make PodScope better!

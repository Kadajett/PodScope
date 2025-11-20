// Configuration loader for data sources

export interface AppConfig {
  kubernetes: {
    context?: string;
    execRateLimit: number;
  };
  prometheus: {
    url: string;
  };
  victoriaMetrics?: {
    url: string;
  };
  grafana?: {
    url: string;
    apiKey?: string;
  };
}

export function getConfig(): AppConfig {
  return {
    kubernetes: {
      context: process.env.KUBECTL_CONTEXT || undefined,
      execRateLimit: parseInt(process.env.KUBECTL_EXEC_RATE_LIMIT || "10", 10),
    },
    prometheus: {
      url: process.env.PROMETHEUS_URL || "http://localhost:9090",
    },
    victoriaMetrics: process.env.VICTORIA_METRICS_URL
      ? {
          url: process.env.VICTORIA_METRICS_URL,
        }
      : undefined,
    grafana: process.env.GRAFANA_URL
      ? {
          url: process.env.GRAFANA_URL,
          apiKey: process.env.GRAFANA_API_KEY,
        }
      : undefined,
  };
}

export function getPrometheusUrl(): string {
  return process.env.PROMETHEUS_URL || "http://localhost:9090";
}

export function getKubectlContext(): string | undefined {
  return process.env.KUBECTL_CONTEXT || undefined;
}

export function getExecRateLimit(): number {
  return parseInt(process.env.KUBECTL_EXEC_RATE_LIMIT || "10", 10);
}

// Allowed kubectl commands for security (whitelist approach)
export const ALLOWED_KUBECTL_COMMANDS = [
  "get",
  "describe",
  "logs",
  "top",
  "api-resources",
  "api-versions",
  "cluster-info",
  "version",
] as const;

export type AllowedKubectlCommand = (typeof ALLOWED_KUBECTL_COMMANDS)[number];

export function isAllowedKubectlCommand(command: string): command is AllowedKubectlCommand {
  return ALLOWED_KUBECTL_COMMANDS.includes(command as AllowedKubectlCommand);
}

// Blocked arguments for additional security
export const BLOCKED_KUBECTL_ARGS = [
  "--token",
  "--password",
  "--client-key",
  "--client-certificate",
  "--certificate-authority",
  "--insecure-skip-tls-verify",
] as const;

export function containsBlockedArgs(args: string[]): boolean {
  return args.some((arg) =>
    BLOCKED_KUBECTL_ARGS.some((blocked) => arg.startsWith(blocked) || arg === blocked)
  );
}

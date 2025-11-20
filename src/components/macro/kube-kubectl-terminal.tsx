"use client";

import type { z } from "zod";
import { KubectlTerminal } from "@/components/dashboard/kubectl-terminal";
import type { KubectlTerminalComponentConfigSchema } from "@/config/schema";

/**
 * Kubectl Terminal Macro Component
 * Wraps the KubectlTerminal component with config-driven behavior
 *
 * This component provides an interactive terminal interface for running
 * kubectl commands directly from the dashboard.
 *
 * Config options:
 * - title: Component title (default: "kubectl Terminal")
 * - showHeader: Show/hide the header bar (default: true)
 * - defaultNamespace: Default namespace for commands (default: none)
 *   When set, commands will use this namespace unless -n flag is specified
 * - maxHistory: Maximum number of command history entries to keep (default: 50)
 *
 * Features:
 * - Execute kubectl commands (get, describe, logs, top, etc.)
 * - Command history navigation with ↑/↓ arrows
 * - Color-coded terminal output (green for success, red for errors)
 * - Timestamps for each command
 * - Security: Only whitelisted kubectl commands are allowed
 *
 * Example configuration:
 * {
 *   "title": "Production Terminal",
 *   "defaultNamespace": "production",
 *   "maxHistory": 100,
 *   "showHeader": true
 * }
 */

type KubeKubectlTerminalProps = z.infer<typeof KubectlTerminalComponentConfigSchema>;

export function KubeKubectlTerminal(props: KubeKubectlTerminalProps) {
  const {
    title = "kubectl Terminal",
    showHeader = true,
    defaultNamespace,
    maxHistory = 50,
  } = props;

  return (
    <KubectlTerminal
      title={title}
      showHeader={showHeader}
      defaultNamespace={defaultNamespace}
      maxHistory={maxHistory}
    />
  );
}

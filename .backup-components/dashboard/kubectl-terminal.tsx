"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Send,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKubectlExec } from "@/hooks/use-kubernetes";

interface KubectlTerminalProps {
  title?: string;
  showHeader?: boolean;
  defaultNamespace?: string;
  maxHistory?: number;
}

interface HistoryEntry {
  command: string;
  output: string | null;
  error: string | null;
  timestamp: Date;
}

// JSON Viewer Helper Components
function CollapsibleHeader({
  collapsed,
  onClick,
  label,
}: {
  collapsed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-gray-400 hover:text-gray-300 inline-flex items-center gap-1"
    >
      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      <span className="text-gray-500">{label}</span>
    </button>
  );
}

function JsonPrimitive({ data }: { data: unknown }) {
  if (data === null) return <span className="text-purple-400">null</span>;
  if (data === undefined) return <span className="text-purple-400">undefined</span>;
  if (typeof data === "string") return <span className="text-yellow-400">&quot;{data}&quot;</span>;
  if (typeof data === "number") return <span className="text-blue-400">{data}</span>;
  if (typeof data === "boolean") return <span className="text-purple-400">{data.toString()}</span>;
  return <span>{String(data)}</span>;
}

// Collapsible JSON Viewer Component
function JsonViewer({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth >= 2);

  // Primitives
  if (data === null || data === undefined || typeof data !== "object") {
    return <JsonPrimitive data={data} />;
  }

  // Arrays
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-500">[]</span>;

    return (
      <div>
        <CollapsibleHeader
          collapsed={collapsed}
          onClick={() => setCollapsed(!collapsed)}
          label={`[${data.length}]`}
        />
        {!collapsed && (
          <div className="ml-4 border-l border-green-900/30 pl-2">
            {data.map((item, idx) => (
              <div key={`${idx}-${JSON.stringify(item).substring(0, 50)}`} className="py-0.5">
                <span className="text-gray-600">{idx}: </span>
                <JsonViewer data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Objects
  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-gray-500">{"{}"}</span>;

  return (
    <div>
      <CollapsibleHeader
        collapsed={collapsed}
        onClick={() => setCollapsed(!collapsed)}
        label={`{${keys.length}}`}
      />
      {!collapsed && (
        <div className="ml-4 border-l border-green-900/30 pl-2">
          {keys.map((key) => (
            <div key={key} className="py-0.5">
              <span className="text-cyan-400">{key}</span>
              <span className="text-gray-600">: </span>
              <JsonViewer data={(data as Record<string, unknown>)[key]} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Output Display Component with Copy Button
function OutputDisplay({ output, error }: { output: string | null; error: string | null }) {
  const [copied, setCopied] = useState(false);
  const [isJson, setIsJson] = useState(false);
  const [jsonData, setJsonData] = useState<unknown>(null);

  useEffect(() => {
    if (output) {
      try {
        const parsed = JSON.parse(output);
        setIsJson(true);
        setJsonData(parsed);
      } catch {
        setIsJson(false);
        setJsonData(null);
      }
    }
  }, [output]);

  const handleCopy = () => {
    const textToCopy = error || output || "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="pl-4 group relative">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-900/50 hover:bg-red-900/70 rounded"
          title="Copy error"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-red-400" />
          )}
        </button>
        <div className="text-red-400 flex items-start gap-2 pr-8">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <pre className="whitespace-pre-wrap break-words flex-1">{error}</pre>
        </div>
      </div>
    );
  }

  if (!output) return null;

  if (isJson && jsonData) {
    return (
      <div className="pl-4 group relative">
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-green-900/50 hover:bg-green-900/70 rounded z-10"
          title="Copy JSON"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3 text-green-400" />
          )}
        </button>
        <div className="text-green-500/90 font-mono text-xs pr-8">
          <JsonViewer data={jsonData} />
        </div>
      </div>
    );
  }

  return (
    <div className="pl-4 group relative">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-green-900/50 hover:bg-green-900/70 rounded"
        title="Copy output"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3 text-green-400" />
        )}
      </button>
      <div className="text-green-500/90 pr-8">
        <pre className="whitespace-pre-wrap break-words">{output}</pre>
      </div>
    </div>
  );
}

export function KubectlTerminal({
  title = "kubectl Terminal",
  showHeader = true,
  defaultNamespace,
  maxHistory = 50,
}: KubectlTerminalProps) {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { mutate: execKubectl, isPending } = useKubectlExec();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new history entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const executeCommand = (cmd: string) => {
    if (!cmd.trim()) return;

    // Parse command (kubectl is implied)
    const parts = cmd.trim().split(/\s+/);
    const mainCommand = parts[0];
    const args = parts.slice(1);

    // Check if namespace flag is present
    const nsIndex = args.findIndex((arg) => arg === "-n" || arg === "--namespace");
    const namespace = nsIndex >= 0 ? args[nsIndex + 1] : defaultNamespace;

    execKubectl(
      {
        command: mainCommand,
        args: args,
        namespace: namespace,
      },
      {
        onSuccess: (data) => {
          let outputStr: string;
          if (data.output) {
            outputStr =
              typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2);
          } else if (data.rawOutput) {
            outputStr = data.rawOutput;
          } else {
            outputStr = "Command executed successfully (no output)";
          }

          setHistory((prev) => {
            const newHistory = [
              ...prev,
              {
                command: cmd,
                output: outputStr,
                error: null,
                timestamp: new Date(),
              },
            ];
            return newHistory.slice(-maxHistory);
          });
          setCommand("");
          setHistoryIndex(-1);
        },
        onError: (error: unknown) => {
          const errorMsg =
            error instanceof Error
              ? error.message
              : typeof error === "object" && error !== null && "message" in error
                ? String(error.message)
                : "Unknown error";

          setHistory((prev) => {
            const newHistory = [
              ...prev,
              {
                command: cmd,
                output: null,
                error: errorMsg,
                timestamp: new Date(),
              },
            ];
            return newHistory.slice(-maxHistory);
          });
          setCommand("");
          setHistoryIndex(-1);
        },
      }
    );
  };

  const handleArrowUp = (commandHistory: string[]) => {
    if (commandHistory.length === 0) return;
    const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
    setHistoryIndex(newIndex);
    setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
  };

  const handleArrowDown = (commandHistory: string[]) => {
    if (historyIndex <= 0) {
      setHistoryIndex(-1);
      setCommand("");
      return;
    }
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isPending) {
      executeCommand(command);
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const commandHistory = history.filter((h) => h.command).map((h) => h.command);

      if (e.key === "ArrowUp") {
        handleArrowUp(commandHistory);
      } else {
        handleArrowDown(commandHistory);
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setHistoryIndex(-1);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString();
  };

  return (
    <div className="flex flex-col h-full bg-black/90 text-green-400">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-green-900/50 bg-black/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4" />
            <h2 className="text-sm font-semibold">{title}</h2>
            {defaultNamespace && (
              <Badge variant="outline" className="text-xs border-green-700 text-green-400">
                ns: {defaultNamespace}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-green-700 text-green-400">
              {history.length} commands
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-6 text-green-400 hover:text-green-300 hover:bg-green-900/20"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Terminal Output - Scrollable */}
      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        <div className="font-mono text-xs space-y-3">
          {history.length === 0 ? (
            <div className="text-green-600/50 italic">
              $ Welcome to kubectl terminal
              <br />$ Type kubectl commands (without the &apos;kubectl&apos; prefix)
              <br />$ Example: get pods -n default
              <br />$ Use ↑/↓ arrows for command history
              <br />$ JSON responses are collapsible - click to expand/collapse
              <br />$ Hover over output to copy
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.timestamp.getTime()} className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">$</span>
                  <span className="text-green-300 flex-1">{entry.command}</span>
                  <span className="text-green-800 text-[10px]">
                    <Clock className="inline h-2 w-2 mr-1" />
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>

                <OutputDisplay output={entry.output} error={entry.error} />
              </div>
            ))
          )}

          {isPending && (
            <div className="flex items-center gap-2 text-green-600">
              <span className="animate-pulse">$</span>
              <span>Executing command...</span>
            </div>
          )}
        </div>
      </div>

      {/* Command Input - Fixed at Bottom */}
      <div className="p-3 border-t border-green-900/50 bg-black/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type kubectl command (e.g., get pods, describe node)"
            className="flex-1 bg-black/50 border-green-900/50 text-green-400 placeholder:text-green-800 font-mono text-sm focus-visible:ring-green-700"
            disabled={isPending}
          />
          <Button
            size="sm"
            onClick={() => executeCommand(command)}
            disabled={isPending || !command.trim()}
            className="bg-green-900/50 hover:bg-green-900/70 text-green-400 border border-green-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 text-[10px] text-green-800">
          Tip: Use ↑/↓ to navigate history • Click chevrons to collapse JSON • Hover to copy
        </div>
      </div>
    </div>
  );
}

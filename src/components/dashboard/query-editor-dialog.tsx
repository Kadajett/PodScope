"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryLibrary } from "@/hooks/use-query-library";
import { extractVariables } from "@/lib/query-resolver";

interface QueryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace?: string;
  queryName?: string;
  promQL?: string;
  mode?: "add" | "edit";
}

export function QueryEditorDialog({
  open,
  onOpenChange,
  namespace: initialNamespace = "",
  queryName: initialQueryName = "",
  promQL: initialPromQL = "",
  mode = "add",
}: QueryEditorDialogProps) {
  const { addQuery, namespaces } = useQueryLibrary();
  const [namespace, setNamespace] = useState(initialNamespace);
  const [queryName, setQueryName] = useState(initialQueryName);
  const [promQL, setPromQL] = useState(initialPromQL);
  const [error, setError] = useState("");

  // Reset form when dialog opens/closes or props change
  useEffect(() => {
    if (open) {
      setNamespace(initialNamespace);
      setQueryName(initialQueryName);
      setPromQL(initialPromQL);
      setError("");
    }
  }, [open, initialNamespace, initialQueryName, initialPromQL]);

  // Extract variables from PromQL
  const variables = extractVariables(promQL);

  const handleSave = () => {
    // Validation
    if (!namespace.trim()) {
      setError("Namespace is required");
      return;
    }

    if (!queryName.trim()) {
      setError("Query name is required");
      return;
    }

    if (!promQL.trim()) {
      setError("PromQL query is required");
      return;
    }

    // Validate format: should end with version (e.g., _v1-0-0)
    if (!/.*_v\d+-\d+-\d+$/.test(queryName.trim())) {
      setError('Query name must end with a version like "_v1-0-0" (e.g., "cpu_usage_v1-0-0")');
      return;
    }

    // Save query
    try {
      addQuery(namespace.trim(), queryName.trim(), promQL.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save query");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Query" : "Edit Query"}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Create a new PromQL query for your dashboard"
              : "Edit the PromQL query"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="namespace">Namespace</Label>
            <Input
              id="namespace"
              placeholder="e.g., clusterMetrics, podMetrics, customQueries"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              list="namespace-suggestions"
            />
            <datalist id="namespace-suggestions">
              {namespaces.map((ns) => (
                <option key={ns} value={ns} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Group related queries together in namespaces
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queryName">Query Name</Label>
            <Input
              id="queryName"
              placeholder="e.g., cpu_usage_v1-0-0, memory_total_v2-1-0"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must end with version suffix like "_v1-0-0" (semantic versioning)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promql">PromQL Query</Label>
            <Textarea
              id="promql"
              placeholder={`e.g., sum(rate(container_cpu_usage_seconds_total{pod="{{pod}}",namespace="{{namespace}}"}[5m]))`}
              value={promQL}
              onChange={(e) => setPromQL(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{variableName}}"} for dynamic values (e.g., {"{{pod}}"}, {"{{namespace}}"})
            </p>
          </div>

          {variables.length > 0 && (
            <div className="space-y-2">
              <Label>Detected Variables</Label>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <Badge key={variable} variant="secondary">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These variables will be substituted when the query is used
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Query Reference</Label>
            <div className="p-3 rounded-md bg-muted font-mono text-sm">
              {namespace && queryName
                ? `promQueries.${namespace}.${queryName}`
                : "promQueries.namespace.queryName_v1-0-0"}
            </div>
            <p className="text-xs text-muted-foreground">Use this reference in component configs</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{mode === "add" ? "Add Query" : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

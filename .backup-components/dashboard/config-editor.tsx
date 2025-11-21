"use client";

import Editor from "@monaco-editor/react";
import { AlertCircle, Check, Code2, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContainerConfig } from "@/config/schema";

interface ConfigEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerConfig;
  onSave: (updatedContainer: ContainerConfig) => void;
  onDuplicate?: (container: ContainerConfig) => void;
}

export function ConfigEditor({
  open,
  onOpenChange,
  container,
  onSave,
  onDuplicate,
}: ConfigEditorProps) {
  const [editorValue, setEditorValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Initialize editor with container config
  useEffect(() => {
    if (open) {
      setEditorValue(JSON.stringify(container, null, 2));
      setError(null);
      setSaved(false);
    }
  }, [open, container]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editorValue);

      // Validate required fields
      if (!(parsed.i && parsed.component)) {
        setError("Config must include 'i' (container ID) and 'component' fields");
        return;
      }

      // Validate grid layout fields
      if (
        typeof parsed.x !== "number" ||
        typeof parsed.y !== "number" ||
        typeof parsed.w !== "number" ||
        typeof parsed.h !== "number"
      ) {
        setError("Grid position (x, y) and size (w, h) must be numbers");
        return;
      }

      setError(null);
      onSave(parsed as ContainerConfig);
      setSaved(true);

      // Auto-close after save
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleDuplicate = () => {
    try {
      const parsed = JSON.parse(editorValue);

      // Generate new ID for duplicate
      const newContainer = {
        ...parsed,
        i: `${parsed.component}-${Date.now()}`,
        // Offset position slightly
        x: Math.min(parsed.x + 1, 11),
        y: parsed.y + 1,
      };

      setError(null);
      if (onDuplicate) {
        onDuplicate(newContainer as ContainerConfig);
        onOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setEditorValue(value || "");
    setError(null);
    setSaved(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Edit Component Configuration
          </DialogTitle>
          <DialogDescription>
            Modify the component&apos;s configuration. Changes are saved to localStorage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
          <Editor
            height="500px"
            defaultLanguage="json"
            value={editorValue}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              tabSize: 2,
              formatOnPaste: true,
              formatOnType: true,
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: "on",
            }}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {saved && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4" />
            <AlertDescription>Configuration saved successfully!</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div className="flex gap-2">
            {onDuplicate && (
              <Button variant="outline" onClick={handleDuplicate} className="gap-2">
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saved}>
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

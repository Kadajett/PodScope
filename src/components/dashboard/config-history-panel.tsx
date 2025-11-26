"use client";

import { Check, Clock, FileJson, Loader2, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfigHistory } from "@/hooks/use-config-history";
import type { ConfigSnapshot } from "@/lib/config-storage";

interface ConfigHistoryPanelProps {
  onConfigRestored?: () => void;
}

const changeTypeLabels: Record<ConfigSnapshot["changeType"], string> = {
  import: "Imported",
  template: "Template",
  reset: "Reset",
  edit: "Edit",
  manual: "Saved",
};

const changeTypeColors: Record<ConfigSnapshot["changeType"], string> = {
  import: "bg-blue-500/10 text-blue-500",
  template: "bg-purple-500/10 text-purple-500",
  reset: "bg-orange-500/10 text-orange-500",
  edit: "bg-green-500/10 text-green-500",
  manual: "bg-gray-500/10 text-gray-500",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return "Just now";
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // More than 24 hours - show date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConfigHistoryPanel({ onConfigRestored }: ConfigHistoryPanelProps) {
  const {
    snapshots,
    currentIndex,
    undoAvailable,
    redoAvailable,
    undo,
    redo,
    restore,
    removeSnapshot,
    clearHistory,
  } = useConfigHistory();

  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleRestore = (snapshotId: string) => {
    setRestoring(snapshotId);
    try {
      const result = restore(snapshotId);
      if (result.success) {
        onConfigRestored?.();
      } else {
        alert(`Failed to restore: ${result.error}`);
      }
    } finally {
      setRestoring(null);
    }
  };

  const handleUndo = () => {
    const result = undo();
    if (result.success) {
      onConfigRestored?.();
    }
  };

  const handleRedo = () => {
    const result = redo();
    if (result.success) {
      onConfigRestored?.();
    }
  };

  const handleDelete = (snapshotId: string) => {
    const result = removeSnapshot(snapshotId);
    if (!result.success) {
      alert(`Failed to delete: ${result.error}`);
    }
    setDeleteConfirmId(null);
  };

  const handleClearHistory = () => {
    clearHistory();
    setClearConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Configuration History</h3>
          <p className="text-sm text-muted-foreground">
            {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"} saved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!undoAvailable}
            title="Undo to previous state"
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!redoAvailable}
            title="Redo to next state"
          >
            <Redo2 className="h-4 w-4 mr-1" />
            Redo
          </Button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-md">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No history yet</h4>
          <p className="text-sm text-muted-foreground">
            Configuration snapshots will appear here when you make changes, import configs, or apply
            templates.
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[350px] border rounded-md">
            <div className="p-2 space-y-2">
              {[...snapshots].reverse().map((snapshot, reversedIndex) => {
                const actualIndex = snapshots.length - 1 - reversedIndex;
                const isCurrent = actualIndex === currentIndex;

                return (
                  <div
                    key={snapshot.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      isCurrent ? "bg-primary/5 border-primary/30" : "hover:bg-accent"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCurrent ? (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <FileJson className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{snapshot.label}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${changeTypeColors[snapshot.changeType]}`}
                        >
                          {changeTypeLabels[snapshot.changeType]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(snapshot.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRestore(snapshot.id)}
                          disabled={restoring === snapshot.id}
                          title="Restore this snapshot"
                        >
                          {restoring === snapshot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(snapshot.id)}
                          title="Delete this snapshot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearConfirmOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this configuration snapshot? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear History Confirmation Dialog */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all configuration history? This will delete all{" "}
              {snapshots.length} snapshots and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

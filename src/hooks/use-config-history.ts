"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ConfigHistory,
  type ConfigSnapshot,
  canRedo,
  canUndo,
  clearConfigHistory,
  createConfigSnapshot,
  deleteSnapshot,
  loadConfigHistory,
  redoConfig,
  restoreFromSnapshot,
  undoConfig,
} from "@/lib/config-storage";

export function useConfigHistory() {
  const [history, setHistory] = useState<ConfigHistory>({ snapshots: [], currentIndex: -1 });
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);

  // Load history on mount and listen for changes
  const refresh = useCallback(() => {
    const h = loadConfigHistory();
    setHistory(h);
    setUndoAvailable(canUndo());
    setRedoAvailable(canRedo());
  }, []);

  useEffect(() => {
    refresh();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "podscope-config-history") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refresh]);

  const createSnapshot = useCallback(
    (changeType: ConfigSnapshot["changeType"], label?: string) => {
      const snapshot = createConfigSnapshot(changeType, label);
      refresh();
      return snapshot;
    },
    [refresh]
  );

  const restore = useCallback(
    (snapshotId: string) => {
      const result = restoreFromSnapshot(snapshotId);
      if (result.success) {
        refresh();
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent("podscope-config-restored"));
      }
      return result;
    },
    [refresh]
  );

  const undo = useCallback(() => {
    const result = undoConfig();
    if (result.success) {
      refresh();
      window.dispatchEvent(new CustomEvent("podscope-config-restored"));
    }
    return result;
  }, [refresh]);

  const redo = useCallback(() => {
    const result = redoConfig();
    if (result.success) {
      refresh();
      window.dispatchEvent(new CustomEvent("podscope-config-restored"));
    }
    return result;
  }, [refresh]);

  const removeSnapshot = useCallback(
    (snapshotId: string) => {
      const result = deleteSnapshot(snapshotId);
      if (result.success) {
        refresh();
      }
      return result;
    },
    [refresh]
  );

  const clearHistory = useCallback(() => {
    clearConfigHistory();
    refresh();
  }, [refresh]);

  return {
    history,
    snapshots: history.snapshots,
    currentIndex: history.currentIndex,
    undoAvailable,
    redoAvailable,
    createSnapshot,
    restore,
    undo,
    redo,
    removeSnapshot,
    clearHistory,
    refresh,
  };
}

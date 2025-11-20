"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";
import { useQueryLibrary } from "@/hooks/use-query-library";
import { DataSourcesPanel } from "./data-sources-panel";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditQuery?: (namespace: string, queryName: string, promQL: string) => void;
  onAddQuery?: () => void;
}

export function SettingsPanel({ open, onOpenChange, onEditQuery, onAddQuery }: SettingsPanelProps) {
  const { queryLibrary, namespaces, removeQuery } = useQueryLibrary();
  const { downloadConfig, importFromFile, reset } = useDashboardConfig();
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set(namespaces));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleNamespace = (namespace: string) => {
    const newExpanded = new Set(expandedNamespaces);
    if (newExpanded.has(namespace)) {
      newExpanded.delete(namespace);
    } else {
      newExpanded.add(namespace);
    }
    setExpandedNamespaces(newExpanded);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await importFromFile(file);
    if (result.success) {
      alert("Configuration imported successfully!");
      onOpenChange(false);
    } else {
      alert(`Failed to import: ${result.error}`);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset to default configuration? This will delete all custom queries and layout changes."
      )
    ) {
      reset();
      alert("Configuration reset to defaults");
    }
  };

  // Filter queries by search
  const filteredNamespaces = namespaces.filter((namespace) => {
    if (!searchQuery) return true;
    const queries = queryLibrary[namespace];
    const namespaceMatches = namespace.toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatches = Object.keys(queries || {}).some((query) =>
      query.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return namespaceMatches || queryMatches;
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Dashboard Settings</SheetTitle>
          <SheetDescription>
            Manage your PromQL queries and dashboard configuration
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="queries" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queries">Queries</TabsTrigger>
            <TabsTrigger value="datasources">Data Sources</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={onAddQuery}>
                <Plus className="h-4 w-4 mr-2" />
                Add Query
              </Button>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2 pr-4">
                {filteredNamespaces.map((namespace) => {
                  const queries = queryLibrary[namespace] || {};
                  const isExpanded = expandedNamespaces.has(namespace);

                  return (
                    <Collapsible
                      key={namespace}
                      open={isExpanded}
                      onOpenChange={() => toggleNamespace(namespace)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-accent">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{namespace}</span>
                          <Badge variant="secondary">{Object.keys(queries).length}</Badge>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-2 ml-6 space-y-1">
                        {Object.entries(queries).map(([queryName, promQL]) => (
                          <div
                            key={queryName}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-accent group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{queryName}</p>
                              <p className="text-xs text-muted-foreground truncate">{promQL}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => onEditQuery?.(namespace, queryName, promQL)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Delete query "${queryName}" from ${namespace}?`)) {
                                    removeQuery(namespace, queryName);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}

                {filteredNamespaces.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No queries found</p>
                    {searchQuery && <p className="text-sm mt-1">Try a different search term</p>}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="datasources">
            <DataSourcesPanel />
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium mb-2">Export / Import</h4>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={downloadConfig}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Config
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => document.getElementById("config-upload")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Config
                  </Button>
                  <input
                    id="config-upload"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Reset</h4>
                <Button variant="destructive" className="w-full" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  This will delete all custom queries and layout changes
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">About</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Query Library: {namespaces.length} namespaces</p>
                  <p>
                    Total Queries:{" "}
                    {namespaces.reduce(
                      (acc, ns) => acc + Object.keys(queryLibrary[ns] || {}).length,
                      0
                    )}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

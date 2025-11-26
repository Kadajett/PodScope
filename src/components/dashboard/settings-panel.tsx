"use client";

import {
  Activity,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileJson,
  LayoutTemplate,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardConfig } from "@/hooks/use-dashboard-config";
import { useQueryLibrary } from "@/hooks/use-query-library";
import {
  createConfigSnapshot,
  downloadAsTemplate,
  importConfigWithHistory,
  resetToDefaultsWithHistory,
} from "@/lib/config-storage";
import { ConfigHistoryPanel } from "./config-history-panel";
import { DataSourcesPanel } from "./data-sources-panel";
import { MetricsBrowser } from "./metrics-browser";
import { TemplateGallery } from "./template-gallery";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditQuery?: (namespace: string, queryName: string, promQL: string) => void;
  onAddQuery?: () => void;
}

export function SettingsPanel({ open, onOpenChange, onEditQuery, onAddQuery }: SettingsPanelProps) {
  const { queryLibrary, namespaces, removeQuery, addQuery } = useQueryLibrary();
  const { downloadConfig, reload } = useDashboardConfig();
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set(namespaces));
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("templates");

  // Save as template dialog state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const toggleNamespace = (namespace: string) => {
    const newExpanded = new Set(expandedNamespaces);
    if (newExpanded.has(namespace)) {
      newExpanded.delete(namespace);
    } else {
      newExpanded.add(namespace);
    }
    setExpandedNamespaces(newExpanded);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importConfigWithHistory(content, `Imported from ${file.name}`);
      if (result.success) {
        reload();
        alert("Configuration imported successfully!");
      } else {
        alert(`Failed to import: ${result.error}`);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset to default configuration? Your current config will be saved to history."
      )
    ) {
      resetToDefaultsWithHistory();
      reload();
      alert("Configuration reset to defaults. You can undo this in the History tab.");
    }
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      alert("Please enter a template name");
      return;
    }

    downloadAsTemplate(templateName, templateDescription);
    setSaveTemplateOpen(false);
    setTemplateName("");
    setTemplateDescription("");
  };

  const handleSaveSnapshot = () => {
    createConfigSnapshot("manual", "Manual save");
    alert("Configuration snapshot saved!");
  };

  const handleTemplateApplied = useCallback(() => {
    reload();
  }, [reload]);

  const handleConfigRestored = useCallback(() => {
    reload();
  }, [reload]);

  const handleAddQueryFromMetrics = useCallback(
    (metricName: string, promQL: string) => {
      // Add the metric as a new query
      const namespace = "customMetrics";
      const queryName = `${metricName.replace(/[^a-zA-Z0-9_]/g, "_")}_v1-0-0`;
      addQuery(namespace, queryName, promQL);
      alert(`Added "${metricName}" to queries`);
    },
    [addQuery]
  );

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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[800px] sm:max-w-[800px]">
          <SheetHeader>
            <SheetTitle>Dashboard Settings</SheetTitle>
            <SheetDescription>
              Manage templates, queries, metrics, and configuration
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="templates" className="text-xs">
                <LayoutTemplate className="h-4 w-4 mr-1" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="queries" className="text-xs">
                <FileJson className="h-4 w-4 mr-1" />
                Queries
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                <Activity className="h-4 w-4 mr-1" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="datasources" className="text-xs">
                Data Sources
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Clock className="h-4 w-4 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Templates Tab */}
            <TabsContent value="templates" className="mt-4">
              <TemplateGallery onTemplateApplied={handleTemplateApplied} />
            </TabsContent>

            {/* Queries Tab */}
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

            {/* Metrics Browser Tab */}
            <TabsContent value="metrics" className="mt-4">
              <MetricsBrowser
                onAddQuery={handleAddQueryFromMetrics}
                onCopyMetric={(name) => {
                  // Show a brief toast or notification
                  console.log(`Copied: ${name}`);
                }}
              />
            </TabsContent>

            {/* Data Sources Tab */}
            <TabsContent value="datasources">
              <DataSourcesPanel />
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Import/Export Section */}
                <div className="space-y-3 p-4 border rounded-md">
                  <h4 className="text-sm font-medium">Import / Export</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={downloadConfig}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Config
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
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

                {/* Save/Reset Section */}
                <div className="space-y-3 p-4 border rounded-md">
                  <h4 className="text-sm font-medium">Save / Reset</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={handleSaveSnapshot}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Snapshot
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setSaveTemplateOpen(true)}
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </div>
              </div>

              {/* Config History */}
              <div className="mt-4">
                <ConfigHistoryPanel onConfigRestored={handleConfigRestored} />
              </div>

              {/* About Section */}
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
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Save as Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Export your current configuration as a reusable template file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="My Custom Dashboard"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="A brief description of this template..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

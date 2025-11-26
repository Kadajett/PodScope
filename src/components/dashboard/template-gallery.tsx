"use client";

import {
  Activity,
  Check,
  Download,
  FileJson,
  Layers,
  LayoutDashboard,
  Loader2,
  Server,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Template, templates } from "@/config/templates";
import { saveConfigWithHistory } from "@/lib/config-storage";

interface TemplateGalleryProps {
  onTemplateApplied?: () => void;
}

const categoryIcons: Record<Template["category"], React.ReactNode> = {
  minimal: <LayoutDashboard className="h-5 w-5" />,
  kubernetes: <Server className="h-5 w-5" />,
  prometheus: <Activity className="h-5 w-5" />,
  full: <Layers className="h-5 w-5" />,
  custom: <FileJson className="h-5 w-5" />,
};

const categoryColors: Record<Template["category"], string> = {
  minimal: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  kubernetes: "bg-green-500/10 text-green-500 border-green-500/20",
  prometheus: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  full: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  custom: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function TemplateGallery({ onTemplateApplied }: TemplateGalleryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const handleApplyTemplate = (template: Template) => {
    setApplying(true);
    try {
      // Save with history tracking
      saveConfigWithHistory(template.config, "template", `Applied template: ${template.name}`);

      setApplied(template.id);
      setPreviewOpen(false);

      // Notify parent and trigger refresh
      onTemplateApplied?.();
      window.dispatchEvent(new CustomEvent("podscope-config-restored"));

      // Reset applied state after a moment
      setTimeout(() => setApplied(null), 2000);
    } finally {
      setApplying(false);
    }
  };

  const openPreview = (template: Template) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Dashboard Templates</h3>
          <p className="text-sm text-muted-foreground">
            Start with a pre-built configuration or import your own
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
              applied === template.id ? "border-green-500 bg-green-500/5" : ""
            }`}
            onClick={() => openPreview(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-md p-2 ${categoryColors[template.category]}`}>
                    {categoryIcons[template.category]}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {applied === template.id && <Check className="h-4 w-4 text-green-500" />}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-2">{template.description}</CardDescription>
              <div className="mt-3 flex flex-wrap gap-1">
                {template.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && (
                <>
                  <div className={`rounded-md p-2 ${categoryColors[selectedTemplate.category]}`}>
                    {categoryIcons[selectedTemplate.category]}
                  </div>
                  {selectedTemplate.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="rounded-md border p-4 space-y-3">
                <h4 className="font-medium text-sm">Configuration Preview</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pages:</span>{" "}
                    <span className="font-medium">{selectedTemplate.config.pages.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Query Namespaces:</span>{" "}
                    <span className="font-medium">
                      {Object.keys(selectedTemplate.config.queries).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Queries:</span>{" "}
                    <span className="font-medium">
                      {Object.values(selectedTemplate.config.queries).reduce(
                        (acc, ns) => acc + Object.keys(ns).length,
                        0
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Components:</span>{" "}
                    <span className="font-medium">
                      {selectedTemplate.config.pages.reduce(
                        (acc, page) => acc + page.layout.length,
                        0
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <h5 className="text-sm font-medium mb-2">Pages</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.config.pages.map((page) => (
                      <Badge key={page.id} variant="outline">
                        {page.name} ({page.layout.length} widgets)
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Applying this template will replace your current dashboard configuration. Your
                  current config will be saved to history and can be restored using the undo
                  feature.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedTemplate && handleApplyTemplate(selectedTemplate)}
              disabled={applying}
            >
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Apply Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { Bot, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DocsSidebar } from "@/components/dashboard/docs-sidebar";
import { MarkdownViewer } from "@/components/dashboard/markdown-viewer";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { type DocSection, generateAIMarkdown, generateDocSections } from "@/lib/docs-generator";

function findSection(sections: DocSection[], id: string): DocSection | null {
  for (const section of sections) {
    if (section.id === id) return section;
    if (section.subsections) {
      const found = findSection(section.subsections, id);
      if (found) return found;
    }
  }
  return null;
}

export default function DocsPage() {
  const [copied, setCopied] = useState(false);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [currentContent, setCurrentContent] = useState("");

  // Generate sections on mount
  useEffect(() => {
    const docSections = generateDocSections();
    setSections(docSections);
    setActiveSection(docSections[0]?.id || "overview");
  }, []);

  // Update content when active section changes
  useEffect(() => {
    const section = findSection(sections, activeSection);
    if (section) {
      setCurrentContent(section.content);
    }
  }, [activeSection, sections]);

  const copyForAI = async () => {
    const markdown = generateAIMarkdown();

    try {
      // Try modern clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
        setCopied(true);
        toast.success("Copied!", {
          description: "Documentation copied to clipboard for AI assistants",
        });
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement("textarea");
        textArea.value = markdown;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand("copy");
          if (successful) {
            setCopied(true);
            toast.success("Copied!", {
              description: "Documentation copied to clipboard for AI assistants",
            });
            setTimeout(() => setCopied(false), 2000);
          } else {
            throw new Error("Copy command failed");
          }
        } catch {
          toast.error("Copy Failed", {
            description: "Failed to copy documentation to clipboard",
          });
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch {
      toast.error("Copy Failed", {
        description: "Failed to copy documentation to clipboard",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <PageHeader />

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <DocsSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Main Content Area */}
        <div className="ml-64 flex-1">
          <div className="container mx-auto py-8 px-8 max-w-5xl">
            {/* Header with Copy for AI Button */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Documentation</h1>
                <p className="text-muted-foreground">
                  Complete guide to setting up and configuring your dashboard
                </p>
              </div>

              <Button
                onClick={copyForAI}
                size="lg"
                className="gap-2"
                variant={copied ? "default" : "outline"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4" />
                    Copy for AI
                  </>
                )}
              </Button>
            </div>

            {/* Markdown Content */}
            <MarkdownViewer content={currentContent} />

            {/* AI Integration Notice */}
            <div className="mt-12 p-6 bg-muted rounded-lg">
              <div className="flex items-start gap-4">
                <Bot className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">AI Assistant Integration</h3>
                  <p className="text-muted-foreground mb-4">
                    Click the &quot;Copy for AI&quot; button above to copy this entire documentation
                    in a format optimized for AI assistants like Claude, ChatGPT, or other LLMs.
                    This allows you to quickly share the complete configuration schema and examples
                    with an AI to get help building custom dashboards.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The exported markdown includes: component schemas, query system documentation,
                    complete examples, API reference, deployment guides, and troubleshooting -
                    everything an AI needs to help you configure this dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

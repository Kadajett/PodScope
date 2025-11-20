"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocSection } from "@/lib/docs-generator";
import { cn } from "@/lib/utils";

interface DocsSidebarProps {
  sections: DocSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export function DocsSidebar({ sections, activeSection, onSectionChange }: DocsSidebarProps) {
  return (
    <div className="fixed top-14 left-0 bottom-0 w-64 border-r bg-background/95 backdrop-blur">
      <ScrollArea className="h-full py-6 px-4">
        <nav className="space-y-1">
          {sections.map((section) => (
            <div key={section.id}>
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {section.title}
              </button>

              {section.subsections && section.subsections.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {section.subsections.map((subsection) => (
                    <button
                      type="button"
                      key={subsection.id}
                      onClick={() => onSectionChange(subsection.id)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors",
                        activeSection === subsection.id
                          ? "bg-primary/80 text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {subsection.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

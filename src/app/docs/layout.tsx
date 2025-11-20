import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation - K8s Dashboard",
  description: "Complete documentation for the K8s monitoring dashboard",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

"use client";

import { AlertTriangle, Bug, RefreshCw } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Component
 *
 * Catches React errors in child components and displays a user-friendly error UI.
 * Prevents the entire app from crashing due to component-level errors.
 *
 * @example
 * <ErrorBoundary componentName="Dashboard">
 *   <DashboardComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("ErrorBoundary caught error:", error, errorInfo);

    this.setState({ errorInfo });

    // TODO: Send error to error reporting service (Sentry, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   reportError(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportIssue = () => {
    const issueTitle = encodeURIComponent(
      `Error in ${this.props.componentName || "PodScope"}: ${this.state.error?.message || "Unknown error"}`
    );
    const issueBody = encodeURIComponent(
      "## Error Description\n\n" +
        `**Component:** ${this.props.componentName || "Unknown"}\n` +
        `**Error:** ${this.state.error?.message || "Unknown error"}\n` +
        `**Stack:**\n\`\`\`\n${this.state.error?.stack || "No stack trace"}\n\`\`\`\n\n` +
        `**Component Stack:**\n\`\`\`\n${this.state.errorInfo?.componentStack || "No component stack"}\n\`\`\`\n\n` +
        "## Steps to Reproduce\n\n1. \n\n## Expected Behavior\n\n\n\n## Actual Behavior\n\n"
    );

    window.open(
      `https://github.com/Kadajett/PodScope/issues/new?title=${issueTitle}&body=${issueBody}`,
      "_blank"
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-4">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              An error occurred in {this.props.componentName || "this component"}
            </AlertDescription>
          </Alert>

          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Bug className="h-5 w-5" />
                Something Went Wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Error Message:</p>
                <code className="block text-sm bg-muted p-3 rounded-md overflow-x-auto">
                  {this.state.error?.message || "Unknown error occurred"}
                </code>
              </div>

              {process.env.NODE_ENV === "development" && this.state.error?.stack && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground mb-2">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={this.handleReset} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                <Button onClick={this.handleReload} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>

                <Button onClick={this.handleReportIssue} variant="outline" className="gap-2">
                  <Bug className="h-4 w-4" />
                  Report Issue
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                If this error persists, please report it on{" "}
                <a
                  href="https://github.com/Kadajett/PodScope/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  GitHub
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for wrapping individual components
 * Shows a minimal error state without taking up too much space
 */
export function ComponentErrorBoundary({
  children,
  componentName,
}: {
  children: React.ReactNode;
  componentName: string;
}) {
  const fallback = (
    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600 font-medium">{componentName} failed to load</span>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="mt-3"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reload
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary componentName={componentName} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

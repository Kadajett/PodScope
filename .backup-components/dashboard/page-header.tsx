"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Activity, BookOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Switch } from "@/components/ui/switch";
import { useDataSources } from "@/hooks/use-prometheus";

export function PageHeader() {
  const queryClient = useQueryClient();
  const { data: dataSources } = useDataSources();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Auto-refresh when live mode is enabled
  useEffect(() => {
    if (!liveMode) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [liveMode, queryClient]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink className="text-lg font-semibold" href="/">
                  K8s Dashboard
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <div className="flex items-center gap-2">
            {dataSources?.kubernetes.connected ? (
              <Badge variant="default" className="bg-green-600">
                <Activity className="mr-1 h-3 w-3" />
                {dataSources.kubernetes.context || "Connected"}
              </Badge>
            ) : (
              <Badge variant="destructive">
                <Activity className="mr-1 h-3 w-3" />
                Disconnected
              </Badge>
            )}
            {dataSources?.prometheus.healthy ? (
              <Badge variant="outline" className="border-green-600 text-green-600">
                Prometheus {dataSources.prometheus.version || ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-600 text-red-600">
                Prometheus Down
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="live-mode" checked={liveMode} onCheckedChange={setLiveMode} />
            <Label htmlFor="live-mode" className="text-sm">
              Live
            </Label>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/docs">
            <Button variant="outline" size="sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Docs
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

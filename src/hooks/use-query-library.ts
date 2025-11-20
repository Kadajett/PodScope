"use client";

import { useCallback, useMemo, useState } from "react";
import type { QueryLibrary } from "@/config/schema";
import {
  deleteUserQuery,
  loadUserQueries,
  saveUserQueries,
  saveUserQuery,
} from "@/lib/config-storage";
import log from "@/lib/logger-client";
import {
  extractVariables,
  getNamespaceQueries,
  getNamespaces,
  queryExists,
  resolveQueries,
  resolveQuery,
  validateVariables,
} from "@/lib/query-resolver";
import { useDashboardConfig } from "./use-dashboard-config";

/**
 * Hook for working with the query library
 */
export function useQueryLibrary() {
  const { config } = useDashboardConfig();
  const [userQueries, setUserQueries] = useState<QueryLibrary>(() => loadUserQueries());

  // Merged query library (default + user queries)
  const queryLibrary = useMemo(() => {
    if (!config) return userQueries;

    // Deep merge default queries with user queries
    const merged: QueryLibrary = { ...config.queries };

    for (const namespace in userQueries) {
      if (!merged[namespace]) {
        merged[namespace] = {};
      }
      merged[namespace] = { ...merged[namespace], ...userQueries[namespace] };
    }

    return merged;
  }, [config, userQueries]);

  // Add or update a query
  const addQuery = useCallback((namespace: string, queryName: string, promQL: string) => {
    saveUserQuery(namespace, queryName, promQL);
    setUserQueries(loadUserQueries());
  }, []);

  // Delete a query
  const removeQuery = useCallback((namespace: string, queryName: string) => {
    deleteUserQuery(namespace, queryName);
    setUserQueries(loadUserQueries());
  }, []);

  // Update multiple queries at once
  const updateQueries = useCallback((queries: QueryLibrary) => {
    saveUserQueries(queries);
    setUserQueries(loadUserQueries());
  }, []);

  // Get all namespaces
  const namespaces = useMemo(() => getNamespaces(queryLibrary), [queryLibrary]);

  // Get queries for a specific namespace
  const getQueries = useCallback(
    (namespace: string) => getNamespaceQueries(namespace, queryLibrary),
    [queryLibrary]
  );

  // Check if a query exists
  const exists = useCallback(
    (queryRef: string) => queryExists(queryRef, queryLibrary),
    [queryLibrary]
  );

  return {
    queryLibrary,
    userQueries,
    namespaces,
    addQuery,
    removeQuery,
    updateQueries,
    getQueries,
    exists,
  };
}

/**
 * Hook for resolving a single query reference
 */
export function useResolvedQuery(queryRef: string | undefined, variables?: Record<string, string>) {
  const { queryLibrary } = useQueryLibrary();

  return useMemo(() => {
    if (!queryRef) return null;

    try {
      return resolveQuery(queryRef, queryLibrary, variables);
    } catch (error) {
      log.error({ queryRef, error }, "Failed to resolve query");
      return null;
    }
  }, [queryRef, queryLibrary, variables]);
}

/**
 * Hook for resolving multiple query references
 */
export function useResolvedQueries(
  queryRefs: string[] | undefined,
  variables?: Record<string, string>
) {
  const { queryLibrary } = useQueryLibrary();

  return useMemo(() => {
    if (!queryRefs || queryRefs.length === 0) return [];

    try {
      return resolveQueries(queryRefs, queryLibrary, variables);
    } catch (error) {
      log.error({ queryRefs, error }, "Failed to resolve queries");
      return [];
    }
  }, [queryRefs, queryLibrary, variables]);
}

/**
 * Hook for extracting and validating variables in a query
 */
export function useQueryVariables(promQL: string | undefined) {
  return useMemo(() => {
    if (!promQL) return { variables: [], validate: () => ({ valid: true, missing: [] }) };

    const variables = extractVariables(promQL);

    const validate = (values: Record<string, string>) => {
      return validateVariables(promQL, values);
    };

    return { variables, validate };
  }, [promQL]);
}

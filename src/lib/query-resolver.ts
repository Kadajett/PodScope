import { parseQueryRef, type QueryLibrary } from "@/config/schema";
import log from "@/lib/logger-client";

/**
 * Resolve a query reference to a PromQL string
 * @param queryRef - Reference in format "promQueries.namespace.queryName_version" or "namespace.queryName_version"
 * @param queryLibrary - The query library to resolve from
 * @param variables - Optional variables to substitute in the query (e.g., {pod: "my-pod", namespace: "default"})
 * @returns The resolved PromQL query string
 */
export function resolveQuery(
  queryRef: string,
  queryLibrary: QueryLibrary,
  variables?: Record<string, string>
): string {
  try {
    // Parse the query reference
    const { namespace, queryName } = parseQueryRef(queryRef);

    // Look up the query in the library
    const namespaceQueries = queryLibrary[namespace];
    if (!namespaceQueries) {
      throw new Error(`Query namespace not found: ${namespace}`);
    }

    const promQL = namespaceQueries[queryName];
    if (!promQL) {
      throw new Error(`Query not found: ${queryName} in namespace ${namespace}`);
    }

    // Substitute variables if provided
    if (variables) {
      return substituteVariables(promQL, variables);
    }

    return promQL;
  } catch (error) {
    log.error({ queryRef, error }, "Failed to resolve query");
    throw error;
  }
}

/**
 * Substitute variables in a PromQL query string
 * Variables are in the format {{variableName}}
 * @param promQL - The PromQL string with variable placeholders
 * @param variables - Object mapping variable names to values
 * @returns The PromQL string with variables substituted
 */
export function substituteVariables(promQL: string, variables: Record<string, string>): string {
  let result = promQL;

  // Replace each variable
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }

  // Check for any remaining unsubstituted variables
  const remainingVars = result.match(/{{(\w+)}}/g);
  if (remainingVars) {
    const missingVars = remainingVars.map((v) => v.slice(2, -2)).join(", ");
    log.warn({ missingVars, query: result }, "Unsubstituted variables in query");
  }

  return result;
}

/**
 * Extract variable names from a PromQL query string
 * @param promQL - The PromQL string
 * @returns Array of variable names found in the query
 */
export function extractVariables(promQL: string): string[] {
  const matches = promQL.match(/{{(\w+)}}/g);
  if (!matches) return [];

  return matches.map((match) => match.slice(2, -2));
}

/**
 * Validate that all variables in a query can be resolved
 * @param promQL - The PromQL string
 * @param variables - Object mapping variable names to values
 * @returns Object with validation result and any missing variables
 */
export function validateVariables(
  promQL: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const requiredVars = extractVariables(promQL);
  const missing = requiredVars.filter((varName) => !variables[varName]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Resolve multiple query references at once
 * @param queryRefs - Array of query references
 * @param queryLibrary - The query library to resolve from
 * @param variables - Optional variables to substitute
 * @returns Array of resolved PromQL strings
 */
export function resolveQueries(
  queryRefs: string[],
  queryLibrary: QueryLibrary,
  variables?: Record<string, string>
): string[] {
  return queryRefs.map((ref, index) => {
    try {
      return resolveQuery(ref, queryLibrary, variables);
    } catch (error) {
      log.error({ queryRef: ref, index, error }, `Failed to resolve query at index ${index}`);
      throw error;
    }
  });
}

/**
 * Get all queries from a specific namespace
 * @param namespace - The namespace to get queries from
 * @param queryLibrary - The query library
 * @returns Object mapping query names to PromQL strings
 */
export function getNamespaceQueries(
  namespace: string,
  queryLibrary: QueryLibrary
): Record<string, string> {
  return queryLibrary[namespace] || {};
}

/**
 * Get all namespaces in the query library
 * @param queryLibrary - The query library
 * @returns Array of namespace names
 */
export function getNamespaces(queryLibrary: QueryLibrary): string[] {
  return Object.keys(queryLibrary);
}

/**
 * Check if a query reference exists in the library
 * @param queryRef - The query reference to check
 * @param queryLibrary - The query library
 * @returns True if the query exists, false otherwise
 */
export function queryExists(queryRef: string, queryLibrary: QueryLibrary): boolean {
  try {
    const { namespace, queryName } = parseQueryRef(queryRef);
    return !!queryLibrary[namespace]?.[queryName];
  } catch {
    return false;
  }
}

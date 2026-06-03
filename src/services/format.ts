import { CHARACTER_LIMIT } from "../constants.js";
import type { JsonValue, ResponseFormat } from "../types.js";

export function asText(data: unknown, responseFormat: ResponseFormat, title?: string): string {
  if (responseFormat === "json") {
    return truncate(JSON.stringify(data, null, 2));
  }

  if (Array.isArray(data)) {
    return truncate(formatList(data, title));
  }

  return truncate(formatObject(data, title));
}

export function toolResponse<T>(data: T, responseFormat: ResponseFormat = "markdown", title?: string) {
  return {
    content: [{ type: "text" as const, text: asText(data, responseFormat, title) }],
    structuredContent: data as Record<string, unknown>,
  };
}

export function errorResponse(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function formatList(items: unknown[], title?: string): string {
  const lines = title ? [`# ${title}`, ""] : [];
  lines.push(`Count: ${items.length}`, "");

  for (const item of items) {
    if (isRecord(item)) {
      const label = [item.name, item.title, item.id].find((value) => typeof value === "string" || typeof value === "number");
      lines.push(`## ${String(label ?? "Item")}`);
      for (const [key, value] of Object.entries(item)) {
        if (value === undefined) continue;
        lines.push(`- **${key}**: ${formatValue(value)}`);
      }
      lines.push("");
    } else {
      lines.push(`- ${formatValue(item)}`);
    }
  }

  return lines.join("\n");
}

function formatObject(data: unknown, title?: string): string {
  const lines = title ? [`# ${title}`, ""] : [];
  if (!isRecord(data)) {
    lines.push(formatValue(data));
    return lines.join("\n");
  }

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    lines.push(`- **${key}**: ${formatValue(value)}`);
  }

  return lines.join("\n");
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n[Response truncated at ${CHARACTER_LIMIT} characters. Use smaller limits or more specific filters.]`;
}

export function normalizeValues(values?: Record<string, JsonValue>): Array<{ attribute_id: string; data: JsonValue }> | undefined {
  if (!values) return undefined;
  return Object.entries(values).map(([attribute_id, data]) => ({ attribute_id, data }));
}

export function omitUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const output: Partial<T> = {};
  for (const [key, value] of Object.entries(input) as Array<[keyof T, T[keyof T]]>) {
    if (value !== undefined) output[key] = value;
  }
  return output;
}

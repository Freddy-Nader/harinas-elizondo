import type { z } from "zod";
import type { Role } from "@/lib/auth";

/** What one input costs the person who fills it in: the Spanish label, the kind and whether it is required. */
export type FieldMeta = {
  name: string;
  label: string;
  kind: "text" | "email" | "number" | "date" | "boolean" | "select" | "list";
  required: boolean;
  help?: string;
};

/** One operation of the API (docs/llm/api-cli.md). Safe to import from pages and the CLI. */
export type Contract<S extends z.ZodType = z.ZodType> = {
  name: string;
  roles: readonly Role[];
  input: S;
  fields: readonly FieldMeta[];
};

import { registry } from "@/lib/api/registry";
import type { Result } from "@/lib/api/result";
import { ForbiddenError, getCurrentUser } from "@/lib/session";

/**
 * Thin adapter over the use cases (docs/llm/api-cli.md). `src/proxy.ts` leaves /api/v1 alone,
 * so this handler answers 401 itself instead of redirecting to /login (RF-01).
 */
const STATUS = { invalid: 400, not_found: 404, conflict: 409 } as const;

function json(body: object, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function handle(request: Request, { params }: RouteContext<"/api/v1/[...op]">, method: "GET" | "POST") {
  const user = await getCurrentUser();
  if (!user) return json({ ok: false, message: "Inicia sesión para continuar." }, 401);

  const { op } = await params;
  const operation = registry[op.join("/")];
  if (!operation || operation.method !== method) return json({ ok: false, message: "Operación no encontrada." }, 404);
  if (!operation.contract.roles.includes(user.role)) {
    return json({ ok: false, message: new ForbiddenError().message }, 403);
  }

  let raw: unknown = {};
  if (method === "POST") {
    try {
      raw = await request.json();
    } catch {
      return json({ ok: false, message: "El cuerpo de la solicitud debe ser JSON válido." }, 400);
    }
  }
  const result: Result<unknown> = await operation.execute(user, raw);
  return json(result, result.ok ? 200 : STATUS[result.kind]);
}

export const GET = (request: Request, context: RouteContext<"/api/v1/[...op]">) => handle(request, context, "GET");
export const POST = (request: Request, context: RouteContext<"/api/v1/[...op]">) => handle(request, context, "POST");

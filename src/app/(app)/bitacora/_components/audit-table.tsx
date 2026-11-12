import Link from "next/link";
import type { Role } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { canAccess } from "@/lib/permissions";
import type { AuditLogRow } from "../data";
import { actionLabel, entityHref, entityIdLabel, entityLabel } from "../labels";

/** RF-08. Read-only table of audit rows. It has no row actions: the log is append-only. */
export function AuditTable({ rows, role, emptyMessage }: { rows: AuditLogRow[]; role: Role; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Fecha y hora</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Empleado</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Acción</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Entidad</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatDateTime(row.at)}</td>
              <td className="px-4 py-2.5">
                <span className="font-mono text-xs">{row.employeeId ?? "Sin número"}</span>
                <span className="block text-muted-foreground">{row.userName ?? "Usuario"}</span>
              </td>
              <td className="px-4 py-2.5 font-medium">{actionLabel(row.action)}</td>
              <td className="px-4 py-2.5">
                {entityLabel(row.entity)}
                <EntityId entity={row.entity} entityId={row.entityId} role={role} />
              </td>
              <td className="px-4 py-2.5">
                <Detail detail={row.detail} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Links to the entity only when it has a page and the role may open it (RF-01). */
function EntityId({ entity, entityId, role }: { entity: string; entityId: string; role: Role }) {
  const label = entityIdLabel(entity, entityId);
  const href = entityHref(entity, entityId);
  const className = "block break-all font-mono text-xs text-muted-foreground";
  if (!href || !canAccess(role, href.split("?")[0])) return <span className={className}>{label}</span>;
  return (
    <Link href={href} className={`${className} underline-offset-4 hover:text-foreground hover:underline`}>
      {label}
    </Link>
  );
}

function Detail({ detail }: { detail: unknown }) {
  if (detail === null || detail === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <details className="group max-w-md">
      <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <span className="group-open:hidden">Ver detalle</span>
        <span className="hidden group-open:inline">Ocultar detalle</span>
      </summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 font-mono text-xs">
        {JSON.stringify(detail, null, 2)}
      </pre>
    </details>
  );
}

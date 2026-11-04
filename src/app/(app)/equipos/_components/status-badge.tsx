import { Badge } from "@/components/ui/badge";
import { EQUIPMENT_STATUS_LABEL, type EquipmentStatus, type Readiness } from "@/lib/domain/equipment";

export function StatusBadge({ status }: { status: EquipmentStatus }) {
  const variant = status === "active" ? "secondary" : status === "inactive" ? "outline" : "destructive";
  return <Badge variant={variant}>{EQUIPMENT_STATUS_LABEL[status]}</Badge>;
}

/** BR-EQP-03 in one line. */
export function ReadinessLabel({ readiness }: { readiness: Readiness }) {
  if (readiness.usable) return <span className="text-sm">Lista para certificar</span>;
  if (readiness.reason === "status") return <span className="text-sm text-muted-foreground">No disponible</span>;
  return (
    <span className="text-sm text-destructive">
      Faltan límites ({readiness.missing.length})
    </span>
  );
}

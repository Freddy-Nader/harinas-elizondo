import { Badge } from "@/components/ui/badge";

/** RF-04 · BR-INS-03 · D-13. Where an inspection stands, in one badge. */
export function InspectionStatus({
  complete,
  locked,
  resultCount,
}: {
  complete: boolean;
  locked: boolean;
  resultCount: number;
}) {
  if (locked) return <Badge variant="outline">Certificada</Badge>;
  if (complete) return <Badge variant="secondary">Completa</Badge>;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Incompleta · {resultCount}/10
    </Badge>
  );
}

export function DeviationCount({ n }: { n: number }) {
  if (n === 0) return <span className="text-muted-foreground">Sin desviaciones</span>;
  return <span className="text-destructive">{n === 1 ? "1 desviación" : `${n} desviaciones`}</span>;
}

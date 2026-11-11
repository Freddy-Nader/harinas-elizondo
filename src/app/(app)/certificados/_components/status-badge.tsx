import { Badge } from "@/components/ui/badge";
import { CERTIFICATE_STATUS_LABEL, type CertificateStatus } from "@/lib/domain/certificate";

/** RF-05 · D-25. Draft, issued, sent or cancelled, in one badge. */
export function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  if (status === "draft") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {CERTIFICATE_STATUS_LABEL.draft}
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="border-destructive/50 text-destructive">
        {CERTIFICATE_STATUS_LABEL.cancelled}
      </Badge>
    );
  }
  return <Badge variant={status === "sent" ? "default" : "secondary"}>{CERTIFICATE_STATUS_LABEL[status]}</Badge>;
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportCertificatesAction, type ExportFormat } from "./actions";
import type { ReportFilters } from "./data";

interface ExportButtonProps {
  filters: ReportFilters;
}

function download(data: BlobPart, mimeType: string, filename: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** RF-07 · D-19. Downloads the history with the filters on screen, as Excel or CSV. */
export function ExportButton({ filters }: ExportButtonProps) {
  const [pending, startTransition] = useTransition();

  const run = (format: ExportFormat) =>
    startTransition(async () => {
      try {
        const result = await exportCertificatesAction({ ...filters, page: undefined }, format);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        const body = result.base64
          ? Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0))
          : result.data;
        download(body, result.mimeType, result.filename);
      } catch {
        toast.error("Ocurrió un error al exportar los certificados.");
      }
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="gap-2" disabled={pending} onClick={() => run("xlsx")}>
        <Download className="h-4 w-4" />
        Exportar a Excel
      </Button>
      <Button type="button" variant="outline" className="gap-2" disabled={pending} onClick={() => run("csv")}>
        <Download className="h-4 w-4" />
        Exportar CSV
      </Button>
    </div>
  );
}

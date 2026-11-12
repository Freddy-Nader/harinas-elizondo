"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportCertificatesAction } from "./actions";
import { ReportFilters } from "./data";

interface ExportButtonProps {
  filters: ReportFilters;
}

export function ExportButton({ filters }: ExportButtonProps) {
  return (
    <Button 
      type="button" 
      variant="outline" 
      className="gap-2"
      onClick={async () => {
        try {
          const result = await exportCertificatesAction(filters);
          
          if (result && result.success && result.csvData) {
            const blob = new Blob(["\ufeff" + result.csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        } catch (error: unknown) {
          alert((error instanceof Error && error.message) || "Ocurrió un error al exportar los certificados.");
        }
      }}
    >
      <Download className="h-4 w-4" />
      Exportar a Excel / CSV (Q-09)
    </Button>
  );
}
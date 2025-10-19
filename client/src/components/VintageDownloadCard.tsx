import { FileSpreadsheet, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VintageResult } from "@shared/schema";

interface VintageDownloadCardProps {
  vintage: VintageResult;
  onDownload: (vintageName: string) => void;
  isDownloading?: boolean;
}

export function VintageDownloadCard({
  vintage,
  onDownload,
  isDownloading = false,
}: VintageDownloadCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary p-2.5 flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg" data-testid={`text-vintage-${vintage.vintageName}`}>
                {vintage.vintageName}
              </h3>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {vintage.filename}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              2 Sheets
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs" data-testid={`text-realized-count-${vintage.vintageName}`}>
              {vintage.realizedRowCount} Realized
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs" data-testid={`text-unrealized-count-${vintage.vintageName}`}>
              {vintage.unrealizedRowCount} Unrealized
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              {formatFileSize(vintage.fileSize)}
            </Badge>
          </div>

          <Button
            onClick={() => onDownload(vintage.vintageName)}
            disabled={isDownloading}
            className="w-full"
            data-testid={`button-download-${vintage.vintageName}`}
          >
            <Download className="h-4 w-4 mr-2" />
            Download {vintage.vintageName} Portfolio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

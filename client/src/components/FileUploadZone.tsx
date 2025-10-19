import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  title: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  testId: string;
}

export function FileUploadZone({
  title,
  description,
  file,
  onFileChange,
  testId,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls")
        ) {
          onFileChange(file);
        }
      }
    },
    [onFileChange]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card
        className={cn(
          "border-2 border-dashed transition-all",
          isDragging && "border-primary bg-accent",
          file && "border-solid border-chart-2 bg-chart-2/5"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="p-8">
          {!file ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full bg-accent p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Drag and drop your Excel file here
                </p>
                <p className="text-xs text-muted-foreground">
                  Must contain a 'Vintage' column
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid={testId}
                />
                <Button variant="secondary" size="sm" data-testid={`${testId}-button`}>
                  Browse Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="rounded-md bg-chart-2 p-2 flex-shrink-0">
                  <FileSpreadsheet className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" data-testid={`${testId}-filename`}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFileChange(null)}
                className="flex-shrink-0"
                data-testid={`${testId}-remove`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

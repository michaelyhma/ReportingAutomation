import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileUploadZone } from "@/components/FileUploadZone";
import { VintageDownloadCard } from "@/components/VintageDownloadCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ProcessFilesResponse } from "@shared/schema";

export default function Home() {
  const [realizedFile, setRealizedFile] = useState<File | null>(null);
  const [unrealizedFile, setUnrealizedFile] = useState<File | null>(null);
  const [processedVintages, setProcessedVintages] = useState<
    ProcessFilesResponse | null
  >(null);
  const { toast } = useToast();

  const processMutation = useMutation({
    mutationFn: async () => {
      if (!realizedFile || !unrealizedFile) {
        throw new Error("Both files are required");
      }

      const formData = new FormData();
      formData.append("realized", realizedFile);
      formData.append("unrealized", unrealizedFile);

      const response = await fetch("/api/process-files", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process files");
      }

      return response.json() as Promise<ProcessFilesResponse>;
    },
    onSuccess: (data) => {
      setProcessedVintages(data);
      toast({
        title: "Success!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error processing files",
        description: error.message,
      });
    },
  });

  const handleDownload = async (vintageName: string) => {
    try {
      const response = await fetch(`/api/download/${encodeURIComponent(vintageName)}`);
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vintageName}_Portfolio.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `${vintageName}_Portfolio.xlsx`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReset = () => {
    setRealizedFile(null);
    setUnrealizedFile(null);
    setProcessedVintages(null);
  };

  const canProcess = realizedFile && unrealizedFile && !processMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary p-2">
              <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Portfolio Vintage Analyzer
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-semibold text-foreground">
            Process Realized and Unrealized Position Data
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Upload both Excel files to begin analysis. The system will
            automatically detect Vintages and generate separate reports for each
            (CQ1, CQ2, CQ3, and any future Vintages).
          </p>
        </div>

        {!processedVintages ? (
          <>
            {/* Upload Section */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <FileUploadZone
                    title="Realized Positions"
                    description="Excel file containing all buy/sell transactions"
                    file={realizedFile}
                    onFileChange={setRealizedFile}
                    testId="input-realized-file"
                  />
                  <FileUploadZone
                    title="Unrealized Positions"
                    description="Excel file showing current position values"
                    file={unrealizedFile}
                    onFileChange={setUnrealizedFile}
                    testId="input-unrealized-file"
                  />
                </div>

                <Separator className="my-8" />

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => processMutation.mutate()}
                    disabled={!canProcess}
                    className="min-w-[200px]"
                    data-testid="button-process-files"
                  >
                    {processMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing Files...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-5 w-5 mr-2" />
                        Process Files
                      </>
                    )}
                  </Button>

                  {processMutation.isPending && (
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Analyzing Vintage data and generating Excel files...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-3">
                  File Requirements
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Both files must be Excel format (.xlsx or .xls)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Each file must contain a column titled "Vintage"
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Each output file contains 3 sheets: Realized, Unrealized, and Initial Purchase
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                    <span>
                      Initial Purchase sheet uses Excel formulas to calculate first purchase dates and amounts
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Results Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Generated Vintage Reports
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-mono" data-testid="text-vintage-count">
                      {processedVintages.vintages.length} Vintage
                      {processedVintages.vintages.length !== 1 ? "s" : ""}{" "}
                      Processed
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  data-testid="button-process-new-files"
                >
                  Process New Files
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedVintages.vintages.map((vintage) => (
                  <VintageDownloadCard
                    key={vintage.vintageName}
                    vintage={vintage}
                    onDownload={handleDownload}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs text-muted-foreground text-center">
            Data processed securely - files are not permanently stored on our
            servers
          </p>
        </div>
      </footer>
    </div>
  );
}

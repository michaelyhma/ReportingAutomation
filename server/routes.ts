import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ExcelProcessor } from "./excelProcessor";

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith(".xlsx") || 
        file.originalname.endsWith(".xls")) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Process uploaded Excel files
  app.post(
    "/api/process-files",
    upload.fields([
      { name: "realized", maxCount: 1 },
      { name: "unrealized", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as {
          realized?: Express.Multer.File[];
          unrealized?: Express.Multer.File[];
        };

        if (!files?.realized?.[0] || !files?.unrealized?.[0]) {
          return res.status(400).json({
            message: "Both realized and unrealized Excel files are required",
          });
        }

        const realizedBuffer = files.realized[0].buffer;
        const unrealizedBuffer = files.unrealized[0].buffer;

        // Process the files and generate vintage Excel files
        const { vintageData, results } = await ExcelProcessor.processAndGenerateFiles(
          realizedBuffer,
          unrealizedBuffer
        );

        // Store the generated files in memory
        for (const vintage of vintageData) {
          const buffer = ExcelProcessor.generateVintageExcel(vintage);
          await storage.storeVintageFile(vintage.vintageName, buffer);
        }

        res.json({
          vintages: results,
          message: `Successfully processed ${results.length} Vintage${
            results.length !== 1 ? "s" : ""
          }: ${results.map((v) => v.vintageName).join(", ")}`,
        });
      } catch (error) {
        console.error("Error processing files:", error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "Failed to process files",
        });
      }
    }
  );

  // Download a specific vintage file
  app.get("/api/download/:vintageName", async (req, res) => {
    try {
      const vintageName = decodeURIComponent(req.params.vintageName);
      const buffer = await storage.getVintageFile(vintageName);

      if (!buffer) {
        return res.status(404).json({
          message: `Vintage file '${vintageName}' not found`,
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${vintageName}_Portfolio.xlsx"`
      );
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to download file",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

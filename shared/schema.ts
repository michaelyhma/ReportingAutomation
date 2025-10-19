import { z } from "zod";

// Schema for uploaded file information
export const uploadedFileSchema = z.object({
  filename: z.string(),
  size: z.number(),
  mimetype: z.string(),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;

// Schema for processed vintage data
export const vintageResultSchema = z.object({
  vintageName: z.string(),
  filename: z.string(),
  realizedRowCount: z.number(),
  unrealizedRowCount: z.number(),
  fileSize: z.number(),
});

export type VintageResult = z.infer<typeof vintageResultSchema>;

// Schema for the process files response
export const processFilesResponseSchema = z.object({
  vintages: z.array(vintageResultSchema),
  message: z.string(),
});

export type ProcessFilesResponse = z.infer<typeof processFilesResponseSchema>;

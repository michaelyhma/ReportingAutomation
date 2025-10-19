import * as XLSX from "xlsx";
import type { VintageResult } from "@shared/schema";

interface VintageData {
  vintageName: string;
  realizedRows: any[];
  unrealizedRows: any[];
}

export class ExcelProcessor {
  /**
   * Extract unique vintage names from a worksheet
   */
  private static extractVintages(worksheet: XLSX.WorkSheet): Set<string> {
    const data = XLSX.utils.sheet_to_json(worksheet);
    const vintages = new Set<string>();

    for (const row of data) {
      const vintage = (row as any)["Vintage"] || (row as any)["vintage"];
      if (vintage) {
        vintages.add(String(vintage).trim());
      }
    }

    return vintages;
  }

  /**
   * Filter rows by vintage name
   */
  private static filterRowsByVintage(
    worksheet: XLSX.WorkSheet,
    vintageName: string
  ): any[] {
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data.filter((row: any) => {
      const vintage = row["Vintage"] || row["vintage"];
      return vintage && String(vintage).trim() === vintageName;
    });
  }

  /**
   * Process Excel files and return data organized by vintage
   */
  static processFiles(
    realizedBuffer: Buffer,
    unrealizedBuffer: Buffer
  ): VintageData[] {
    // Read the Excel files
    const realizedWorkbook = XLSX.read(realizedBuffer, { type: "buffer" });
    const unrealizedWorkbook = XLSX.read(unrealizedBuffer, { type: "buffer" });

    // Get the first sheet from each workbook
    const realizedSheet = realizedWorkbook.Sheets[realizedWorkbook.SheetNames[0]];
    const unrealizedSheet = unrealizedWorkbook.Sheets[unrealizedWorkbook.SheetNames[0]];

    if (!realizedSheet) {
      throw new Error("Realized Excel file has no sheets");
    }

    if (!unrealizedSheet) {
      throw new Error("Unrealized Excel file has no sheets");
    }

    // Extract unique vintages from both files
    const realizedVintages = this.extractVintages(realizedSheet);
    const unrealizedVintages = this.extractVintages(unrealizedSheet);

    // Validate that both files have a Vintage column
    if (realizedVintages.size === 0) {
      throw new Error("Realized Excel file does not contain a 'Vintage' column");
    }

    if (unrealizedVintages.size === 0) {
      throw new Error("Unrealized Excel file does not contain a 'Vintage' column");
    }

    // Combine all unique vintages
    const allVintages = new Set([...realizedVintages, ...unrealizedVintages]);

    // Process each vintage
    const vintageDataArray: VintageData[] = [];

    for (const vintageName of allVintages) {
      const realizedRows = this.filterRowsByVintage(realizedSheet, vintageName);
      const unrealizedRows = this.filterRowsByVintage(
        unrealizedSheet,
        vintageName
      );

      vintageDataArray.push({
        vintageName,
        realizedRows,
        unrealizedRows,
      });
    }

    // Sort by vintage name for consistent ordering
    vintageDataArray.sort((a, b) => a.vintageName.localeCompare(b.vintageName));

    return vintageDataArray;
  }

  /**
   * Generate an Excel file for a specific vintage
   */
  static generateVintageExcel(vintageData: VintageData): Buffer {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create the Realized sheet
    const realizedSheet = XLSX.utils.json_to_sheet(vintageData.realizedRows);
    XLSX.utils.book_append_sheet(workbook, realizedSheet, "Realized");

    // Create the Unrealized sheet
    const unrealizedSheet = XLSX.utils.json_to_sheet(vintageData.unrealizedRows);
    XLSX.utils.book_append_sheet(workbook, unrealizedSheet, "Unrealized");

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return buffer;
  }

  /**
   * Process files and generate all vintage Excel files
   */
  static async processAndGenerateFiles(
    realizedBuffer: Buffer,
    unrealizedBuffer: Buffer
  ): Promise<{ vintageData: VintageData[]; results: VintageResult[] }> {
    const vintageDataArray = this.processFiles(realizedBuffer, unrealizedBuffer);

    const results: VintageResult[] = vintageDataArray.map((vintageData) => {
      const buffer = this.generateVintageExcel(vintageData);

      return {
        vintageName: vintageData.vintageName,
        filename: `${vintageData.vintageName}_Portfolio.xlsx`,
        realizedRowCount: vintageData.realizedRows.length,
        unrealizedRowCount: vintageData.unrealizedRows.length,
        fileSize: buffer.length,
      };
    });

    return { vintageData: vintageDataArray, results };
  }
}

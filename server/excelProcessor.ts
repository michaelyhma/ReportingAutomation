import * as XLSX from "xlsx";
import type { VintageResult } from "@shared/schema";

interface VintageData {
  vintageName: string;
  realizedRows: any[];
  unrealizedRows: any[];
}

export class ExcelProcessor {
  /**
   * Extract unique vintage names from worksheet data
   */
  private static extractVintages(data: any[]): Set<string> {
    const vintages = new Set<string>();
    for (const row of data) {
      const vintage = row["Vintage"] || row["vintage"];
      if (vintage) {
        vintages.add(String(vintage).trim());
      }
    }
    return vintages;
  }

  /**
   * Filter rows by vintage name
   */
  private static filterRowsByVintage(data: any[], vintageName: string): any[] {
    return data.filter((row: any) => {
      const vintage = row["Vintage"] || row["vintage"];
      return vintage && String(vintage).trim() === vintageName;
    });
  }

  /**
   * Get unique symbols from realized data
   */
  private static getUniqueSymbols(realizedRows: any[]): string[] {
    const symbols = new Set<string>();
    for (const row of realizedRows) {
      if (row["Symbol"]) {
        symbols.add(String(row["Symbol"]).trim());
      }
    }
    return Array.from(symbols).sort();
  }

  /**
   * Process Excel files and return data organized by vintage
   */
  static async processFiles(
    realizedBuffer: Buffer,
    unrealizedBuffer: Buffer
  ): Promise<VintageData[]> {
    // Read the Excel files
    const realizedWorkbook = XLSX.read(realizedBuffer, { type: "buffer" });
    const unrealizedWorkbook = XLSX.read(unrealizedBuffer, { type: "buffer" });

    // Get the first sheet from each workbook
    const realizedSheetName = realizedWorkbook.SheetNames[0];
    const unrealizedSheetName = unrealizedWorkbook.SheetNames[0];

    if (!realizedSheetName) {
      throw new Error("Realized Excel file has no sheets");
    }

    if (!unrealizedSheetName) {
      throw new Error("Unrealized Excel file has no sheets");
    }

    // Convert sheets to JSON
    const realizedData = XLSX.utils.sheet_to_json(realizedWorkbook.Sheets[realizedSheetName]);
    const unrealizedData = XLSX.utils.sheet_to_json(unrealizedWorkbook.Sheets[unrealizedSheetName]);

    // Extract unique vintages from both files
    const realizedVintages = this.extractVintages(realizedData);
    const unrealizedVintages = this.extractVintages(unrealizedData);

    // Validate that both files have a Vintage column
    if (realizedVintages.size === 0) {
      throw new Error("Realized Excel file does not contain a 'Vintage' column");
    }

    if (unrealizedVintages.size === 0) {
      throw new Error("Unrealized Excel file does not contain a 'Vintage' column");
    }

    // Combine all unique vintages
    const allVintages = new Set([...Array.from(realizedVintages), ...Array.from(unrealizedVintages)]);

    // Process each vintage
    const vintageDataArray: VintageData[] = [];

    for (const vintageName of Array.from(allVintages)) {
      const realizedRows = this.filterRowsByVintage(realizedData, vintageName);
      const unrealizedRows = this.filterRowsByVintage(unrealizedData, vintageName);

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
  static async generateVintageExcel(vintageData: VintageData): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Create the Realized sheet
    const realizedSheet = XLSX.utils.json_to_sheet(vintageData.realizedRows);
    XLSX.utils.book_append_sheet(workbook, realizedSheet, "Realized");

    // Create the Unrealized sheet
    const unrealizedSheet = XLSX.utils.json_to_sheet(vintageData.unrealizedRows);
    XLSX.utils.book_append_sheet(workbook, unrealizedSheet, "Unrealized");

    // Create the Initial Purchase sheet with Excel formulas
    const initialPurchaseSheet: XLSX.WorkSheet = {};
    
    // Add headers
    initialPurchaseSheet['A1'] = { v: 'Symbol', t: 's' };
    initialPurchaseSheet['B1'] = { v: 'First Purchase Date', t: 's' };
    initialPurchaseSheet['C1'] = { v: 'Initial Amount', t: 's' };
    
    // Get unique symbols and add them with formulas
    const uniqueSymbols = this.getUniqueSymbols(vintageData.realizedRows);
    uniqueSymbols.forEach((symbol, index) => {
      const rowNum = index + 2; // Excel rows are 1-indexed, +1 for header
      
      // Column A: Symbol
      initialPurchaseSheet[`A${rowNum}`] = { v: symbol, t: 's' };
      
      // Column B: First Purchase Date formula
      initialPurchaseSheet[`B${rowNum}`] = {
        f: `MINIFS(Realized!K:K,Realized!G:G,'Initial Purchase'!A${rowNum},Realized!M:M,"BUY")`,
        t: 'd'
      };
      
      // Column C: Initial Amount formula
      initialPurchaseSheet[`C${rowNum}`] = {
        f: `SUMIFS(Realized!P:P,Realized!K:K,'Initial Purchase'!B${rowNum},Realized!G:G,'Initial Purchase'!A${rowNum},Realized!M:M,"BUY")`,
        t: 'n',
        z: '0.00'  // Number format for currency
      };
    });
    
    // Set the sheet range
    const endRow = uniqueSymbols.length + 1;
    initialPurchaseSheet['!ref'] = `A1:C${endRow}`;
    
    // Set column widths
    initialPurchaseSheet['!cols'] = [
      { wch: 15 }, // Symbol
      { wch: 20 }, // First Purchase Date
      { wch: 15 }  // Initial Amount
    ];

    // Add the Initial Purchase sheet to the workbook
    XLSX.utils.book_append_sheet(workbook, initialPurchaseSheet, "Initial Purchase");

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
    const vintageDataArray = await this.processFiles(realizedBuffer, unrealizedBuffer);

    const results: VintageResult[] = [];
    
    for (const vintageData of vintageDataArray) {
      const buffer = await this.generateVintageExcel(vintageData);

      results.push({
        vintageName: vintageData.vintageName,
        filename: `${vintageData.vintageName}_Portfolio.xlsx`,
        realizedRowCount: vintageData.realizedRows.length,
        unrealizedRowCount: vintageData.unrealizedRows.length,
        fileSize: buffer.length,
      });
    }

    return { vintageData: vintageDataArray, results };
  }
}
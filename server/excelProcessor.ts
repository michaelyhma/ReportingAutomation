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
   * Create Initial Purchase sheet with Excel formulas using entire column references
   */
  private static createInitialPurchaseSheet(realizedRows: any[]): XLSX.WorkSheet {
    // Get unique symbols
    const uniqueSymbols = this.getUniqueSymbols(realizedRows);
    
    // Create worksheet structure
    const ws: XLSX.WorkSheet = {};
    
    // Add headers
    ws['A1'] = { v: 'Symbol' };
    ws['B1'] = { v: 'First Purchase Date' };
    ws['C1'] = { v: 'Initial Amount' };
    
    // Add symbols and formulas for each row
    uniqueSymbols.forEach((symbol, index) => {
      const rowNum = index + 2; // Excel rows are 1-indexed, +1 for header
      
      // Column A: Symbol
      ws[`A${rowNum}`] = { v: symbol };
      
      // Column B: First Purchase Date formula
      // Using entire column references as requested
      ws[`B${rowNum}`] = {
        f: `MINIFS(Realized!K:K,Realized!G:G,'Initial Purchase'!A${rowNum},Realized!M:M,"BUY")`,
        t: 'n'
      };
      
      // Column C: Initial Amount formula  
      // Using entire column references
      ws[`C${rowNum}`] = {
        f: `SUMIFS(Realized!P:P,Realized!K:K,'Initial Purchase'!B${rowNum},Realized!G:G,'Initial Purchase'!A${rowNum},Realized!M:M,"BUY")`,
        t: 'n'
      };
    });
    
    // Set the sheet range
    const endRow = uniqueSymbols.length + 1;
    ws['!ref'] = `A1:C${endRow}`;
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 15 }, // Symbol
      { wch: 20 }, // First Purchase Date  
      { wch: 15 }  // Initial Amount
    ];
    
    return ws;
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
    const allVintages = new Set([...Array.from(realizedVintages), ...Array.from(unrealizedVintages)]);

    // Process each vintage
    const vintageDataArray: VintageData[] = [];

    for (const vintageName of Array.from(allVintages)) {
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

    // Create the Realized sheet as a table
    const realizedSheet = XLSX.utils.json_to_sheet(vintageData.realizedRows);
    
    // Add autofilter to make it a table-like structure
    if (vintageData.realizedRows.length > 0) {
      const range = XLSX.utils.decode_range(realizedSheet['!ref'] || 'A1');
      realizedSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }
    
    XLSX.utils.book_append_sheet(workbook, realizedSheet, "Realized");

    // Create the Unrealized sheet as a table
    const unrealizedSheet = XLSX.utils.json_to_sheet(vintageData.unrealizedRows);
    
    // Add autofilter to make it a table-like structure
    if (vintageData.unrealizedRows.length > 0) {
      const range = XLSX.utils.decode_range(unrealizedSheet['!ref'] || 'A1');
      unrealizedSheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }
    
    XLSX.utils.book_append_sheet(workbook, unrealizedSheet, "Unrealized");

    // Create the Initial Purchase sheet with Excel formulas
    const initialPurchaseSheet = this.createInitialPurchaseSheet(vintageData.realizedRows);
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
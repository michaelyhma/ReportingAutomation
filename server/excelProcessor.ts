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
   * Create Initial Purchase sheet with Excel formulas
   */
  private static createInitialPurchaseSheet(realizedRows: any[]): XLSX.WorkSheet {
    // Get unique symbols
    const uniqueSymbols = this.getUniqueSymbols(realizedRows);
    
    // Create the data structure for Initial Purchase sheet
    const initialPurchaseData: any[] = [];
    
    // Add headers
    const headers = ["Symbol", "First Purchase Date", "Initial Amount"];
    
    // For each unique symbol, we'll add formulas to calculate first purchase date and amount
    uniqueSymbols.forEach((symbol, index) => {
      const rowNum = index + 2; // +2 because row 1 is headers
      
      initialPurchaseData.push({
        Symbol: symbol,
        "First Purchase Date": `=IFERROR(MINIFS(Realized!B:B,Realized!A:A,"${symbol}",Realized!C:C,"BUY"),"")`,
        "Initial Amount": `=IFERROR(SUMIFS(Realized!F:F,Realized!A:A,"${symbol}",Realized!B:B,B${rowNum},Realized!C:C,"BUY"),0)`
      });
    });

    // Create worksheet from data
    const ws = XLSX.utils.json_to_sheet(initialPurchaseData);
    
    // Set column widths for better readability
    const wscols = [
      { wch: 15 }, // Symbol
      { wch: 20 }, // First Purchase Date  
      { wch: 15 }  // Initial Amount
    ];
    ws['!cols'] = wscols;

    // Format the date column (column B) and amount column (column C)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Apply formulas to cells (XLSX library will handle the formula syntax)
    for (let i = 0; i < uniqueSymbols.length; i++) {
      const rowNum = i + 2;
      
      // First Purchase Date formula (column B)
      const dateCell = XLSX.utils.encode_cell({ r: i + 1, c: 1 });
      ws[dateCell] = {
        f: `IFERROR(MINIFS(Realized!B:B,Realized!A:A,"${uniqueSymbols[i]}",Realized!C:C,"BUY"),"")`
      };
      
      // Initial Amount formula (column C)
      const amountCell = XLSX.utils.encode_cell({ r: i + 1, c: 2 });
      ws[amountCell] = {
        f: `IFERROR(SUMIFS(Realized!F:F,Realized!A:A,"${uniqueSymbols[i]}",Realized!B:B,B${rowNum},Realized!C:C,"BUY"),0)`
      };
    }
    
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

    // Create the Realized sheet
    const realizedSheet = XLSX.utils.json_to_sheet(vintageData.realizedRows);
    XLSX.utils.book_append_sheet(workbook, realizedSheet, "Realized");

    // Create the Unrealized sheet
    const unrealizedSheet = XLSX.utils.json_to_sheet(vintageData.unrealizedRows);
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
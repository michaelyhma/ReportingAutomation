import * as ExcelJS from "exceljs";
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
   * Read Excel buffer and convert to JSON data
   */
  private static async readExcelBuffer(buffer: Buffer): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("Excel file has no sheets");
    }

    // Convert worksheet to JSON
    const data: any[] = [];
    let headers: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        headers = row.values as string[];
        headers = headers.slice(1); // Remove first empty element
      } else {
        // Data rows
        const rowData: any = {};
        const values = row.values as any[];
        if (values) {
          values.forEach((value: any, index: number) => {
            if (index > 0 && headers[index - 1]) {
              rowData[headers[index - 1]] = value;
            }
          });
        }
        if (Object.keys(rowData).length > 0) {
          data.push(rowData);
        }
      }
    });

    return data;
  }

  /**
   * Process Excel files and return data organized by vintage
   */
  static async processFiles(
    realizedBuffer: Buffer,
    unrealizedBuffer: Buffer
  ): Promise<VintageData[]> {
    // Read the Excel files
    const realizedData = await this.readExcelBuffer(realizedBuffer);
    const unrealizedData = await this.readExcelBuffer(unrealizedBuffer);

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
   * Generate an Excel file for a specific vintage using ExcelJS
   */
  static async generateVintageExcel(vintageData: VintageData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Create the Realized sheet
    const realizedSheet = workbook.addWorksheet("Realized");
    if (vintageData.realizedRows.length > 0) {
      // Add headers
      const headers = Object.keys(vintageData.realizedRows[0]);
      realizedSheet.addRow(headers);
      
      // Add data rows
      vintageData.realizedRows.forEach(row => {
        const values = headers.map(header => row[header]);
        realizedSheet.addRow(values);
      });

      // Add autofilter
      realizedSheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(65 + headers.length - 1)}1`
      };
    }

    // Create the Unrealized sheet
    const unrealizedSheet = workbook.addWorksheet("Unrealized");
    if (vintageData.unrealizedRows.length > 0) {
      // Add headers
      const headers = Object.keys(vintageData.unrealizedRows[0]);
      unrealizedSheet.addRow(headers);
      
      // Add data rows
      vintageData.unrealizedRows.forEach(row => {
        const values = headers.map(header => row[header]);
        unrealizedSheet.addRow(values);
      });

      // Add autofilter
      unrealizedSheet.autoFilter = {
        from: 'A1',
        to: `${String.fromCharCode(65 + headers.length - 1)}1`
      };
    }

    // Create the Initial Purchase sheet with Excel formulas
    const initialPurchaseSheet = workbook.addWorksheet("Initial Purchase");
    
    // Add headers
    initialPurchaseSheet.addRow(["Symbol", "First Purchase Date", "Initial Amount"]);
    
    // Get unique symbols and add them with formulas
    const uniqueSymbols = this.getUniqueSymbols(vintageData.realizedRows);
    uniqueSymbols.forEach((symbol, index) => {
      const rowNum = index + 2; // Excel rows are 1-indexed, +1 for header
      
      // Add row with symbol and formulas
      const row = initialPurchaseSheet.addRow([symbol, null, null]);
      
      // Set First Purchase Date formula (column B)
      // Using dollar signs for absolute column references
      row.getCell(2).value = {
        formula: `MINIFS(Realized!$K:$K,Realized!$G:$G,'Initial Purchase'!A${rowNum},Realized!$M:$M,"BUY")`
      };
      
      // Set Initial Amount formula (column C)
      row.getCell(3).value = {
        formula: `SUMIFS(Realized!$P:$P,Realized!$K:$K,'Initial Purchase'!B${rowNum},Realized!$G:$G,'Initial Purchase'!A${rowNum},Realized!$M:$M,"BUY")`
      };
    });

    // Set column widths
    initialPurchaseSheet.columns = [
      { width: 15 }, // Symbol
      { width: 20 }, // First Purchase Date
      { width: 15 }  // Initial Amount
    ];

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
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
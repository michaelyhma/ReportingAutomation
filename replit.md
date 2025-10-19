# Portfolio Vintage Analyzer

A professional portfolio analysis application that processes Excel files containing realized and unrealized position data, automatically organizing them by Vintage (CQ1, CQ2, CQ3, etc.) and generating separate Excel reports for each Vintage.

## Overview

This application allows portfolio managers to upload two Excel files (realized and unrealized positions) and automatically splits the data by Vintage, generating individual Excel workbooks for each Vintage with two sheets: Realized and Unrealized.

**Current State**: MVP Complete
- Dual file upload interface with drag-and-drop support
- Automatic Vintage detection and data separation
- Excel file generation with preserved data integrity
- Beautiful, professional UI with dark mode support
- Responsive design for desktop and mobile

**Last Updated**: October 19, 2025

---

## Recent Changes

### October 19, 2025 - Initial MVP Implementation
- Created schema for file uploads and processing results
- Built comprehensive frontend with:
  - FileUploadZone component with drag-and-drop
  - VintageDownloadCard component for results display
  - ThemeProvider and ThemeToggle for dark mode
  - Complete Home page with upload, processing, and download flows
- Implemented backend with:
  - Multer for file upload handling
  - XLSX (SheetJS) library for Excel processing
  - ExcelProcessor class for data extraction and file generation
  - API endpoints for file processing and download
- Configured design system following professional financial dashboard guidelines

### October 19, 2025 - Added Initial Purchase Sheet
- Added "Initial Purchase" sheet to generated Excel files
- Sheet displays unique tickers with first purchase date and initial amount
- Uses Excel formulas (MINIFS and SUMIFS) for auditable calculations
- Updated UI to reflect 3-sheet output structure

---

## User Preferences

### Design Preferences
- Professional, financial dashboard aesthetic
- Navy blue primary color scheme (HSL: 220 90% 45% light / 220 85% 60% dark)
- Clean, minimal interface focused on clarity and efficiency
- Inter font for UI, Roboto Mono for data/file information
- Dark mode support with proper contrast ratios

### Functionality Requirements
- **No mock data**: All features must be fully functional
- **Excel formulas**: Future calculations will use auditable Excel formulas (not pre-calculated values)
- **Extensibility**: MVP focused on core upload/download, with plans to add calculation sheets
- **Data integrity**: Files processed securely, not permanently stored

---

## Project Architecture

### Tech Stack
**Frontend**:
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling
- XLSX (SheetJS) for Excel handling

**Backend**:
- Express.js
- Multer for file uploads
- XLSX (SheetJS) for Excel processing
- In-memory storage for temporary file handling

### Directory Structure
```
├── client/
│   └── src/
│       ├── components/
│       │   ├── ThemeProvider.tsx      # Dark mode context
│       │   ├── ThemeToggle.tsx        # Theme switcher
│       │   ├── FileUploadZone.tsx     # File upload component
│       │   └── VintageDownloadCard.tsx # Download card
│       ├── pages/
│       │   └── Home.tsx               # Main application page
│       └── App.tsx                     # Root component
├── server/
│   ├── routes.ts                       # API endpoints
│   ├── excelProcessor.ts               # Excel processing logic
│   └── storage.ts                      # In-memory file storage
├── shared/
│   └── schema.ts                       # TypeScript types and Zod schemas
└── design_guidelines.md                # UI/UX design specifications
```

### Data Flow

1. **Upload Phase**
   - User uploads two Excel files via FileUploadZone components
   - Files validated client-side for Excel format
   - Files sent to `/api/process-files` via FormData

2. **Processing Phase**
   - Backend reads Excel files using XLSX library
   - ExcelProcessor extracts unique Vintage names from "Vintage" column
   - Data filtered by Vintage for both realized and unrealized sheets
   - New Excel workbooks generated (one per Vintage, 2 sheets each)
   - Files stored in memory with metadata

3. **Download Phase**
   - Frontend displays VintageDownloadCard for each processed Vintage
   - User clicks download button
   - File retrieved from `/api/download/:vintageName` endpoint
   - Browser triggers file download

### Key Files

**shared/schema.ts**
- `UploadedFile`: File metadata schema
- `VintageResult`: Processed vintage information
- `ProcessFilesResponse`: API response schema

**server/excelProcessor.ts**
- `ExcelProcessor.processFiles()`: Extract and organize data by Vintage
- `ExcelProcessor.generateVintageExcel()`: Create Excel workbook with 2 sheets
- Handles "Vintage" column detection (case-insensitive)

**server/routes.ts**
- `POST /api/process-files`: Accept files, process, return results
- `GET /api/download/:vintageName`: Download specific Vintage Excel file

**client/src/pages/Home.tsx**
- Main application interface
- Manages upload state, processing mutation, and download functionality

---

## API Documentation

### POST /api/process-files

**Purpose**: Process uploaded Excel files and generate Vintage-specific reports

**Request**:
- Content-Type: multipart/form-data
- Fields:
  - `realized`: Excel file (.xlsx or .xls) with realized positions
  - `unrealized`: Excel file (.xlsx or .xls) with unrealized positions

**Response**:
```json
{
  "vintages": [
    {
      "vintageName": "CQ1",
      "filename": "CQ1_Portfolio.xlsx",
      "realizedRowCount": 15,
      "unrealizedRowCount": 8,
      "fileSize": 12458
    }
  ],
  "message": "Successfully processed 3 Vintages: CQ1, CQ2, CQ3"
}
```

**Error Responses**:
- 400: Missing files or invalid format
- 500: Processing error (e.g., missing Vintage column)

### GET /api/download/:vintageName

**Purpose**: Download generated Excel file for specific Vintage

**Request**:
- URL parameter: `vintageName` (e.g., "CQ1")

**Response**:
- Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Content-Disposition: attachment; filename="{vintageName}_Portfolio.xlsx"
- Body: Excel file binary data

**Error Responses**:
- 404: Vintage file not found
- 500: Download error

---

## File Requirements

### Input Excel Files

Both files must contain:
1. **Excel format**: .xlsx or .xls
2. **Vintage column**: A column titled "Vintage" (case-insensitive)
3. **Data in first sheet**: All data should be in the first worksheet
4. **Valid Vintage values**: Non-empty strings (e.g., "CQ1", "CQ2", "CQ3")

Example Realized File:
| Vintage | Position | Action | Shares | Price |
|---------|----------|--------|--------|-------|
| CQ1     | AAPL     | BUY    | 100    | 150   |
| CQ1     | MSFT     | SELL   | 50     | 300   |
| CQ2     | GOOGL    | BUY    | 75     | 2500  |

Example Unrealized File:
| Vintage | Position | CurrentValue | Shares |
|---------|----------|--------------|--------|
| CQ1     | AAPL     | 16000        | 100    |
| CQ2     | GOOGL    | 190000       | 75     |

### Output Excel Files

Each Vintage generates one Excel workbook with:
- **Sheet 1 "Realized"**: All realized transaction rows for that Vintage
- **Sheet 2 "Unrealized"**: All unrealized position rows for that Vintage
- **Sheet 3 "Initial Purchase"**: Analysis sheet with Excel formulas showing:
  - Symbol: Each unique ticker from the Realized sheet
  - First Purchase Date: Formula using MINIFS to find earliest BUY date
  - Initial Amount: Formula using SUMIFS to calculate amount spent on first purchase
- **Filename**: `{VintageName}_Portfolio.xlsx` (e.g., "CQ1_Portfolio.xlsx")

---

## Future Enhancements

### Planned Features
1. **Calculation Sheets**: Add custom calculation sheets with Excel formulas to each Vintage workbook
2. **Data Validation**: Enhanced validation for required columns and data types
3. **Preview Mode**: Show data preview before processing
4. **Summary Dashboard**: Overview of all Vintages with key metrics
5. **Batch Download**: Download all Vintage files as ZIP archive
6. **Export History**: Track processed files and allow re-download

### Technical Improvements
- Add PostgreSQL database for persistent file storage
- Implement file upload progress indicators
- Add Excel formula generation utilities
- Create calculation template system
- Add unit tests for ExcelProcessor

---

## Running the Application

The application runs via the "Start application" workflow which executes:
```bash
npm run dev
```

This starts:
- Express server on port 5000 (backend)
- Vite dev server (frontend)

Both servers run concurrently and are accessible at http://localhost:5000

---

## Dependencies

### Key Libraries
- **xlsx**: SheetJS library for Excel file reading and writing
- **multer**: File upload middleware for Express
- **@tanstack/react-query**: Data fetching and state management
- **wouter**: Lightweight routing for React
- **shadcn/ui**: Component library built on Radix UI
- **tailwindcss**: Utility-first CSS framework

### Development
- TypeScript for type safety
- Vite for fast development and building
- ESLint and Prettier for code quality

---

## Design System

Follows professional financial dashboard principles:
- **Color Scheme**: Navy blue primary with subtle grays
- **Typography**: Inter (UI), Roboto Mono (data)
- **Spacing**: Consistent 8px-based scale
- **Components**: Shadcn UI with custom theming
- **Contrast**: WCAG AA compliant in both light and dark modes

See `design_guidelines.md` for complete design specifications.

# Portfolio Analysis Tool - Design Guidelines

## Design Approach

**System Selected**: Material Design with Financial Dashboard Influences  
**Rationale**: Utility-focused application requiring clarity, efficiency, and trust. Drawing from professional financial platforms (Bloomberg Terminal, Interactive Brokers) combined with modern productivity tools (Notion, Linear) for clean data presentation.

**Design Principles**:
- Clarity over decoration - every element serves a functional purpose
- Trust through consistency and professionalism
- Efficiency in workflow - minimal steps from upload to download
- Data integrity emphasis - clear feedback at each processing stage

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Background: 0 0% 98% (off-white, reduces eye strain)
- Surface: 0 0% 100% (pure white for cards/containers)
- Primary: 220 90% 45% (professional navy blue for actions)
- Primary Hover: 220 90% 38%
- Text Primary: 220 20% 15% (near-black with blue tint)
- Text Secondary: 220 10% 45%
- Border: 220 15% 88%
- Success: 142 70% 45% (green for completed processes)
- Warning: 38 92% 50% (amber for processing states)
- Error: 0 72% 51% (red for validation errors)

**Dark Mode**:
- Background: 220 18% 10%
- Surface: 220 15% 14%
- Primary: 220 85% 60%
- Primary Hover: 220 85% 65%
- Text Primary: 220 10% 95%
- Text Secondary: 220 8% 65%
- Border: 220 12% 22%

### B. Typography

**Font Families**:
- Primary: Inter (via Google Fonts CDN) - UI elements, body text
- Monospace: 'Roboto Mono' - file names, data values, numerical displays

**Hierarchy**:
- H1 (Page Title): 2.5rem/600 - "Portfolio Vintage Analysis"
- H2 (Section Headers): 1.5rem/600 - "Upload Files", "Generated Reports"
- H3 (Card Titles): 1.125rem/500 - "Realized Positions", "Unrealized Positions"
- Body: 0.875rem/400 - Instructions, labels
- Small: 0.75rem/400 - Helper text, file metadata
- Data Display: 0.875rem/500 Monospace - Vintage names, file sizes

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 or p-8
- Section spacing: space-y-8 or space-y-12
- Card gaps: gap-6
- Button padding: px-6 py-3

**Grid Structure**:
- Container: max-w-6xl mx-auto px-6
- Two-column upload: grid grid-cols-1 lg:grid-cols-2 gap-6
- Results grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4

### D. Component Library

**1. File Upload Cards**
- Large dropzone areas (min-h-64) with dashed borders
- Icon: Upload icon from Heroicons (outline style)
- States: Default, Drag-over (primary border + light background), Uploaded (success background)
- File preview: Show filename, size, sheet count, "Change file" action

**2. Processing States**
- Loading spinner with descriptive text: "Analyzing Vintage data...", "Generating Excel files..."
- Progress indication if possible: "Processing 3 Vintages..."
- Use warning color during processing

**3. Download Interface**
- Card-based layout for each Vintage output file
- Each card shows: Vintage name (CQ1, CQ2, CQ3), file icon, sheet count, file size
- Primary button: "Download [Vintage] Portfolio.xlsx"
- Secondary action: "Download All" (if multiple Vintages)

**4. Navigation**
- Minimal top bar: Logo/Title left, theme toggle right
- No complex navigation needed for MVP

**5. Forms & Inputs**
- Consistent dark mode styling for all form elements
- Upload inputs styled as large, interactive dropzones
- Clear labels above each upload area: "Realized Positions Excel" / "Unrealized Positions Excel"

**6. Data Display**
- Use tables sparingly - primarily for confirmation/preview
- Card-based summaries preferred over dense tables
- Monospace font for all numerical and file data

**7. Feedback & Validation**
- Toast notifications for errors: "Please upload both Excel files"
- Inline validation: Check for 'Vintage' column presence
- Success confirmation: "Successfully generated 3 Vintage reports"

### E. Interaction Patterns

**Upload Flow**:
1. Two side-by-side upload zones (desktop) / stacked (mobile)
2. Drag-and-drop or click to browse
3. Immediate file validation and preview
4. Clear "Process Files" primary action button (disabled until both uploaded)
5. Processing state with feedback
6. Results display with download options

**Visual Hierarchy**:
- Upload section prominent at top when no files loaded
- Results section grows/appears after processing
- Subtle shadows on elevated cards (shadow-md)
- Clear visual separation between upload and results sections

**Minimal Animations**:
- Fade-in for results section (200ms)
- Button hover states (no custom animations)
- File upload success checkmark (simple scale)
- NO scroll animations, parallax, or decorative motion

---

## Page Structure

**Single-Page Application Layout**:

1. **Header** (sticky)
   - App title: "Portfolio Vintage Analyzer"
   - Subtitle: "Process realized and unrealized position data by Vintage"
   - Theme toggle (sun/moon icon)

2. **Upload Section**
   - Brief instruction text: "Upload both Excel files to begin analysis"
   - Two upload cards side-by-side (Realized / Unrealized)
   - File requirements: "Must contain a 'Vintage' column"
   - Process button (primary, large, centered below uploads)

3. **Results Section** (appears after processing)
   - Section header: "Generated Vintage Reports"
   - Vintage count badge: "3 Vintages Processed"
   - Grid of download cards (one per Vintage)
   - "Download All" option

4. **Footer** (minimal)
   - Subtle divider
   - Small text: "Data processed locally - files not stored"

---

## Professional Trust Elements

- Clean, uncluttered interface signals reliability
- Immediate file validation builds confidence
- Clear process feedback at each step
- Professional color scheme (navy blue primary)
- No unnecessary visual flourishes
- Monospace fonts for data = precision
- Privacy note in footer

---

## Images

**No hero image** - This is a utility application focused on workflow efficiency. The interface should prioritize function over visual decoration. All visual elements serve the data processing workflow.
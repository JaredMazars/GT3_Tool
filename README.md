# Tax Computation Application

A Next.js application for South African corporate income tax computation with AI-powered tax adjustment suggestions, SARS compliance, and comprehensive reporting.

## Features

### Core Functionality
- **Trial Balance Upload & Mapping**: Automated mapping of trial balance accounts to SARS IT14 items
- **AI-Powered Tax Adjustments**: OpenAI-based suggestions for tax adjustments with confidence scores
- **Document Extraction**: LLM-powered extraction of data from supporting documents (Excel, PDF, CSV)
- **Financial Reporting**: Balance sheet and income statement generation
- **Tax Computation**: Automated tax liability calculation (27% corporate rate)
- **Excel Export**: Multi-sheet workbook export for tax computations

### Technical Features
- **Robust Error Handling**: Centralized error handling with custom error classes
- **Input Validation**: Zod schema validation for all API endpoints
- **Rate Limiting**: Protection against abuse of AI and file upload endpoints
- **Retry Logic**: Automatic retry with exponential backoff for AI API calls
- **Circuit Breaker**: Prevents cascading failures in external service calls
- **File Upload Security**: Magic byte validation, size limits, and sanitization
- **Health Monitoring**: `/api/health` endpoint for system status checks

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma ORM with Azure SQL Server
- **State Management**: React Query (TanStack Query) for client-side caching
- **AI**: OpenAI GPT-4/GPT-5 for tax analysis
- **UI**: TailwindCSS + Headless UI
- **Validation**: Zod for schema validation
- **File Processing**: xlsx, jspdf, jspdf-autotable

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mapper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your values:
# - DATABASE_URL (use default for development)
# - OPENAI_API_KEY (required)
```

4. Initialize the database:
```bash
npx prisma generate
npx prisma db push  # For Azure SQL Server
# OR
npx prisma migrate dev  # For local development with migrations
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Azure SQL Server connection string | `sqlserver://server.database.windows.net:1433;database=db;user=user;password=pass;encrypt=true` |
| `OPENAI_API_KEY` | OpenAI API key for AI features | `sk-...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `MAX_FILE_UPLOAD_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `10` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `60000` (1 min) |

## Project Structure

```
mapper/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Database migrations
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── health/      # Health check endpoint
│   │   │   ├── projects/    # Project management
│   │   │   └── ...
│   │   ├── dashboard/       # Dashboard pages
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   ├── lib/                 # Core libraries
│   │   ├── errorHandler.ts  # Error handling
│   │   ├── validation.ts    # Zod schemas
│   │   ├── apiUtils.ts      # API utilities
│   │   ├── rateLimit.ts     # Rate limiting
│   │   ├── retryUtils.ts    # Retry logic
│   │   ├── fileValidator.ts # File validation
│   │   └── ...
│   └── types/               # TypeScript types
└── public/                  # Static files
```

## Usage Guide

### 1. Create a Project

1. Navigate to the dashboard
2. Click "New Project"
3. Enter project name and description
4. Click "Create Project"

### 2. Upload Trial Balance

1. Open your project
2. Go to "Mapping" tab
3. Upload Excel/CSV file with trial balance
4. System automatically maps accounts to SARS items

### 3. Review Mappings

1. Go to "Income Statement" or "Balance Sheet" tabs
2. Verify account classifications
3. Adjust mappings if needed

### 4. Generate Tax Adjustments

1. Go to "Tax Calculation" tab
2. Click "Generate AI Suggestions"
3. Review suggested adjustments
4. Approve, reject, or modify each suggestion

### 5. Add Supporting Documents

1. Click on an adjustment
2. Upload supporting documents (depreciation schedules, receipts, etc.)
3. AI automatically extracts relevant data

### 6. Calculate & Export

1. View calculated taxable income and tax liability
2. Click "Export" button
3. Choose Excel format
4. Download multi-sheet workbook

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Archive project

### Tax Adjustments
- `GET /api/projects/[id]/tax-adjustments` - List adjustments
- `POST /api/projects/[id]/tax-adjustments` - Create adjustment
- `POST /api/projects/[id]/tax-adjustments/suggestions` - Generate AI suggestions
- `PATCH /api/projects/[id]/tax-adjustments/[adjustmentId]` - Update adjustment
- `DELETE /api/projects/[id]/tax-adjustments/[adjustmentId]` - Delete adjustment

### Documents
- `POST /api/projects/[id]/tax-adjustments/[adjustmentId]/documents` - Upload document
- `POST /api/projects/[id]/tax-adjustments/[adjustmentId]/extract` - Extract data

### Export
- `GET /api/projects/[id]/tax-calculation/export?format=excel` - Export calculation

### System
- `GET /api/health` - System health check

## Development

### Database Migrations

Create a new migration:
```bash
npx prisma migrate dev --name migration_name
```

Reset database:
```bash
npx prisma migrate reset
```

View database:
```bash
npx prisma studio
```

### Linting & Type Checking

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

### Testing

```bash
# Run tests (when implemented)
npm test

# Run e2e tests
npm run test:e2e
```

## SARS Compliance

The application implements tax adjustments according to:
- **Income Tax Act, 1962** (Act No. 58 of 1962)
- **IT14 Return** format
- Key sections:
  - s11-13: Deductible expenditure and allowances
  - s18A: Donations to approved PBOs
  - s23: Prohibited deductions
  - s23M: Thin capitalization
  - s24: Timing of income recognition
  - s8(4): Recoupments

## Security Features

- Input validation on all endpoints
- Rate limiting on AI and file upload endpoints
- File upload security (magic byte validation)
- Sanitized filenames
- Error handling without sensitive data exposure
- Health monitoring

## Production Deployment

### Azure SQL Server Setup

1. Update `DATABASE_URL` in `.env`:
```
DATABASE_URL="sqlserver://your-server.database.windows.net:1433;database=your-database;user=your-user;password=your-password;encrypt=true"
```

2. Push schema to database:
```bash
npx prisma db push
```

Or if using migrations:
```bash
npx prisma migrate deploy
```

### Environment Setup

- Set `NODE_ENV=production`
- Configure rate limiting appropriately
- Set up monitoring (Sentry, etc.)
- Enable HTTPS
- Configure CORS if needed

### Build & Start

```bash
npm run build
npm start
```

## Troubleshooting

### AI Suggestions Not Generating

- Check `OPENAI_API_KEY` is set correctly
- Verify API quota/limits not exceeded
- Check console for error messages
- Retry after a few minutes if rate limited

### File Upload Failing

- Ensure file size < 10MB (or configured limit)
- Verify file type is supported (.xlsx, .xls, .pdf, .csv)
- Check `uploads/` directory permissions
- Review browser console for errors

### Database Errors

- Run `npx prisma generate` to regenerate client
- Check database connection string
- Verify migrations are up to date

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Update documentation
5. Submit a pull request

## License

[Your License Here]

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review console logs for errors
3. Verify environment variables are set correctly
4. Check database connection

## Roadmap

### Planned Features
- [ ] Authentication & authorization
- [ ] Multi-user collaboration
- [ ] PDF export functionality
- [ ] eFiling XML export (SARS format)
- [ ] Background job queue for long-running tasks
- [ ] Comprehensive test suite
- [ ] Version history for adjustments
- [ ] Comparison reports (year-over-year)
- [ ] Dashboard analytics

### Recent Updates
- ✅ React Query integration for client-side caching (5-10x faster tab switching)
- ✅ Azure SQL Server migration with optimized indexes
- ✅ Centralized error handling
- ✅ Input validation with Zod
- ✅ Rate limiting
- ✅ Retry logic for AI calls
- ✅ File upload security enhancements
- ✅ Health monitoring endpoint
- ✅ Type safety improvements
- ✅ Database indexing optimizations

### Performance Optimizations
See `PERFORMANCE_OPTIMIZATIONS.md` for detailed information about:
- React Query caching implementation
- Database query optimizations
- Composite indexes for faster queries
- Expected performance improvements (50ms vs 500-2000ms for tab switches)

---

**Built with ❤️ for South African tax professionals**

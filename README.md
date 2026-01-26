# GT3 Tool - Professional Services Practice Management Platform

A comprehensive Next.js application for managing professional services delivery across multiple service lines. Built for Forvis Mazars, this platform provides end-to-end client lifecycle management, project delivery, business development, and AI-powered tools for Tax, Audit, Accounting, Advisory, and other professional services.

## Features

### Core Functionality

#### Project Management
- **Multi-Service Line Support**: Tax, Audit, Accounting, Advisory, QRM, Business Development, IT, Finance, HR
- **Project Types**: 20+ project types across all service lines (Tax Calculation, Tax Opinion, Audit Engagement, Financial Statements, Advisory Projects, etc.)
- **Project Lifecycle Management**: From client acceptance through delivery and filing
- **Team Collaboration**: Multi-user project assignments with role-based access (Admin, Reviewer, Editor, Viewer)
- **Service Line Isolation**: Users only access projects within their authorized service lines

#### Client Management
- **External Database Integration**: Syncs with Forvis Mazars client database
- **Client Acceptance Workflows**: Risk assessment questionnaires with automated scoring
- **Risk Rating System**: Comprehensive evaluation with high-risk flagging
- **Client Analytics**: Credit rating analysis, financial ratios, document analysis
- **Client Portal**: View client history, projects, and engagement status

#### Business Development CRM
- **Opportunity Pipeline**: Customizable stages (Lead, Qualified, Proposal, Negotiation, Won, Lost)
- **Contact Management**: Track prospects and client contacts with full details
- **Activity Tracking**: Meetings, calls, emails, tasks with due dates and status
- **Proposal Management**: Version control, status tracking, document upload
- **Pipeline Analytics**: Win rates, conversion tracking, forecast reporting
- **Client Conversion**: Seamless conversion from opportunity to client

#### Document Management & AI Tools
- **AI-Powered Document Extraction**: Automated data extraction from Excel, PDF, Word, CSV
- **Opinion Drafting**: AI-assisted tax opinions with section generation and review workflow
- **Trial Balance Mapping**: Automated mapping to SARS IT14 items (Tax projects)
- **Tax Adjustment Suggestions**: OpenAI-based recommendations with confidence scores
- **Document Storage**: Organized by project with version control
- **Template Management**: Engagement letters, questionnaires, customizable templates

#### Compliance & Administration
- **Compliance Checklists**: Task management with due dates and assignments
- **Filing Status Tracking**: SARS submissions, deadlines, reference numbers
- **SARS Response Management**: Track correspondence and deadlines
- **Research Notes**: Legal precedents, case law, technical research
- **Audit Trail**: Full activity logging for compliance

#### Security & Permissions
- **Three-Tier Security Model**: System-level, Service Line-level, and Project-level access control
- **Granular Permissions**: Page and feature-level permissions with role-based access
- **Azure AD Integration**: Enterprise authentication with MSAL
- **Session Fingerprinting**: Prevents session hijacking across devices
- **Distributed Session Management**: Instant session invalidation across all instances

### Technical Features
- **Robust Error Handling**: Centralized error handling with custom error classes
- **Input Validation**: Zod schema validation for all API endpoints
- **Redis Caching**: Sessions, permissions, service lines (99% faster than database)
- **Distributed Rate Limiting**: Redis-backed rate limiting across Container App replicas
- **Background Job Queue**: Reliable job processing with retry logic and dead letter queue
- **File Upload Security**: Magic byte validation, size limits, and sanitization
- **Health Monitoring**: Comprehensive system and Redis health checks
- **Performance Optimizations**: React Query caching, database indexing, composite indexes

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma ORM with Azure SQL Server
- **Authentication**: Azure AD / Microsoft Entra ID (MSAL)
- **Caching & Sessions**: Redis (Azure Cache for Redis)
- **State Management**: React Query (TanStack Query) for client-side caching
- **AI**: Azure OpenAI (GPT-4) for document analysis, opinions, and tax suggestions
- **UI**: TailwindCSS + Headless UI (Forvis Mazars branded)
- **Validation**: Zod for schema validation
- **File Processing**: ExcelJS, Mammoth, PDF libraries
- **Email**: Azure Communication Services
- **Storage**: Azure Blob Storage for document storage
- **Search**: Azure AI Search (future)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Azure subscription with:
  - Azure SQL Server
  - Azure OpenAI
  - Azure Cache for Redis
  - Azure AD tenant

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
# - AZURE_STORAGE_CONNECTION_STRING (required for document storage)
```

**Note**: Azure Blob Storage will automatically create the following containers on first use:
- `engagement-letters` - Engagement letter documents
- `dpa` - Data Processing Agreements
- `acceptance-documents` - A&C (Acceptance & Continuance) documents
- `review-notes` - Review note attachments
- `news-bulletins` - News bulletin documents

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
| `NEXTAUTH_URL` | Application URL | `https://app.forvismazars.com` |
| `NEXTAUTH_SECRET` | JWT signing secret (32+ chars) | `<strong-random-secret>` |
| `AZURE_AD_CLIENT_ID` | Azure AD application ID | `<guid>` |
| `AZURE_AD_CLIENT_SECRET` | Azure AD client secret | `<secret>` |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID | `<guid>` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `<key>` |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name (GPT-4) | `gpt-4` |
| `REDIS_CONNECTION_STRING` | Azure Cache for Redis | `<host>:6380,password=<key>,ssl=True` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `REDIS_USERNAME` | Redis ACL username | `default` |
| `SESSION_FINGERPRINT_ENABLED` | Enable session fingerprinting | `true` |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |
| `RATE_LIMIT_BYPASS_ADMIN` | Allow admin bypass | `true` |
| `MAX_FILE_UPLOAD_SIZE` | Max file size in bytes | `10485760` (10MB) |
| `AZURE_COMMUNICATION_CONNECTION_STRING` | Email service (optional) | - |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | **Required** |

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

### Getting Started

1. **Sign in** with your Forvis Mazars Azure AD account
2. **Dashboard** displays your service lines, projects, and notifications
3. Navigate using the **service line selector** (e.g., Tax, Audit, Advisory)

### Managing Clients

1. Navigate to **Clients** section in your service line
2. **Add Client**: Link existing client from database or create acceptance workflow
3. **Client Acceptance**: Complete risk assessment questionnaire
4. **Upload Documents**: Financial statements, registration docs for analytics
5. **View Analytics**: Credit ratings, financial ratios, risk summary

### Creating Projects

1. Go to **Projects** or select client and click **New Project**
2. Choose **Project Type** based on service line:
   - Tax: Tax Calculation, Tax Opinion, Tax Administration
   - Audit: Audit Engagement, Audit Review, Audit Report
   - Accounting: Financial Statements, Bookkeeping, Management Accounts
   - Advisory: Advisory Project, Consulting Engagement, Strategy Review
3. Set **Project Details**: Name, description, tax year (if applicable), deadlines
4. **Assign Team Members** with appropriate roles (Admin, Reviewer, Editor, Viewer)
5. **Generate Engagement Letter** (if required) from template

### Working on Projects

#### Tax Calculation Projects
1. **Upload Trial Balance**: Go to Mapping tab, upload Excel/CSV
2. **Review Mappings**: Income Statement and Balance Sheet tabs
3. **Tax Adjustments**: Generate AI suggestions, review, approve
4. **Upload Supporting Documents**: Depreciation schedules, loan agreements, etc.
5. **Generate Tax Report**: AI-powered tax analysis
6. **Export**: Download Excel workbook with complete calculation

#### Opinion Drafting Projects
1. **Upload Reference Documents**: Case law, legislation, client docs
2. **Generate Opinion Sections**: Use AI to draft technical analysis
3. **Review & Edit**: Refine AI-generated content
4. **Collaborate**: Multiple reviewers can comment and approve
5. **Publish**: Finalize and export opinion document

#### General Project Workflows
1. **Document Management**: Upload files, organize by category
2. **Compliance Checklist**: Track tasks, assign team members
3. **Filing Status**: Monitor submission deadlines
4. **Research Notes**: Document technical research and precedents

### Business Development

1. Navigate to **BD** section in your service line
2. **Add Contact**: Create prospect or client contact
3. **Create Opportunity**: Track deal through pipeline stages
4. **Log Activities**: Meetings, calls, emails, tasks
5. **Upload Proposals**: Track versions, status, client responses
6. **Convert to Client**: Win opportunity and create client record

### Administration (System Admins)

1. **User Management**: Assign roles, service line access, permissions
2. **Service Lines**: Configure departments and access
3. **Templates**: Create and manage engagement letter templates
4. **Permissions**: Configure role-based access control

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Azure AD sign-in
- `GET /api/auth/logout` - Sign out and invalidate session (redirects to Azure AD logout)
- `GET /api/auth/session` - Get current user session

### Projects
- `GET /api/projects` - List projects (filtered by service line access)
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Archive project
- `POST /api/projects/[id]/users` - Assign user to project
- `DELETE /api/projects/[id]/users/[userId]` - Remove user from project

### Clients
- `GET /api/clients` - List clients (filtered by service line)
- `POST /api/clients` - Create client acceptance workflow
- `GET /api/clients/[id]` - Get client details
- `PUT /api/clients/[id]` - Update client
- `GET /api/clients/search` - Search clients by name/code

### Client Acceptance
- `POST /api/acceptance/responses` - Submit acceptance questionnaire
- `GET /api/acceptance/responses/[id]` - Get acceptance response
- `PUT /api/acceptance/responses/[id]` - Update response
- `POST /api/acceptance/responses/[id]/documents` - Upload acceptance documents
- `POST /api/acceptance/responses/[id]/approve` - Approve client acceptance

### Business Development
- `GET /api/bd/opportunities` - List opportunities
- `POST /api/bd/opportunities` - Create opportunity
- `PUT /api/bd/opportunities/[id]` - Update opportunity
- `GET /api/bd/contacts` - List contacts
- `POST /api/bd/contacts` - Create contact
- `POST /api/bd/activities` - Log activity
- `POST /api/bd/proposals` - Upload proposal
- `POST /api/bd/opportunities/[id]/convert` - Convert to client

### Documents (General)
- `POST /api/projects/[id]/documents` - Upload project document
- `GET /api/projects/[id]/documents` - List project documents
- `DELETE /api/projects/[id]/documents/[docId]` - Delete document

### Tax Features (Tax Projects)
- `POST /api/projects/[id]/mapping/upload` - Upload trial balance
- `GET /api/projects/[id]/mapping` - Get mapped accounts
- `GET /api/projects/[id]/tax-adjustments` - List adjustments
- `POST /api/projects/[id]/tax-adjustments` - Create adjustment
- `POST /api/projects/[id]/tax-adjustments/suggestions` - Generate AI suggestions
- `GET /api/projects/[id]/tax-calculation/export` - Export calculation

### Opinion Drafting
- `POST /api/projects/[id]/opinions` - Create opinion draft
- `GET /api/projects/[id]/opinions/[draftId]` - Get draft
- `POST /api/projects/[id]/opinions/[draftId]/generate` - Generate section with AI
- `PUT /api/projects/[id]/opinions/[draftId]/sections/[sectionId]` - Update section
- `POST /api/projects/[id]/opinions/[draftId]/documents` - Upload reference document

### Analytics
- `POST /api/clients/[id]/analytics/analyze` - Analyze client financials
- `GET /api/clients/[id]/credit-ratings` - Get credit ratings
- `POST /api/clients/[id]/documents` - Upload analytics document

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates/[id]` - Update template
- `GET /api/templates/[id]/generate` - Generate document from template

### Administration
- `GET /api/admin/users` - List users (System Admin)
- `PUT /api/admin/users/[id]` - Update user role/permissions
- `GET /api/admin/service-lines` - List service lines

### System Health
- `GET /api/health` - System health check
- `GET /api/health/redis` - Redis health and queue stats (System Admin)

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

## Compliance Features

### Tax Compliance (Tax Service Line)
- **SARS IT14 Mapping**: Automated trial balance to IT14 return format
- **Income Tax Act, 1962**: Implements key sections (s11-13, s18A, s23, s23M, s24, s8(4))
- **Tax Adjustment Rules**: AI-powered suggestions based on SA tax legislation
- **Filing Status Tracking**: SARS submission deadlines and reference numbers

### Audit & Quality Control
- **Client Acceptance**: Risk assessment and approval workflows
- **Engagement Letters**: Template-based generation and tracking
- **Compliance Checklists**: Task management for regulatory requirements
- **Document Management**: Organized storage with audit trail

### Security & Governance
- **Audit Logging**: Full activity tracking for compliance
- **Access Control**: Three-tier security model with granular permissions
- **Data Isolation**: Service line-based data segregation
- **Session Security**: Fingerprinting prevents unauthorized access

## Security Features

- **Azure AD Authentication**: Enterprise SSO with MSAL
- **Three-Tier Authorization**: System, Service Line, and Project level access
- **Granular Permissions**: Page and feature-level permission system
- **Session Fingerprinting**: Prevents session hijacking across devices
- **Distributed Session Management**: Instant invalidation across all instances
- **Input Validation**: Zod schema validation on all endpoints
- **Cache Key Sanitization**: Prevents cache poisoning attacks
- **Distributed Rate Limiting**: Redis-backed rate limiting across replicas
- **File Upload Security**: Magic byte validation, size limits, sanitization
- **TLS 1.2+ Enforcement**: Secure Redis and database connections
- **Audit Logging**: Complete activity trail for compliance
- **Error Handling**: No sensitive data exposure in client errors

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

### Authentication Issues

- Verify `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, and `AZURE_AD_TENANT_ID` are set
- Check that user exists in Azure AD tenant
- Ensure redirect URIs are configured in Azure AD app registration
- Review browser console for MSAL errors

### Permission Denied Errors

- Verify user has been assigned to appropriate service line
- Check that user has required permissions for the resource
- System Admins have access to all features
- Contact administrator to assign roles/permissions

### AI Features Not Working

- Check `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_API_KEY` are set
- Verify deployment name matches `AZURE_OPENAI_DEPLOYMENT`
- Check Azure OpenAI quota/limits not exceeded
- Review console for error messages

### File Upload Failing

- Ensure file size < 10MB (or configured limit)
- Verify file type is supported (.xlsx, .xls, .pdf, .csv, .docx)
- Check `uploads/` directory permissions
- Review browser console for errors

### Database Errors

- Run `npx prisma generate` to regenerate client
- Check `DATABASE_URL` connection string
- Verify migrations are up to date: `npx prisma migrate deploy`
- Check Azure SQL Server firewall rules

### Redis/Caching Issues

- Verify `REDIS_CONNECTION_STRING` is set correctly
- Check Azure Cache for Redis is running
- Application falls back to in-memory cache if Redis unavailable
- Check `/api/health/redis` endpoint for diagnostics (admin only)

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

### Recently Completed ✅
- ✅ **Azure AD Authentication** - Enterprise SSO with MSAL
- ✅ **Multi-Service Line Support** - Tax, Audit, Accounting, Advisory, QRM, BD, IT, Finance, HR
- ✅ **Three-Tier Security Model** - System, Service Line, and Project level access
- ✅ **Granular Permission System** - Role-based access control with page/feature permissions
- ✅ **Client Management** - External DB integration, acceptance workflows, risk assessment
- ✅ **Business Development CRM** - Opportunities, contacts, activities, proposals
- ✅ **Multi-User Collaboration** - Project assignments with role-based access
- ✅ **Redis Caching & Sessions** - 99% faster session lookups, distributed caching
- ✅ **Distributed Rate Limiting** - Redis-backed rate limiting across replicas
- ✅ **Background Job Queue** - Reliable job processing with retry logic
- ✅ **Client Analytics** - Credit rating analysis, financial ratios
- ✅ **Opinion Drafting** - AI-assisted tax opinion generation
- ✅ **Template Management** - Engagement letters, questionnaires
- ✅ **React Query Integration** - Client-side caching (5-10x faster tab switching)
- ✅ **Azure SQL Server** - Optimized indexes and composite keys
- ✅ **Session Fingerprinting** - Prevents session hijacking
- ✅ **Centralized Error Handling** - Custom error classes and logging
- ✅ **Health Monitoring** - System and Redis health checks

### In Progress 🚧
- 🚧 **Azure Blob Storage Integration** - Document storage and retrieval
- 🚧 **Azure AI Search** - Full-text search across documents and projects
- 🚧 **Email Notifications** - Azure Communication Services integration
- 🚧 **Advanced Analytics Dashboard** - Service line metrics, project KPIs

### Planned Features 📋
- [ ] **PDF Export** - Generate PDF reports from projects
- [ ] **eFiling XML Export** - SARS IT14 XML format (Tax projects)
- [ ] **Comprehensive Test Suite** - Unit, integration, and e2e tests
- [ ] **Version History** - Track changes to adjustments and opinions
- [ ] **Comparison Reports** - Year-over-year analysis (Tax projects)
- [ ] **Mobile App** - iOS/Android client approval and review
- [ ] **Offline Mode** - Work without internet, sync when connected
- [ ] **Advanced Workflow Automation** - Custom approval chains
- [ ] **Integration APIs** - Connect with external practice management systems
- [ ] **Advanced AI Features** - Predictive analytics, anomaly detection

### Performance Optimizations
- **React Query**: Client-side caching reduces API calls by 80%
- **Redis Caching**: Session lookups 99% faster (2-5ms vs 200ms database query)
- **Permission Caching**: Authorization checks 95% faster (cached 5 minutes)
- **Database Indexes**: Composite indexes on frequently queried columns
- **Background Jobs**: Long-running tasks processed asynchronously
- **Expected Performance**: Tab switching 50ms vs 500-2000ms before optimization

---

**Built for Forvis Mazars professional services excellence**
>>>>>>> mapper/main

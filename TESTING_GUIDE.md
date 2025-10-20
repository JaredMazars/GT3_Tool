# Testing Implementation Guide

This guide provides a complete plan for implementing a comprehensive testing strategy for the tax computation application.

## Testing Stack Recommendation

- **Unit Tests**: Vitest (faster, modern, Vite-based)
- **Integration Tests**: Vitest + Supertest
- **E2E Tests**: Playwright (official Next.js recommendation)
- **Test Database**: SQLite in-memory for speed
- **Mocking**: Vitest mocks + MSW (Mock Service Worker) for API calls

## Installation

```bash
# Install test dependencies
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test
npm install -D msw
npm install -D supertest @types/supertest
```

## Configuration Files

### 1. Vitest Configuration
Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Test Setup File
Create `tests/setup.ts`:

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.DATABASE_URL = 'file::memory:?cache=shared';
process.env.OPENAI_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
```

### 3. Playwright Configuration
Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4. Update package.json
Add test scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── mocks/                      # Mock data and handlers
│   ├── handlers.ts             # MSW request handlers
│   └── data.ts                 # Mock data
├── unit/                       # Unit tests
│   ├── lib/
│   │   ├── errorHandler.test.ts
│   │   ├── validation.test.ts
│   │   ├── apiUtils.test.ts
│   │   ├── fileValidator.test.ts
│   │   ├── rateLimit.test.ts
│   │   └── retryUtils.test.ts
│   └── components/
│       ├── TaxAdjustmentCard.test.tsx
│       └── FileUpload.test.tsx
├── integration/                # Integration tests
│   ├── api/
│   │   ├── projects.test.ts
│   │   ├── tax-adjustments.test.ts
│   │   └── health.test.ts
│   └── database/
│       └── prisma.test.ts
└── e2e/                        # E2E tests
    ├── project-creation.spec.ts
    ├── file-upload.spec.ts
    ├── tax-calculation.spec.ts
    └── export.spec.ts
```

## Example Tests

### Unit Test: Error Handler
Create `tests/unit/lib/errorHandler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { AppError, ErrorCodes, handleApiError } from '@/lib/errorHandler';
import { Prisma } from '@prisma/client';

describe('errorHandler', () => {
  describe('AppError', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError(404, 'Not found', ErrorCodes.NOT_FOUND);
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    });
  });

  describe('handleApiError', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError(400, 'Bad request', ErrorCodes.VALIDATION_ERROR);
      const response = handleApiError(error);
      
      expect(response.status).toBe(400);
    });

    it('should handle Prisma P2002 error (unique constraint)', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: ['email'] },
        }
      );
      
      const response = handleApiError(prismaError);
      expect(response.status).toBe(409);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const response = handleApiError(error);
      
      expect(response.status).toBe(500);
    });
  });
});
```

### Unit Test: Validation
Create `tests/unit/lib/validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createProjectSchema,
  createTaxAdjustmentSchema,
  paginationSchema
} from '@/lib/validation';

describe('validation', () => {
  describe('createProjectSchema', () => {
    it('should validate correct project data', () => {
      const data = {
        name: 'Test Project',
        description: 'A test project'
      };
      
      expect(() => createProjectSchema.parse(data)).not.toThrow();
    });

    it('should trim whitespace from name', () => {
      const data = {
        name: '  Test Project  ',
        description: 'test'
      };
      
      const result = createProjectSchema.parse(data);
      expect(result.name).toBe('Test Project');
    });

    it('should reject empty name', () => {
      const data = { name: '', description: 'test' };
      
      expect(() => createProjectSchema.parse(data)).toThrow();
    });

    it('should reject name that is too long', () => {
      const data = {
        name: 'a'.repeat(201),
        description: 'test'
      };
      
      expect(() => createProjectSchema.parse(data)).toThrow();
    });
  });

  describe('createTaxAdjustmentSchema', () => {
    it('should validate correct adjustment data', () => {
      const data = {
        type: 'DEBIT',
        description: 'Test adjustment',
        amount: 1000,
      };
      
      expect(() => createTaxAdjustmentSchema.parse(data)).not.toThrow();
    });

    it('should reject negative amount', () => {
      const data = {
        type: 'DEBIT',
        description: 'Test',
        amount: -100,
      };
      
      expect(() => createTaxAdjustmentSchema.parse(data)).toThrow();
    });

    it('should reject invalid type', () => {
      const data = {
        type: 'INVALID',
        description: 'Test',
        amount: 100,
      };
      
      expect(() => createTaxAdjustmentSchema.parse(data)).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.parse({});
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should parse query params correctly', () => {
      const result = paginationSchema.parse({ page: '2', limit: '50' });
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should reject limit over 100', () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    });
  });
});
```

### Integration Test: Projects API
Create `tests/integration/api/projects.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Note: You'll need to set up a test server instance
const baseURL = 'http://localhost:3000';

describe('Projects API', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.project.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const response = await request(baseURL)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          description: 'A test project'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Project');
    });

    it('should reject project without name', async () => {
      const response = await request(baseURL)
        .post('/api/projects')
        .send({
          description: 'No name'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    it('should list all projects', async () => {
      const response = await request(baseURL)
        .get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should exclude archived projects by default', async () => {
      const response = await request(baseURL)
        .get('/api/projects');

      const archivedProjects = response.body.data.filter(
        (p: any) => p.archived === true
      );
      expect(archivedProjects).toHaveLength(0);
    });
  });
});
```

### E2E Test: Project Creation
Create `tests/e2e/project-creation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Project Creation Flow', () => {
  test('should create a new project successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Click "New Project" button
    await page.click('button:has-text("New Project")');

    // Fill in project details
    await page.fill('input[placeholder="Enter project name"]', 'E2E Test Project');
    await page.fill('textarea', 'This is a test project created by E2E tests');

    // Submit form
    await page.click('button:has-text("Create Project")');

    // Wait for redirect and check URL
    await expect(page).toHaveURL(/\/dashboard\/projects\/\d+/);

    // Verify project details are displayed
    await expect(page.locator('h1')).toContainText('E2E Test Project');
  });

  test('should show validation error for empty name', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("New Project")');

    // Try to submit without filling name
    await page.click('button:has-text("Create Project")');

    // Check for validation message
    await expect(page.locator('text=/required|cannot be empty/i')).toBeVisible();
  });

  test('should be able to cancel project creation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("New Project")');

    // Fill some data
    await page.fill('input[placeholder="Enter project name"]', 'Cancelled Project');

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Should return to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Project should not be created
    await expect(page.locator('text=Cancelled Project')).not.toBeVisible();
  });
});
```

## Mocking External Services

Create `tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  type: 'DEBIT',
                  description: 'Test adjustment',
                  amount: 1000,
                  sarsSection: 's23',
                  confidenceScore: 0.9,
                  reasoning: 'Test reasoning',
                  calculationDetails: {
                    method: 'test_method',
                    inputs: {}
                  }
                }
              ]
            })
          }
        }
      ]
    });
  }),
];
```

Create `tests/mocks/setup.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
```

## Running Tests

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test file
npm test tests/unit/lib/errorHandler.test.ts
```

## CI/CD Integration

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Run type check
        run: npx tsc --noEmit
        
      - name: Run unit tests
        run: npm run test:coverage
        
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
```

## Coverage Goals

- **Overall**: 80%
- **Critical paths** (tax calculations, file uploads): 90%
- **API routes**: 70%
- **Utility functions**: 90%
- **Components**: 70%

## Best Practices

1. **Arrange, Act, Assert (AAA)**: Structure all tests with this pattern
2. **One assertion per test**: Keep tests focused and simple
3. **Descriptive test names**: Use full sentences describing what is being tested
4. **Test behavior, not implementation**: Focus on what the code does, not how
5. **Isolate tests**: Each test should be independent
6. **Use factories**: Create test data factories for complex objects
7. **Mock external dependencies**: Don't make real API calls in tests
8. **Clean up after tests**: Reset database, clear mocks, etc.

## Next Steps

1. Install dependencies
2. Configure test files
3. Write tests for critical functionality first
4. Add tests incrementally for new features
5. Set up pre-commit hooks to run tests
6. Configure CI/CD pipeline

---

**Target**: 80% overall coverage, 90% for critical paths
**Timeline**: 2-3 days for initial test suite




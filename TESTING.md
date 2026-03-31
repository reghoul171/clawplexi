# Testing Guide

Comprehensive guide to testing the PM Dashboard application.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage](#coverage)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The PM Dashboard uses a comprehensive testing strategy covering unit, integration, and component tests. The test suite ensures code quality and prevents regressions.

### Test Statistics (Phase 2)

| Metric          | Backend | Frontend | Total |
| --------------- | ------- | -------- | ----- |
| Tests           | 131     | 97       | 228   |
| Coverage        | 44.68%  | 24.06%   | -     |
| Target Coverage | 70%     | 70%      | 70%   |

---

## Test Stack

### Backend

| Tool         | Purpose                               |
| ------------ | ------------------------------------- |
| Vitest       | Test runner and assertion library     |
| Supertest    | HTTP/API integration testing          |
| better-sqlite3 | In-memory database for tests        |

### Frontend

| Tool                      | Purpose                           |
| ------------------------- | --------------------------------- |
| Vitest                    | Test runner and assertions        |
| React Testing Library     | React component testing           |
| @testing-library/jest-dom | Extended DOM matchers             |
| jsdom                     | Browser environment simulation    |

### Coverage

| Tool  | Purpose                    |
| ----- | -------------------------- |
| v8    | Native V8 coverage provider |

---

## Running Tests

### All Tests

```bash
# Run all tests (backend + frontend)
npm test

# Run all tests with coverage
npm run test:coverage
```

### Backend Tests

```bash
# Run backend tests
npm run test:backend

# Run backend tests with coverage
npm run test:coverage:backend

# Run specific test file
cd backend
npx vitest run __tests__/unit/database.test.js

# Watch mode
npx vitest watch
```

### Frontend Tests

```bash
# Run frontend tests
npm run test:frontend

# Run frontend tests with coverage
npm run test:coverage:frontend

# Run specific test file
cd frontend
npx vitest run src/__tests__/components/Overview.test.jsx

# Watch mode
npx vitest watch
```

### Filter Tests

```bash
# Run tests matching a pattern
npx vitest run -t "database"

# Run only unit tests
npx vitest run __tests__/unit/

# Run only integration tests
npx vitest run __tests__/integration/
```

---

## Test Structure

### Backend Structure

```
backend/
└── __tests__/
    ├── setup.js               # Global setup (runs before all tests)
    ├── fixtures/              # Test data and sample states
    │   └── projects.js        # Sample project fixtures
    ├── helpers/               # Test utilities
    │   └── testDb.js          # In-memory SQLite helper
    ├── unit/                  # Unit tests (fast, isolated)
    │   ├── config.test.js     # Configuration module tests
    │   ├── database.test.js   # Database operations tests
    │   ├── middleware.test.js # Middleware tests
    │   ├── projectState.test.js # Project state parsing
    │   ├── services/          # Service layer tests
    │   │   └── project.service.test.js
    │   ├── sync.test.js       # Sync logic tests
    │   ├── controllers.test.js # Controller layer tests
    │   └── routes.test.js     # Route definition tests
    └── integration/           # Integration tests (slower)
        └── api.test.js        # Full API integration tests
```

### Frontend Structure

```
frontend/
└── src/
    └── __tests__/
        ├── setup.js           # Global setup (jsdom config)
        ├── components/        # React component tests
        │   ├── Sidebar.test.jsx
        │   ├── Overview.test.jsx
        │   ├── ListView.test.jsx
        │   └── BoardView.test.jsx
        ├── hooks/             # Custom hook tests
        │   └── useTesterAgent.test.js
        ├── utils/             # Utility function tests
        │   ├── calculatePhase.test.js
        │   ├── normalizeProject.test.js
        │   └── transformProjects.test.js
        └── config/            # Configuration tests
            └── api.test.js
```

### Test File Naming

| Type     | Pattern                    | Example                    |
| -------- | -------------------------- | -------------------------- |
| Unit     | `*.test.js`                | `database.test.js`         |
| Component| `*.test.jsx`               | `Sidebar.test.jsx`         |
| Fixture  | `*.js` (in fixtures/)      | `projects.js`              |
| Helper   | `*.js` (in helpers/)       | `testDb.js`                |

---

## Writing Tests

### Backend Unit Test

```javascript
// __tests__/unit/services/project.service.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProjectService from '../../../services/project.service.js';
import { createTestDb, cleanupTestDb } from '../../helpers/testDb.js';
import { sampleProject } from '../../fixtures/projects.js';

describe('ProjectService', () => {
  let service;
  let db;

  beforeEach(async () => {
    db = await createTestDb();
    service = new ProjectService(db);
  });

  afterEach(async () => {
    await cleanupTestDb(db);
  });

  describe('getAllProjects', () => {
    it('should return an array of projects', async () => {
      const projects = await service.getAllProjects();
      expect(projects).toBeInstanceOf(Array);
    });

    it('should return empty array when no projects exist', async () => {
      const projects = await service.getAllProjects();
      expect(projects).toHaveLength(0);
    });
  });

  describe('updateStepStatus', () => {
    it('should update step status to done', async () => {
      // Arrange
      await service.upsertProject(sampleProject);

      // Act
      const result = await service.updateStepStatus('TestProject', '1', 'done');

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
```

### Backend Integration Test

```javascript
// __tests__/integration/api.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { createTestDb } from '../helpers/testDb.js';

describe('Projects API', () => {
  let app;
  let db;

  beforeAll(async () => {
    db = await createTestDb();
    app = createApp({ db });
  });

  afterAll(async () => {
    db.close();
  });

  describe('GET /api/projects', () => {
    it('should return all projects', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /api/projects/:name/steps/:stepNumber/status', () => {
    it('should update step status', async () => {
      const response = await request(app)
        .patch('/api/projects/TestProject/steps/1/status')
        .send({ status: 'done' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .patch('/api/projects/TestProject/steps/1/status')
        .send({ status: 'invalid' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
```

### Frontend Component Test

```javascript
// src/__tests__/components/Overview.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Overview from '../../components/Overview';

describe('Overview Component', () => {
  const mockProject = {
    project_name: 'TestProject',
    project_description: 'A test project',
    progress_percentage: 50,
    tech_stack: ['React', 'Node.js'],
    implementation_plan: [
      { step: '1', task: 'Setup', status: 'done' },
      { step: '2', task: 'Build', status: 'in_progress' },
    ],
  };

  it('renders project name', () => {
    render(<Overview project={mockProject} />);
    expect(screen.getByText('TestProject')).toBeInTheDocument();
  });

  it('renders project description', () => {
    render(<Overview project={mockProject} />);
    expect(screen.getByText('A test project')).toBeInTheDocument();
  });

  it('renders tech stack badges', () => {
    render(<Overview project={mockProject} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('handles null project gracefully', () => {
    render(<Overview project={null} />);
    expect(screen.getByText(/no project selected/i)).toBeInTheDocument();
  });
});
```

### Frontend Hook Test

```javascript
// src/__tests__/hooks/useTesterAgent.test.js
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTesterAgent } from '../../hooks/useTesterAgent';

describe('useTesterAgent Hook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useTesterAgent());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('creates tests successfully', async () => {
    const { result } = renderHook(() => useTesterAgent());

    await act(async () => {
      await result.current.createTests('TestProject');
    });

    expect(result.current.isLoading).toBe(false);
  });
});
```

---

## Coverage

### Viewing Coverage Reports

After running tests with coverage:

```bash
# Generate coverage
npm run test:coverage

# View HTML report (backend)
open backend/coverage/index.html

# View HTML report (frontend)
open frontend/coverage/index.html
```

### Coverage Targets

| Layer    | Current | Target |
| -------- | ------- | ------ |
| Backend  | 44.68%  | 70%    |
| Frontend | 24.06%  | 70%    |

### Coverage Configuration

**Backend** (`backend/vitest.config.js`):
```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['__tests__/**', 'bin/**'],
  target: 70,
}
```

**Frontend** (`frontend/vitest.config.js`):
```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: ['src/__tests__/**', 'src/main.jsx'],
  target: 70,
}
```

### Improving Coverage

To identify uncovered code:

1. Run `npm run test:coverage`
2. Open `coverage/index.html` in a browser
3. Look for red/highlighted lines
4. Write tests for uncovered branches

---

## Best Practices

### Test Organization

1. **One test file per module** - `database.js` → `database.test.js`
2. **Group related tests** with `describe` blocks
3. **Use clear test names** that describe expected behavior

### Test Structure (AAA Pattern)

```javascript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clean up in `afterEach` or `afterAll`

### Mocking

```javascript
// Mock external dependencies
vi.mock('../../lib/database.js', () => ({
  getAllProjects: vi.fn(() => Promise.resolve([])),
}));

// Restore mocks after tests
afterEach(() => {
  vi.restoreAllMocks();
});
```

### Avoid Common Pitfalls

1. **Don't test implementation details** - Test behavior, not internals
2. **Don't rely on test order** - Tests should run in any order
3. **Don't skip failing tests** - Fix the underlying issue
4. **Don't test third-party libraries** - They have their own tests

---

## Troubleshooting

### Common Issues

#### Tests Fail with "Cannot find module"

```bash
# Ensure dependencies are installed
npm install
npm install --prefix backend
npm install --prefix frontend
```

#### Database Locked Errors

```bash
# Stop any running instances
pm-dashboard stop

# Clear test databases
rm -rf backend/__tests__/*.db
```

#### Coverage Report Not Generated

```bash
# Ensure v8 coverage is available
node --version  # Should be >= 14

# Run with explicit coverage
npx vitest run --coverage
```

### Debug Mode

```bash
# Run tests with verbose output
npx vitest run --reporter=verbose

# Debug specific test
npx vitest run -t "test name" --reporter=verbose
```

### CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./backend/coverage/coverage-final.json
```

---

## Code Quality Integration

### Pre-commit Hooks

Tests are automatically run via Husky + lint-staged:

```bash
# .husky/pre-commit
npx lint-staged
```

### lint-staged Configuration

Automatically lints and formats staged files before commit.

---

## Related Documentation

- [README.md](README.md) - Project overview and quick start
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture details
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

_Document Version: 1.0.0_  
_Last Updated: 2026-03-31_

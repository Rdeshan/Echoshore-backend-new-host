# 🧪 EcoShore Backend - Testing Documentation

## Table of Contents

- [Overview](#overview)
- [Testing Strategy](#testing-strategy)
- [Test Structure](#test-structure)
- [Module Testing Guide](#module-testing-guide)
  - [Chat Module](#chat-module)
  - [Event Module](#event-module)
  - [Meeting Module](#meeting-module)
  - [Beach Module](#beach-module)
  - [Analytics Module](#analytics-module)
  - [Agent Module](#agent-module)
- [Running Tests](#running-tests)
- [Test Configuration](#test-configuration)
- [Coverage Goals](#coverage-goals)
- [Best Practices](#best-practices)
- [Debugging Tests](#debugging-tests)

---

## Overview

The EcoShore backend implements a comprehensive testing strategy using **Jest** as the testing framework and **Supertest** for HTTP endpoint testing. Our test suite ensures code reliability, maintainability, and quality across all major modules.

### Testing Metrics

- **Test Framework**: Jest v30.2.0
- **HTTP Testing**: Supertest v7.2.2
- **Test Database**: MongoDB Memory Server v11.0.1
- **Test Timeout**: 30 seconds per test
- **Coverage Target**: 80%+ for controllers and services
- **Total Test Files**: 26+ test files across all modules

---

## Testing Strategy

### Three-Tier Testing Approach

Our testing infrastructure consists of three complementary testing layers:

#### 1. **Unit Tests** (`src/tests/unit/`)

- Test individual functions and methods in isolation
- Mock external dependencies (database, services, APIs)
- Fast execution with minimal overhead
- Focus on business logic validation
- File naming: `{module}.{layer}.test.js`

**Coverage areas:**

- Controllers: Request handling, response formatting, error handling
- Services: Business logic, data transformation, validation
- Routes: Route definition, middleware chain verification

#### 2. **Integration Tests** (`src/tests/integration/`)

- Test complete workflows across multiple components
- Use MongoDB Memory Server for isolated database testing
- Verify API endpoints end-to-end
- Test middleware interactions
- File naming: `{module}.routes.test.js`

**Coverage areas:**

- Full request/response cycles
- Database transactions and data persistence
- Middleware chain execution
- Error handling across layers

#### 3. **Performance Tests** (`src/tests/performance/`)

- Monitor execution time and resource usage
- Identify performance bottlenecks
- Benchmark critical operations
- Test under various load scenarios
- File naming: `{module}.perf.test.js`

**Coverage areas:**

- Query performance
- API response time
- Concurrent request handling
- Memory usage patterns

---

## Test Structure

### Directory Layout

```
src/tests/
├── setup/
│   └── jest.setup.js                 # Global test setup
├── unit/
│   ├── agent.controller.test.js
│   ├── agent.service.test.js
│   ├── analytics.controller.test.js
│   ├── analytics.service.test.js
│   ├── beach.controller.test.js
│   ├── beach.service.test.js
│   ├── chat.controller.test.js
│   ├── chat.service.test.js
│   ├── event.controller.test.js
│   ├── event.service.test.js
│   ├── meeting.controller.test.js
│   ├── meeting.service.test.js
│   └── post.routes.test.js
├── integration/
│   ├── agent.routes.test.js
│   ├── analytics.routes.test.js
│   ├── beach.routes.test.js
│   ├── chat.routes.test.js
│   ├── event.routes.test.js
│   ├── meeting.routes.test.js
│   └── post.routes.test.js
└── performance/
    ├── agent.performance.test.js
    ├── analytics.perf.test.js
    ├── beach.perf.test.js
    ├── chat.perf.test.js
    ├── meeting.perf.test.js
    └── post.perf.test.js
```

### Jest Configuration

**File**: `jest.config.js`

```javascript
{
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/controller/**/*.js',
    'src/service/**/*.js',
    'src/routes/**/*.js',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/jest.setup.js'],
}
```

---

## Module Testing Guide

### Chat Module

#### Overview

The Chat Module handles real-time messaging, chat group creation, and message management for community communication.

#### Unit Tests: `chat.controller.test.js`

**Test Cases:**

| Test Case         | Purpose                                    | Status |
| ----------------- | ------------------------------------------ | ------ |
| `createChatGroup` | Verify chat group creation returns 201     | ✅     |
| `getMessages`     | Validate message retrieval with pagination | ✅     |
| `sendMessage`     | Test message sending and persistence       | ✅     |
| `deleteMessage`   | Verify message deletion authorization      | ✅     |
| `getChatGroups`   | Test group listing with filters            | ✅     |

**Key Assertions:**

```javascript
// Example: Creating a chat group
expect(chatService.createChatGroup).toHaveBeenCalledWith(req.body, req.user.id);
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith({
  success: true,
  message: 'Chat group created successfully',
  data: mockGroup,
});
```

#### Service Tests: `chat.service.test.js`

**Tested Functions:**

- `createChatGroup()` - Group creation logic
- `addMembersToGroup()` - Member management
- `getMessages()` - Message retrieval
- `sendMessage()` - Message persistence
- `deleteMessage()` - Message removal

#### Integration Tests: `chat.routes.test.js`

**Endpoint Coverage:**

- `POST /api/chats/groups` - Create chat group
- `GET /api/chats/groups` - List groups
- `GET /api/chats/messages/:groupId` - Get messages
- `POST /api/chats/messages` - Send message
- `DELETE /api/chats/messages/:messageId` - Delete message

**Test Scenarios:**

- Authenticated user operations
- Group member validation
- Message history pagination
- Error handling for invalid inputs

#### Performance Tests: `chat.perf.test.js`

**Benchmarks:**

- Message sending: <100ms
- Group creation: <50ms
- Message retrieval: <200ms for 1000+ messages

---

### Event Module

#### Overview

The Event Module manages beach cleanup events, volunteer registration, event scheduling, and event analytics.

#### Unit Tests: `event.controller.test.js`

**Test Cases:**

| Test Case           | Purpose                                        | Status |
| ------------------- | ---------------------------------------------- | ------ |
| `createEvent`       | Verify event creation with 201 response        | ✅     |
| `getEvents`         | Test event listing with filters and pagination | ✅     |
| `updateEvent`       | Validate event update authorization            | ✅     |
| `deleteEvent`       | Test soft deletion and authorization           | ✅     |
| `registerVolunteer` | Verify volunteer registration                  | ✅     |
| `getEventDetails`   | Test single event retrieval                    | ✅     |

**Key Assertions:**

```javascript
// Example: Getting events with filters
expect(eventService.getEvents).toHaveBeenCalledWith({
  page: 1,
  limit: 10,
  status: 'UPCOMING',
});
expect(res.status).toHaveBeenCalledWith(200);
```

#### Service Tests: `event.service.test.js`

**Tested Functions:**

- `createEvent()` - Event creation with validation
- `getEvents()` - Event query with filtering
- `updateEvent()` - Event modification
- `deleteEvent()` - Event soft deletion
- `registerVolunteer()` - Volunteer registration
- `calculateEventMetrics()` - Statistics computation

#### Integration Tests: `event.routes.test.js`

**Endpoint Coverage:**

- `POST /api/events` - Create event
- `GET /api/events` - List events
- `GET /api/events/:eventId` - Get event details
- `PATCH /api/events/:eventId` - Update event
- `DELETE /api/events/:eventId` - Delete event
- `POST /api/events/:eventId/register` - Register volunteer

**Test Scenarios:**

- Authorization checks (organizer only)
- Date validation
- Capacity constraints
- Duplicate registration prevention
- Past event protection

#### Performance Tests: `event.perf.test.js`

**Benchmarks:**

- Event creation: <100ms
- Event listing (1000+ records): <300ms
- Volunteer registration: <75ms
- Event search/filter: <250ms

---

### Meeting Module

#### Overview

The Meeting Module handles scheduling of meetings, participant management, and meeting coordination for event organization.

#### Unit Tests: `meeting.controller.test.js`

**Test Cases:**

| Test Case         | Purpose                                  | Status |
| ----------------- | ---------------------------------------- | ------ |
| `scheduleMeeting` | Verify meeting scheduling returns 201    | ✅     |
| `getMeetings`     | Test meeting retrieval with date filters | ✅     |
| `updateMeeting`   | Validate meeting update authorization    | ✅     |
| `cancelMeeting`   | Test meeting cancellation                | ✅     |
| `addParticipants` | Verify participant addition              | ✅     |

**Key Assertions:**

```javascript
// Example: Scheduling a meeting
expect(meetingService.scheduleMeeting).toHaveBeenCalledWith(
  organizerId,
  meetingData
);
expect(res.status).toHaveBeenCalledWith(201);
```

#### Service Tests: `meeting.service.test.js`

**Tested Functions:**

- `scheduleMeeting()` - Meeting creation with conflict detection
- `getMeetings()` - Meeting retrieval with filtering
- `updateMeeting()` - Meeting modification
- `cancelMeeting()` - Meeting cancellation and notifications
- `addParticipants()` - Participant management
- `checkConflicts()` - Time slot conflict detection

#### Integration Tests: `meeting.routes.test.js`

**Endpoint Coverage:**

- `POST /api/meetings` - Schedule meeting
- `GET /api/meetings` - List meetings
- `PATCH /api/meetings/:meetingId` - Update meeting
- `DELETE /api/meetings/:meetingId` - Cancel meeting
- `POST /api/meetings/:meetingId/participants` - Add participants

**Test Scenarios:**

- Time conflict detection
- Participant availability
- Meeting organizer authorization
- Notification triggers
- Past meeting protection

#### Performance Tests: `meeting.perf.test.js`

**Benchmarks:**

- Meeting scheduling: <100ms
- Conflict detection: <150ms
- Meeting listing: <200ms
- Participant addition: <50ms

---

### Beach Module

#### Overview

The Beach Module manages beach information, location data, waste type categories, and beach cleanup status tracking.

#### Unit Tests: `beach.controller.test.js`

**Test Cases:**

| Test Case         | Purpose                               | Status |
| ----------------- | ------------------------------------- | ------ |
| `createBeach`     | Verify beach creation with formatting | ✅     |
| `getBeaches`      | Test beach listing with pagination    | ✅     |
| `updateBeach`     | Validate beach update authorization   | ✅     |
| `deleteBeach`     | Test beach soft deletion              | ✅     |
| `getBeachDetails` | Test single beach retrieval           | ✅     |
| `getWasteTypes`   | Verify waste type categories          | ✅     |

**Key Assertions:**

```javascript
// Example: Creating a beach
expect(beachService.createBeach).toHaveBeenCalledWith(req.body, 'user-id');
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({
    success: true,
    data: expect.objectContaining({ beach: expect.any(Object) }),
  })
);
```

#### Service Tests: `beach.service.test.js`

**Tested Functions:**

- `createBeach()` - Beach creation with validation
- `getAllBeaches()` - Beach listing with filters
- `getBeachById()` - Single beach retrieval
- `updateBeach()` - Beach modification
- `deleteBeach()` - Beach soft deletion
- `getWasteCategories()` - Waste type retrieval
- `calculateSeverity()` - Beach severity ranking

#### Integration Tests: `beach.routes.test.js`

**Endpoint Coverage:**

- `POST /api/beaches` - Create beach
- `GET /api/beaches` - List beaches
- `GET /api/beaches/:beachId` - Get beach details
- `PATCH /api/beaches/:beachId` - Update beach
- `DELETE /api/beaches/:beachId` - Delete beach
- `GET /api/beaches/:beachId/waste-types` - Get waste types

**Test Scenarios:**

- Geographic data validation
- Duplicate beach prevention
- Waste type association
- Status transitions
- Authorization checks

#### Performance Tests: `beach.perf.test.js`

**Benchmarks:**

- Beach creation: <50ms
- Beach listing (5000+ records): <400ms
- Beach by ID retrieval: <25ms
- Waste type retrieval: <30ms

---

### Analytics Module

#### Overview

The Analytics Module processes waste data, generates insights, calculates carbon offsets, and provides pollution prediction using ML models.

#### Unit Tests: `analytics.controller.test.js`

**Test Cases:**

| Test Case              | Purpose                            | Status |
| ---------------------- | ---------------------------------- | ------ |
| `getWasteAnalytics`    | Verify waste data aggregation      | ✅     |
| `getCarbonMetrics`     | Test carbon offset calculation     | ✅     |
| `getPollutionForecast` | Validate ML prediction integration | ✅     |
| `generateReport`       | Test report generation             | ✅     |
| `getBeachRanking`      | Test severity-based ranking        | ✅     |
| `getTimeSeriesData`    | Validate trend analysis            | ✅     |

**Key Assertions:**

```javascript
// Example: Getting waste analytics
expect(analyticsService.getWasteAnalytics).toHaveBeenCalledWith(filters);
expect(res.status).toHaveBeenCalledWith(200);
expect(res.json).toHaveBeenCalledWith({
  success: true,
  data: expect.objectContaining({
    totalWaste: expect.any(Number),
    wasteByType: expect.any(Object),
  }),
});
```

#### Service Tests: `analytics.service.test.js`

**Tested Functions:**

- `getWasteAnalytics()` - Waste data aggregation and analysis
- `calculateCarbonOffset()` - Carbon calculation algorithm
- `getPollutionForecast()` - ML model integration (89% confidence)
- `generateReport()` - Report generation (JSON/CSV)
- `getBeachRanking()` - Severity-based ranking algorithm
- `getTimeSeriesData()` - Trend analysis over time
- `getDemographicBreakdown()` - Volunteer/waste statistics
- `getTrendAnalysis()` - Historical pattern identification

#### Integration Tests: `analytics.routes.test.js`

**Endpoint Coverage:**

- `GET /api/analytics/waste` - Waste analytics
- `GET /api/analytics/carbon` - Carbon metrics
- `GET /api/analytics/forecast` - Pollution forecast
- `GET /api/analytics/reports` - Report generation
- `GET /api/analytics/ranking` - Beach ranking
- `GET /api/analytics/trends` - Trend analysis

**Test Scenarios:**

- Date range filtering
- Beach-specific analytics
- Report export formats
- ML prediction accuracy
- Data aggregation correctness
- Edge cases (no data, incomplete data)

#### Performance Tests: `analytics.perf.test.js`

**Benchmarks:**

- Waste analytics (1 year data): <500ms
- Carbon calculation (1000+ records): <200ms
- Pollution forecast: <300ms
- Beach ranking: <150ms
- Report generation: <400ms

---

### Agent Module

#### Overview

The Agent Module manages agent user accounts, agent activities, assigned beaches, and performance metrics for volunteer coordinators.

#### Unit Tests: `agent.controller.test.js`

**Test Cases:**

| Test Case         | Purpose                         | Status |
| ----------------- | ------------------------------- | ------ |
| `createAgent`     | Verify agent account creation   | ✅     |
| `getAgents`       | Test agent listing with filters | ✅     |
| `updateAgent`     | Validate agent modification     | ✅     |
| `assignBeaches`   | Test beach assignment logic     | ✅     |
| `getAgentMetrics` | Verify performance metrics      | ✅     |

**Key Assertions:**

```javascript
// Example: Creating an agent
expect(agentService.createAgent).toHaveBeenCalledWith(agentData);
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({
    success: true,
    message: 'Agent created successfully',
  })
);
```

#### Service Tests: `agent.service.test.js`

**Tested Functions:**

- `createAgent()` - Agent account creation with validation
- `getAgents()` - Agent listing with filtering
- `updateAgent()` - Agent profile modification
- `assignBeaches()` - Beach assignment logic
- `getAgentMetrics()` - Performance metrics calculation
- `getAgentEvents()` - Agent-managed events
- `validateAgentAccess()` - Permission validation

#### Integration Tests: `agent.routes.test.js`

**Endpoint Coverage:**

- `POST /api/agents` - Create agent
- `GET /api/agents` - List agents
- `PUT /api/agents/:agentId` - Update agent
- `POST /api/agents/:agentId/beaches` - Assign beaches
- `GET /api/agents/:agentId/metrics` - Get performance metrics
- `GET /api/agents/:agentId/events` - Get managed events

**Test Scenarios:**

- Agent role validation
- Beach assignment constraints
- Performance metric accuracy
- Authorization checks
- Activity tracking
- Suspension/activation logic

#### Performance Tests: `agent.performance.test.js`

**Benchmarks:**

- Agent creation: <75ms
- Agent listing (1000+ records): <250ms
- Beach assignment: <50ms
- Metrics calculation: <200ms

---

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure MongoDB Memory Server is configured
# (automatically installed via dev dependencies)
```

### Execute All Tests

```bash
# Run complete test suite
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- chat.controller.test.js

# Run tests matching pattern
npm test -- --testNamePattern="createChatGroup"

# Watch mode (rerun on file changes)
npm test -- --watch
```

### Run Tests by Category

```bash
# Unit tests only
npm test -- src/tests/unit/

# Integration tests only
npm test -- src/tests/integration/

# Performance tests only
npm test -- src/tests/performance/

# Specific module tests
npm test -- --testPathPattern="chat"
```

### Test with Additional Options

```bash
# Verbose output
npm test -- --verbose

# No coverage
npm test -- --no-coverage

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Show test report
npm test -- --ci --reporters=default --reporters=junit
```

---

## Test Configuration

### Jest Setup File

**File**: `src/tests/setup/jest.setup.js`

Executed before test suite runs, provides:

- Global mock cleanup in `afterEach`
- Test environment configuration
- Shared utilities and fixtures

### Environment Variables for Testing

Create `.env.test` file in project root:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ecoshore-test
DB_NAME=ecoshore_test

# JWT
JWT_SECRET=test-secret-key
JWT_EXPIRE=24h

# Email (disabled for tests)
SMTP_ENABLED=false

# APIs (mock or test endpoints)
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-secret
```

### Mock Patterns Used

#### Service Mocking

```javascript
jest.mock('../../service/chat.service');
// Allows complete control over service behavior
```

#### Response Mocking

```javascript
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
```

#### Database Mocking (Integration Tests)

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
// In-memory MongoDB for isolated testing
```

---

## Coverage Goals

### Target Coverage Metrics

| Layer       | Target  | Current         |
| ----------- | ------- | --------------- |
| Controllers | 85%     | In Progress     |
| Services    | 90%     | In Progress     |
| Routes      | 80%     | In Progress     |
| Utils       | 85%     | In Progress     |
| **Overall** | **80%** | **In Progress** |

### Coverage Report Generation

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report (if available)
open coverage/lcov-report/index.html
```

### Coverage File: `coverage/`

Directory structure after coverage run:

```
coverage/
├── lcov-report/          # HTML coverage report
│   └── index.html        # Open in browser for details
├── lcov.info             # LCOV format
└── coverage-final.json   # JSON format
```

### Improving Coverage

1. **Identify gaps**: Check coverage report for untested lines
2. **Add edge cases**: Test error conditions and edge cases
3. **Mock external calls**: Ensure all network/DB calls are mocked
4. **Test error flows**: Validate error handling paths

---

## Best Practices

### General Guidelines

#### 1. Test Naming Conventions

```javascript
// ✅ Good: Descriptive test names
it('should create a chat group and return 201 status', () => {});
it('should return error when title is missing', () => {});

// ❌ Avoid: Vague names
it('works correctly', () => {});
it('test function', () => {});
```

#### 2. Test Organization

```javascript
describe('ChatController', () => {
  describe('createChatGroup', () => {
    it('should create successfully', () => {});
    it('should validate input', () => {});
  });
});
```

#### 3. Mock Management

```javascript
// ✅ Good: Clear mock expectations
jest.mock('../../service/chat.service');
chatService.createChatGroup.mockResolvedValue(mockData);

// Handle cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

#### 4. Assertions Quality

```javascript
// ✅ Good: Specific assertions
expect(res.status).toHaveBeenCalledWith(201);
expect(res.json).toHaveBeenCalledWith({
  success: true,
  message: 'Created',
  data: expect.any(Object),
});

// ❌ Avoid: Generic assertions
expect(res).toBeDefined();
```

### Module-Specific Practices

#### Chat Module Best Practices

- Mock WebSocket connections in unit tests
- Test message ordering and pagination
- Verify group member visibility rules

#### Event Module Best Practices

- Test date/time validations thoroughly
- Validate capacity constraints
- Test volunteer registration edge cases

#### Meeting Module Best Practices

- Test timezone handling
- Verify conflict detection accuracy
- Validate participant notifications

#### Beach Module Best Practices

- Test geographic data validation
- Verify waste type associations
- Test status transition logic

#### Analytics Module Best Practices

- Test data aggregation accuracy
- Validate ML prediction integration
- Test report generation formats
- Verify carbon calculation correctness

#### Agent Module Best Practices

- Test permission scoping
- Validate performance metric accuracy
- Test beach assignment constraints

---

## Debugging Tests

### VS Code Integration

#### Run Single Test

1. Open test file in editor
2. Click "Run" above test name/describe block
3. View results in Test Explorer

#### Debug Test

1. Click "Debug" above test name/describe block
2. Debugger pauses at breakpoints
3. Use Variables panel to inspect state

### Terminal Debugging

```bash
# Debug single test with Inspector
node --inspect-brk node_modules/.bin/jest --runInBand chat.controller.test.js

# Then open chrome://inspect in Chrome
```

### Common Issues & Solutions

#### Issue: Tests Timeout

```javascript
// Solution: Increase timeout for specific test
it('should handle slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

#### Issue: Mock Not Working

```javascript
// Solution: Clear mocks before test
beforeEach(() => {
  jest.clearAllMocks();
  // Re-setup mocks if needed
});
```

#### Issue: Async/Await Issues

```javascript
// ✅ Good: Proper async handling
it('should fetch data', async () => {
  const result = await service.getData();
  expect(result).toBeDefined();
});

// ❌ Avoid: Forgetting return
it('should fetch data', () => {
  return service.getData().then((result) => {
    expect(result).toBeDefined();
  });
});
```

#### Issue: Database Connection in Tests

```javascript
// Ensure MongoDB Memory Server is used in integration tests
beforeAll(async () => {
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  // Connect to in-memory database
});

afterAll(async () => {
  await mongoServer.stop();
});
```

### Viewing Test Output

```bash
# Verbose output with all details
npm test -- --verbose

# Watch mode with file watchers
npm test -- --watch

# Show coverage summary
npm run test:coverage

# No output buffering (real-time)
npm test -- --no-coverage
```

---

## Test Maintenance

### Regular Tasks

#### Weekly

- [ ] Review test coverage reports
- [ ] Update tests for new features
- [ ] Fix flaky tests

#### Monthly

- [ ] Analyze test execution time
- [ ] Optimize slow tests
- [ ] Review mock data accuracy
- [ ] Update dependencies

#### Quarterly

- [ ] Test strategy review
- [ ] Coverage goal assessment
- [ ] Performance baseline update

### Adding New Tests

1. **Create test file** in appropriate directory (`unit/`, `integration/`, `performance/`)
2. **Follow naming convention**: `{module}.{layer}.test.js`
3. **Use existing patterns** from similar tests
4. **Update this documentation** with new test cases
5. **Run full suite** to ensure no regressions

---

## Resources

### Documentation Links

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

### Test File References

- [Chat Tests](src/tests/unit/chat.controller.test.js)
- [Event Tests](src/tests/unit/event.controller.test.js)
- [Beach Tests](src/tests/unit/beach.controller.test.js)
- [Analytics Tests](src/tests/unit/analytics.controller.test.js)
- [Agent Tests](src/tests/unit/agent.controller.test.js)
- [Meeting Tests](src/tests/unit/meeting.controller.test.js)

---

## Continuous Integration

### GitHub Actions / CI/CD

Tests automatically run on:

- [ ] Pull requests to `main` branch
- [ ] Commits to `dev` branch
- [ ] Release tags

### CI Test Requirements

```yaml
# Pseudo-config for CI/CD pipeline
- Run: npm run test:coverage
- Coverage threshold: 80%
- Fail if coverage drops
- Generate coverage reports
- Archive test results
```

---

## Support & Contributing

For questions or issues related to testing:

1. Check this documentation first
2. Review existing test files for examples
3. Consult Jest/Supertest documentation
4. Create issue in project repository

---

**Last Updated**: April 2024  
**Version**: 1.0.0  
**Maintainer**: EcoShore Development Team  
**Classification**: Public-SLIIT

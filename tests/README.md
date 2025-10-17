# Playwright Electron Tests

This directory contains Playwright tests for the SSH Remote Electron application.

## Test Structure

- `electron.spec.ts` - Main Electron application tests
- `setup.ts` - Test configuration and fixtures
- `fixtures/` - Test data and configuration files

## Running Tests

```bash
# Run all tests in headless mode
npm run test

# Run tests with visible browser window
npm run test:headed

# Run tests in debug mode
npm run test:debug

# View test report
npm run test:report

# Install/update Playwright browsers
npm run test:install
```

## Test Coverage

The current test suite covers:

- ✅ Application launch and window management
- ✅ UI component visibility (terminal, file manager, AI assistant)
- ✅ Basic interaction patterns
- ✅ Window resize handling
- ✅ Error handling scenarios
- ✅ Basic accessibility checks

## Adding New Tests

When adding new tests:

1. Use descriptive test names following the pattern "should [what the test verifies]"
2. Include proper waits for UI elements to load
3. Add assertions that verify expected behavior
4. Use data-testid attributes for reliable element selection
5. Follow the existing test structure and patterns

## Debugging Tips

- Use `npm run test:debug` to step through tests interactively
- Use `--headed` flag to see the actual application window
- Check `test-results/` directory for screenshots and videos
- Use the HTML report for detailed test results

## Configuration

Test configuration is in `playwright.config.ts`:

- Timeout: 30 seconds
- Screenshots: On failure only
- Videos: Retain on failure
- Output directory: `test-results/`
- HTML report: Generated after each run
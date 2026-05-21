// Global Jest environment — runs after jest env is installed, before any test file.
// Set all env vars that route handlers and Prisma need.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/shantelyur_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-minimum';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

// Silence expected console.error calls in tests
const originalError = console.error.bind(console);
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress noisy Next.js / Prisma known warnings in test output
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('ReactDOMTestUtils') || msg.includes('Warning:')) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

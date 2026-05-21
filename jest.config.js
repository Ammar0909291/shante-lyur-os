const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },

  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/properties/**/*.test.ts',
  ],

  collectCoverageFrom: [
    'src/domain/entities/specialist.entity.ts',
    'src/domain/entities/appointment.entity.ts',
    'src/app/api/specialists/route.ts',
    'src/app/api/specialists/[id]/route.ts',
    'src/app/api/admin/bookings/route.ts',
  ],

  coverageThreshold: {
    'src/domain/entities/specialist.entity.ts': {
      branches: 90, functions: 90, lines: 90, statements: 90,
    },
  },

  verbose: true,
  testTimeout: 10000,
};

module.exports = createJestConfig(config);

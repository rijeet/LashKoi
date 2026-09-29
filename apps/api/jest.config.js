module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@api/(.*)$': '<rootDir>/src/APP.API/$1',
    '^@bll/(.*)$': '<rootDir>/src/APP.BLL/$1',
    '^@infra/(.*)$': '<rootDir>/src/APP.Infrastructure/$1',
    '^@entity/(.*)$': '<rootDir>/src/APP.Entity/$1',
    '^@shared/(.*)$': '<rootDir>/src/APP.Shared/$1',
  },
};

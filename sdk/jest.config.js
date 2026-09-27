/**
 * The SDK suite runs fully offline: every test talks to a mock RPC server
 * bound to 127.0.0.1, so CI needs no external network access.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
};

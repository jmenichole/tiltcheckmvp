// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
  },
});

import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine; Recharts' ResponsiveContainer only needs the API to exist.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

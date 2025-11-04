// src/lib/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => console.error(...args), // Keep errors
  warn: (...args: any[]) => isDev && console.warn(...args),
  debug: (...args: any[]) => isDev && console.debug(...args),
};

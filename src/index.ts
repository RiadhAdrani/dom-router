/**
 * check if `url` is valid as a relative path
 */
export const isUrlNavigatable = (url: string): boolean => {
  return url.startsWith('/');
};

export { RouterInstance } from './class.js';

export * from './types.js';

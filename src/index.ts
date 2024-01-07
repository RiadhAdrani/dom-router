/**
 * check if `url` is valid as a relative path
 */
export const isUrlNavigatable = (url: string): boolean => {
  return url.startsWith('/');
};

export { Router, RouterType } from './class.js';

export type {
  RouterConfig,
  IndexRawRoute,
  CatchRawRoute,
  LayoutRawRoute,
  PathRawRoute,
  RawRoute,
  DestinationOptions,
  DestinationRequest,
  RelativeDestinationRequest,
  NamedDestinationRequest,
} from './class.js';

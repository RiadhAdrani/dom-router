import { RouterEngine } from './types.js';

export const getPath = (base?: string): string => {
  let path = location.pathname;

  if (base) {
    if (path.startsWith(base)) {
      path = path.replace(base, '');
    }
  }

  if (!path) {
    path = '/';
  }

  return path;
};

export const createHistoryArgs: RouterEngine['createHistoryArgs'] = (path: string) => {
  return [{ path }, '', path];
};

const browserRouter: RouterEngine = { getPath, createHistoryArgs };

export default browserRouter;

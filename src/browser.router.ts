import { RouterEngine } from './types.js';

export const getPath = (): string => {
  return location.pathname;
};

export const createHistoryArgs: RouterEngine['createHistoryArgs'] = (path: string) => {
  return [{ path }, '', path];
};

const browserRouter: RouterEngine = { getPath, createHistoryArgs };

export default browserRouter;

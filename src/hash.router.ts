import { RouterEngine } from 'types.js';

export const getPath: RouterEngine['getPath'] = () => {
  return location.hash.substring(1);
};

export const createHistoryArgs: RouterEngine['createHistoryArgs'] = (path: string) => {
  const { protocol, hostname, pathname } = location;

  const url = `${protocol}//${hostname}${pathname}/#${path}`;

  return [{ path }, '', url];
};

const hashRouter: RouterEngine = { getPath, createHistoryArgs };

export default hashRouter;

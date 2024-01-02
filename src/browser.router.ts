import { RouterEngine } from './class.js';

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

export const getQueryParams: RouterEngine['getQueryParams'] = () => {
  const search = location.search;

  const params = new URLSearchParams(search);

  const record = Array.from(params.entries()).reduce(
    (acc, it) => {
      acc[it[0]] = it[1];

      return acc;
    },
    {} as Record<string, string>,
  );

  return record;
};

const browserRouter: RouterEngine = { getPath, createHistoryArgs, getQueryParams };

export default browserRouter;

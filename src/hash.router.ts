import { RouterEngine } from './class.js';

/** create an url object with the given path.
 * do not include base in the path.
 */
export const constructUrlWithHashPath = (hashPath: string): URL => {
  const { protocol, hostname } = location;

  const href = `${protocol}//${hostname}${hashPath}`;

  return new URL(href);
};

export const getPath: RouterEngine['getPath'] = base => {
  let path = location.hash.substring(1);

  if (base) {
    if (path.startsWith(base)) {
      path = path.replace(base, '');
    }
  }

  if (!path) {
    path = '/';
  }

  const url = constructUrlWithHashPath(path);

  return url.pathname;
};

export const getQueryParams: RouterEngine['getQueryParams'] = () => {
  const path = constructUrlWithHashPath(location.hash.substring(1));

  const search = path.search;

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

export const createHistoryArgs: RouterEngine['createHistoryArgs'] = (path: string) => {
  const url = `/#${path}`;

  return [{ path: url }, '', url];
};

const hashRouter: RouterEngine = { getPath, createHistoryArgs, getQueryParams };

export default hashRouter;

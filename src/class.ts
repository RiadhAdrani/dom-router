import browserRouter from './browser.router.js';
import hashRouter from './hash.router.js';

export interface PathRawRoute<T = unknown> {
  path: string;
  name?: string;
  element?: T;
  title?: string;
  children?: Array<RawRoute<T>>;
}

export interface LayoutRawRoute<T = unknown> {
  element: T;
  children?: Array<RawRoute<T>>;
}

export interface IndexRawRoute<T = unknown> {
  path: '';
  name?: string;
  element?: T;
  title?: string;
}

export interface CatchRawRoute<T = unknown> {
  path: '*';
  title?: string;
  element?: T;
}

export type RawRoute<T = unknown> =
  | LayoutRawRoute<T>
  | IndexRawRoute<T>
  | CatchRawRoute<T>
  | PathRawRoute<T>;

export interface NamedDestinationRequest {
  name: string;
  query?: Record<string, string | number>;
  params?: Record<string, string>;
  hash?: string;
}

export type PathDestinationRequest = string;

export type RelativeDestinationRequest = number;

export type DestinationRequest =
  | NamedDestinationRequest
  | PathDestinationRequest
  | RelativeDestinationRequest;

export interface DestinationOptions {
  replace?: boolean;
}

export interface Route<T = unknown> {
  path: string;
  steps: Array<T | undefined>;
  params: Array<string>;
  name?: string;
  title?: string;
}

export interface ClosestRoute<T = unknown> {
  steps: Array<T | undefined>;
  params: Record<string, string>;
  route: Route<T> | undefined;
}

export const isLayoutRawRoute = <T>(raw: RawRoute<T>): raw is LayoutRawRoute<T> => {
  return !('path' in raw);
};

export const isIndexRawRoute = <T>(raw: RawRoute<T>): raw is IndexRawRoute<T> => {
  return 'path' in raw && raw.path === '';
};

export const isCatchRawRoute = <T>(raw: RawRoute<T>): raw is CatchRawRoute<T> => {
  return 'path' in raw && raw.path === '*';
};

export const joinPaths = (p1: string, p2: string): string => {
  if (p1.endsWith('/') && p2.startsWith('/')) {
    return `${p1}${p2.substring(1)}`;
  } else if (!p1.endsWith('/') && !p2.startsWith('/')) {
    return `${p1}/${p2}`;
  }

  return `${p1}${p2}`;
};

export const flattenRoutes = <T = unknown>(
  routes: Array<RawRoute<T>>,
  prevPath: string = '',
  prevSteps: Array<T | undefined> = [],
  prevParams: Array<string> = [],
): Record<string, Route<T>> => {
  return routes.reduce(
    (acc, it) => {
      if (isIndexRawRoute<T>(it)) return acc;

      if (isLayoutRawRoute<T>(it)) {
        const steps = [...prevSteps, it.element];

        if (it.children) {
          const record = flattenRoutes<T>(it.children, prevPath, steps, prevParams);

          return { ...acc, ...record };
        }

        return acc;
      }

      const path = joinPaths(prevPath, it.path);

      // ignore index route
      if (isCatchRawRoute<T>(it)) {
        const route: Route<T> = {
          params: prevParams,
          path,
          steps: [...prevSteps],
        };

        route.steps.push(it.element);

        acc[path] = route;

        return acc;
      }

      // ts -_-
      const raw = it as PathRawRoute<T>;

      // path route
      const steps = [...prevSteps, raw.element];

      // check for params
      const params = [
        ...prevParams,
        ...raw.path.split('/').reduce((acc, it) => {
          if (it.startsWith(':')) {
            acc.push(it.substring(1));
          }

          return acc;
        }, [] as Array<string>),
      ];

      const route: Route<T> = {
        params,
        path,
        steps,
        name: raw.name,
      };

      if (raw.children) {
        const children = flattenRoutes(
          raw.children,
          route.path,
          [...route.steps],
          [...route.params],
        );

        acc = { ...acc, ...children };

        // check if we have an index
        const index = raw.children.find(it => isIndexRawRoute<T>(it)) as IndexRawRoute<T>;

        if (index) {
          route.steps.push(index.element);

          route.name = index.name ?? route.name;
          route.title = index.title ?? route.title;
        }
      }

      acc[path] = route;

      return acc;
    },
    {} as Record<string, Route<T>>,
  );
};

export interface Cache<T = unknown> {
  url: string;
  processed: Record<string, ClosestRoute<T>>;
  steps: Array<T | undefined>;
  params: Record<string, string | undefined>;
}

export enum RouterType {
  Browser = 'browser',
  Hash = 'hash',
}

export interface RouterConfig<T = unknown> {
  routes: Array<RawRoute<T>>;
  onChanged: () => void;
  type?: RouterType;
  base?: string;
  correctScrolling?: boolean;
  transformTitle?: (title?: string) => string;
}

export type HistoryArguments = [{ path: string }, string, string];

export interface RouterEngine {
  getPath: (base?: string) => string;
  getQueryParams: () => Record<string, string>;
  createHistoryArgs: (path: string, base?: string) => HistoryArguments;
}

export const findClosestRoute = <T = unknown>(
  path: string,
  routes: Record<string, Route<T>>,
): ClosestRoute<T> => {
  // find the exact match
  const exact = routes[path];

  const segments = path.split('/');

  if (exact) {
    const params = segments.reduce(
      (acc, it) => {
        if (it.startsWith(':')) {
          const key = it.substring(1);

          acc[key] = it;
        }

        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      steps: exact.steps,
      params,
      route: exact,
    };
  }

  let lastMatch: string = '/';
  let route: Route<T> | undefined;
  let steps: Array<T | undefined> = [];

  // process segments
  for (let i = 0; i < segments.length; i++) {
    // first match exact match
    const path = joinPaths(lastMatch, segments[i]);
    const exactRoute = routes[path];

    if (exactRoute) {
      lastMatch = path;
      route = routes[lastMatch];
      steps = [...route.steps];
      continue;
    }

    // find first dynamic route
    const dyn = joinPaths(lastMatch, '/:');
    // can match longest routes ?
    const dynPath = Object.keys(routes)
      .filter(it => it.startsWith(dyn))
      .sort()[0];
    if (dynPath) {
      lastMatch = dynPath;
      route = routes[lastMatch];
      steps = [...route.steps];
      continue;
    }

    // we didn't find anything, find local catch or root
    const ctch = joinPaths(lastMatch, '/*');
    const ctchPath = routes[ctch];

    if (ctchPath) {
      lastMatch = ctch;
      route = routes[lastMatch];
      steps = [...route.steps];
    } else {
      // check catch all route
      const all = routes['/*'];

      // push the last step, which is the last element that will render
      steps.push(all?.steps.at(-1));
    }
    break;
  }

  const params = lastMatch.split('/').reduce(
    (acc, it, index) => {
      if (it.startsWith(':')) {
        const key = it.substring(1);
        const value = segments[index];

        acc[key] = value;
      }

      return acc;
    },
    {} as Record<string, string>,
  );

  return { steps, params, route };
};

export const createPathFromNamedDestination = <T = unknown>(
  destination: NamedDestinationRequest,
  routes: Record<string, Route<T>>,
  base?: string,
): string | undefined => {
  const { name, params } = destination;

  const key = Object.keys(routes).find(it => routes[it].name === name);

  if (!key) return;

  const route = routes[key];

  if (!route) return;

  let path = route.path
    .split('/')
    .map(it => {
      if (it.startsWith(':')) {
        const key = it.substring(1);

        return params ? params[key] : undefined;
      }

      return it;
    })
    .join('/');

  // add query
  if (destination.query) {
    const record = destination.query;

    const query = Object.keys(record)
      .map(key => `${key}=${record[key]}`)
      .join('&');

    path = `${path}?${query}`;
  }

  // add hash
  if (destination.hash) {
    path = `${path}#${destination.hash}`;
  }

  if (base) {
    path = `${base}${path}`;
  }

  return path;
};

export class RouterError extends Error {
  constructor(err: string) {
    super(`[DOM Router]: ${err}`);
  }
}

export class Router<T = unknown> {
  routes: Record<string, Route<T>> = {};
  cache: Cache<T> = {
    params: {},
    processed: {},
    steps: [],
    url: '',
  };

  base?: string;
  correctScrolling: boolean;
  type: RouterType;

  onChanged: () => void;
  listener: () => void;
  transformTitle: RouterConfig['transformTitle'];

  constructor(config: RouterConfig<T>) {
    const { onChanged, routes, base, correctScrolling, transformTitle, type } = config;

    if (typeof base === 'string') {
      if (!base.startsWith('/')) {
        throw new RouterError(`invalid base "${base}" : should start with "/"`);
      }

      this.base = base;
    }

    this.correctScrolling = correctScrolling ?? false;
    this.type = type ?? RouterType.Browser;

    this.onChanged = onChanged;
    this.transformTitle = transformTitle ?? ((t?: string) => t ?? '');
    this.routes = flattenRoutes(routes);

    this.listener = () => {
      const ex = this.processPath();

      if (ex) {
        this.onChanged();
      }
    };

    window.addEventListener('popstate', this.listener);

    this.processPath();
  }

  get engine(): RouterEngine {
    return this.type === RouterType.Browser ? browserRouter : hashRouter;
  }

  unload() {
    window.removeEventListener('popstate', this.listener);
  }

  processPath(): boolean {
    // check if something changed in the url
    const newURL = location.href;

    if (newURL === this.cache.url) {
      // same url, do nothing
      return false;
    }

    const path = this.engine.getPath(this.base);

    const cached = this.cache.processed[path];

    const target = cached ?? findClosestRoute(path, this.routes);

    if (!cached) {
      this.cache.processed[path] = target;
    }

    this.cache.params = target.params;
    this.cache.url = newURL;
    this.cache.steps = target.steps;

    if (target.route?.title) {
      document.title = this.transformTitle?.(target.route?.title) ?? document.title;
    }

    if (this.correctScrolling) {
      window.scrollTo({ top: 0 });
    }

    return true;
  }

  navigate(destination: DestinationRequest, options?: DestinationOptions) {
    if (typeof destination === 'number') {
      // relative navigation, will ignore options.replace
      history.go(destination);
    } else {
      let path: string;

      if (typeof destination === 'string') {
        path = destination;
      } else {
        // named
        const generated = createPathFromNamedDestination(destination, this.routes, this.base);

        if (typeof generated !== 'string') {
          throw new RouterError(`named path "${destination.name}" is not found`);
        }

        path = generated;
      }

      if (this.base && !path.startsWith(this.base)) {
        path = `${this.base}${path}`;
      }

      const args = this.engine.createHistoryArgs(path);

      if (options?.replace) {
        // replace the current
        history.replaceState(...args);
      } else {
        // push a new entry
        history.pushState(...args);
      }
    }

    const ex = this.processPath();

    if (ex) {
      this.onChanged?.();
    }
  }

  getElementByDepth(depth: number): T | undefined {
    return this.cache.steps.at(depth);
  }

  getPath(): string {
    return this.engine.getPath(this.base);
  }

  getParams(): Record<string, string | undefined> {
    return this.cache.params;
  }

  getSearchParams(): Record<string, string> {
    return this.engine.getQueryParams();
  }

  toHref(destination: string | NamedDestinationRequest): string | undefined {
    let href: string | undefined;

    if (typeof destination === 'string') {
      href = destination;
    } else {
      href = createPathFromNamedDestination(destination, this.routes, this.base);
    }

    if (!href) return undefined;

    if (this.base && !href.startsWith(this.base)) {
      href = `${this.base}${href}`;
    }

    return href;
  }
}

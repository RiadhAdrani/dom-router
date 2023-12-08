import {
  CatchAllRawRoute,
  ClosestRoute,
  DestinationOptions,
  DestinationRequest,
  NamedDestinationRequest,
  Route,
  RouterCache,
  RouterConfig,
  RouterType,
} from './types.js';
import {
  cacheRoutes,
  createPathFromNamedDestination,
  err,
  isPathValid,
  matchClosestRoute,
  transformRawRoutes,
} from './utils.js';
import browserRouter from './browser.router.js';
import hashRouter from './hash.router.js';

export class RouterInstance<T = unknown> {
  routes: Array<Route<T>> = [];
  cache: RouterCache<T> = {
    params: {},
    processedPaths: {},
    routes: [],
    steps: [],
  };

  catcher: Route<T>;

  type: RouterType = RouterType.Browser;

  base?: string;
  correctScrolling?: boolean;
  transoformTitle?: (t: string) => string;
  onChanged?: () => void;
  onUnloaded?: () => void;

  listener: () => void;

  constructor(params: RouterConfig<T>) {
    const {
      catchAllElement,
      routes,
      base,
      correctScrolling,
      onChanged,
      onUnloaded,
      transformTitle,
      type,
    } = params;

    if (typeof base === 'string') {
      if (!isPathValid(base)) {
        throw new Error(err(`invalid base "${base}" : should start with "/"`));
      }

      this.base = base;
    }

    this.correctScrolling = correctScrolling;
    this.transoformTitle = transformTitle;
    this.onChanged = onChanged;
    this.onUnloaded = onUnloaded;
    this.type = type ?? RouterType.Browser;

    this.routes = transformRawRoutes<T>(routes);

    this.cache = { routes: cacheRoutes(this.routes), processedPaths: {}, params: {}, steps: [] };

    // check for root directory
    const rootExists = this.cache.routes.find(route => route.fullPath === '/');
    if (!rootExists) {
      // throw
      throw new Error(err('no root route found'));
    }

    // check for catch all and add it
    let catcher: Route<T> | undefined = this.cache.routes.find(route => route.fullPath === '/**');
    if (!catcher) {
      const catchAll: CatchAllRawRoute<T> = { path: '**', element: catchAllElement };

      const transformed = transformRawRoutes<T>([catchAll]);

      catcher = transformed[0];

      const cached = cacheRoutes(transformed);

      this.routes.push(...transformed);
      this.cache.routes.push(...cached);
    }

    this.catcher = catcher;

    // add popstate event listener
    this.listener = () => {
      this.processPath();

      // call on change
      this.onChanged?.();
    };

    window.addEventListener('popstate', this.listener);

    this.processPath();
  }

  unload() {
    window.removeEventListener('popstate', this.listener);

    this.onUnloaded?.();
  }

  get engine() {
    return this.type === RouterType.Browser ? browserRouter : hashRouter;
  }

  processPath() {
    let path = this.engine.getPath(this.base);

    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const cached = this.cache.processedPaths[path];

    const target: ClosestRoute<T> =
      cached ?? matchClosestRoute<T>(path, this.cache.routes, this.catcher);

    this.updateCache(path, target);

    const { route } = target;

    // update title
    if (route.title) {
      const newTitle = this.transoformTitle?.(route.title) ?? route.title;

      if (newTitle) {
        document.title = newTitle;
      }
    }

    // scroll correction
    if (this.correctScrolling) {
      window.scrollTo({ top: 0 });
    }
  }

  navigate(destination: DestinationRequest, options?: DestinationOptions) {
    if (typeof destination === 'number') {
      // relative navigation, will ignore options.replace
      history.go(destination);
      return;
    }

    let path: string;

    if (typeof destination === 'string') {
      path = destination;
    } else {
      // named
      const generated = createPathFromNamedDestination(destination, this.cache.routes);

      if (typeof generated !== 'string') {
        throw new Error(err(`named path "${destination.name}" is not found`));
      }

      path = generated;
    }

    if (this.base) {
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

    this.processPath();
    this.onChanged?.();
  }

  updateCache(path: string, data: ClosestRoute<T>) {
    const { params, route, steps } = data;

    this.cache.params = params;
    this.cache.currentRoute = route;
    this.cache.steps = steps;

    this.cache.processedPaths[path] ??= data;
  }

  getElementByDepth(depth: number): T | undefined {
    return this.cache.steps[depth]?.element;
  }

  getPath(): string {
    return this.engine.getPath(this.base);
  }

  getParams(): Record<string, string> {
    return this.cache.params;
  }

  getSearchParams(): Record<string, string> {
    return this.engine.getQueryParams();
  }

  createPathFromNamedDestination(destination: NamedDestinationRequest): string | undefined {
    return createPathFromNamedDestination(destination, this.cache.routes);
  }
}

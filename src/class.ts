import {
  CatchAllRawRoute,
  DestinationOptions,
  DestinationRequest,
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
  private routes: Array<Route<T>> = [];
  private cache: RouterCache<T> = {
    params: {},
    processedPaths: {},
    routes: [],
    steps: [],
  };

  private catcher: Route<T>;

  private type: RouterType = RouterType.Browser;

  private base?: string;
  private correctScrolling?: boolean;
  private transoformTitle?: (t: string) => string;
  private onChanged?: () => void;
  private onUnloaded?: () => void;

  private listener: () => void;

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

  engine() {
    return this.type === RouterType.Browser ? browserRouter : hashRouter;
  }

  processPath() {
    const path = this.engine().getPath(this.base);

    // check if path already handled
    const already = this.cache.processedPaths[path];

    if (already) {
      this.cache.currentRoute = already;
      return;
    }

    const closest = matchClosestRoute<T>(path, this.cache.routes, this.catcher);

    const { params, route, steps } = closest;

    this.cache.params = params;
    this.cache.steps = steps;
    this.cache.currentRoute = route;

    // update title
    if (route.title) {
      const newTitle = this.transoformTitle?.(route.title);

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
        throw new Error(`named path "${destination.name}" is not found`);
      }

      path = generated;
    }

    if (this.base) {
      path = `${this.base}${path}`;
    }

    const args = this.engine().createHistoryArgs(path);

    if (options?.replace) {
      // replace the current
      history.replaceState(...args);
    } else {
      // push a new entry
      history.pushState(...args);
    }
  }

  getElementByDepth(depth: number): T | undefined {
    return this.cache.steps[depth].element;
  }

  getParams(): Record<string, string> {
    return this.cache.params;
  }

  getSearchParams(): Record<string, string> {
    // TODO:
    return {};
  }
}

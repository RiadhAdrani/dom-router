import browserRouter from './browser.router.js';
import hashRouter from './hash.router.js';
import {
  CatchAllRawRoute,
  DestinationOptions,
  DestinationRequest,
  RouterCache,
  RouterConfig,
  RouterEngine,
  RouterObject,
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

/**
 * store the singleton
 */
let router: RouterObject | undefined;

export const useRouter = (): RouterObject => {
  if (!router) {
    throw new Error(err('unable to use router, it is not created yet'));
  }

  return router;
};

export const useEngine = (): RouterEngine => {
  if (!router) {
    throw new Error(err('unable to get engine, router is not created'));
  }

  return router.type === RouterType.Hash ? hashRouter : browserRouter;
};

export const createRouter = <T = unknown>(config: RouterConfig<T>) => {
  if (router) {
    throw new Error(
      err('a router is already defined, please unmount the old one before creating a new one'),
    );
  }

  const {
    routes,
    base,
    correctScrolling,
    transformTitle,
    type,
    onUnloaded,
    onChanged,
    catchAllElement,
  } = config;
  // prepare a new router
  const newRouter: RouterObject = {
    unload() {},
    onChanged() {},
    catchAllElement,
    type: type ?? RouterType.Browser,
    routes: [],
    cache: {
      currentRoute: undefined,
      routes: [],
      processedPaths: {},
      params: {},
      steps: [],
    },
  };

  // check the base is valid
  if (typeof base === 'string') {
    if (!isPathValid(base)) {
      throw new Error(err(`invalid base "${base}" : should start with "/"`));
    }

    newRouter.base = base;
  }

  if (typeof correctScrolling === 'boolean') {
    newRouter.correctScrolling = correctScrolling;
  }

  if (typeof transformTitle === 'function') {
    newRouter.transformTitle = transformTitle;
  }

  if (typeof transformTitle === 'function') {
    newRouter.transformTitle = transformTitle;
  }

  if (typeof onUnloaded === 'function') {
    newRouter.onUnloaded = onUnloaded;
  }

  if (typeof onChanged === 'function') {
    newRouter.onChanged = onChanged;
  }

  // process routes
  const transformed = transformRawRoutes(routes);

  newRouter.routes = transformed;

  const cache: RouterCache = {
    processedPaths: {},
    routes: cacheRoutes(transformed),
    params: {},
    steps: [],
  };

  newRouter.cache = cache;

  // check for root directory
  const rootExists = cache.routes.find(route => route.fullPath === '/');
  if (!rootExists) {
    // throw
    throw new Error('no root route found');
  }

  // check for catch all and add it
  const catcher = cache.routes.find(route => route.fullPath === '/**');
  if (!catcher) {
    const catchAll: CatchAllRawRoute = { path: '**', element: catchAllElement };

    const transformed = transformRawRoutes([catchAll]);

    const cached = cacheRoutes(transformed);

    newRouter.routes.push(...transformed);
    newRouter.cache.routes.push(...cached);
  }

  // add popstate event listener
  const listener = () => {
    const path = useEngine().getPath();

    const router = useRouter();

    processPath(path);

    // call on change
    router.onChanged?.();
  };

  window.addEventListener('popstate', listener);

  // create unload function
  newRouter.unload = () => {
    window.removeEventListener('popstate', listener);

    useRouter().onUnloaded?.();

    // reset router
    router = undefined;
  };

  router = newRouter;

  processPath(useEngine().getPath());
};

export const processPath = (path: string) => {
  const router = useRouter();

  // check if path already handled
  const already = router.cache.processedPaths[path];

  if (already) {
    router.cache.currentRoute = already;
    return;
  }

  const closest = matchClosestRoute(path, router.cache.routes);

  const { params, route, steps } = closest;

  router.cache.params = params;
  router.cache.steps = steps;
  router.cache.currentRoute = route;
};

export const navigate = (destination: DestinationRequest, options?: DestinationOptions) => {
  if (!router) {
    throw new Error(err('cannot "navigate" without creating a router'));
  }
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
    const generated = createPathFromNamedDestination(destination, router.cache.routes);

    if (typeof generated !== 'string') {
      throw new Error(`named path "${destination.name}" is not found`);
    }

    path = generated;
  }

  if (router.base) {
    path = `${router.base}${path}`;
  }

  const args = useEngine().createHistoryArgs(path);

  if (options?.replace) {
    // replace the current
    history.replaceState(...args);
  } else {
    // push a new entry
    history.pushState(...args);
  }
};

export const getParams = (): Record<string, string> => {
  return useRouter().cache.params;
};

export const getSearchParams = (): Record<string, string> => {
  // TODO:
  return {};
};

export const isPathWithin = (): boolean => {
  // TODO:
  return false;
};

export const onStateChanged = () => {};

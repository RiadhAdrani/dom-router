import browserRouter from './browser.router.js';
import hashRouter from './hash.router.js';
import {
  DestinationOptions,
  DestinationRequest,
  Route,
  RouteType,
  RouterCache,
  RouterConfig,
  RouterEngine,
  RouterObject,
  RouterType,
} from './types.js';
import { createPathFromNamedDestination, err, isPathValid, transformRawRoutes } from './utils.js';

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
      err('a router is already defined, please unmount the old one before create a new one'),
    );
  }

  const { routes, base, correctScrolling, transformTitle, type, onUnloaded, onChanged } = config;
  // prepare a new router
  const newRouter: RouterObject = {
    unload() {},
    onChanged() {},
    type: type ?? RouterType.Browser,
    routes: [],
    cache: {
      catchRoute: undefined,
      sequence: [],
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
  newRouter.routes = transformRawRoutes(routes);

  // check for root directory
  const rootExists = newRouter.routes.find(route => route.path === '/');
  if (!rootExists) {
    //
  }

  // add popstate event listener
  const listener = () => {
    const path = useEngine().getPath();

    useRouter().cache = processPath(path);

    // call on change
    newRouter.onChanged?.();
  };

  window.addEventListener('popstate', listener);

  // create unload function
  newRouter.unload = () => {
    window.removeEventListener('popstate', listener);

    // reset router
    router = undefined;

    newRouter.onUnloaded?.();
  };

  router = newRouter;

  useRouter().cache = processPath(useEngine().getPath());
};

export const matchPath = (segmentsSlice: Array<string>, route: Route): boolean => {
  if (segmentsSlice.length !== route.segments.length) {
    return false;
  }

  return segmentsSlice.every((seg, index) => {
    const s = route.segments[index];

    return s.value === seg || s.isParam;
  });
};

export const matchPathInWrapper = (
  slices: Array<string>,
  wrapper: Route,
): Array<Route> | undefined => {
  if (wrapper.type !== RouteType.Wrapper) return;

  const sequence = [wrapper];

  // find a route matching the slice
  const route = wrapper.children.find(it => {
    it.type === RouteType.Path && matchPath(slices, it);
  });

  if (route) {
    return [...sequence, route];
  }

  const nestedSequence = wrapper.children.reduce(
    (acc, child) => {
      if (acc || child.type !== RouteType.Wrapper) return acc;

      const seq = matchPathInWrapper(slices, child);

      return seq;
    },
    undefined as Array<Route> | undefined,
  );

  if (nestedSequence) {
    return [...sequence, ...nestedSequence];
  }

  return undefined;
};

export const processPath = (path: string): RouterCache => {
  const cache: RouterCache = { catchRoute: undefined, sequence: [] };

  const segments = path.split('/');

  const sequence: Array<Route> = [];

  let routes: Array<Route> = useRouter().routes;

  for (let i = 0; i < segments.length; i++) {
    // ? find the appropriate path

    let route: Route | undefined;
    // first, we try to find the route matching the rest or a portion of the segments
    // we can have a route with multiple segments like : "/user/options/about"
    let sliceTo = segments.length;

    while (sliceTo > 1) {
      const slice = segments.slice(i, sliceTo);

      // ! we can have a composed route with params that matches
      route = routes.find(it => matchPath(slice, it));

      // try to find the sequence in a wrapper
      if (!route) {
        for (const wrapper of routes) {
          const nested = matchPathInWrapper(slice, wrapper);

          if (nested) {
            route = nested.at(-1);

            break;
          }
        }
      }

      if (route) {
        // skip i to "sliceTo"
        i = sliceTo - 1;
        break;
      }

      sliceTo--;
    }

    if (route) {
      cache.catchRoute =
        routes.find(it => it.type === RouteType.Catch) ??
        routes.find(it => it.type === RouteType.CatchAll);

      routes = route.children;
      sequence.push(route);

      continue;
    }

    // no route is matched, just break
    break;
  }

  return cache;
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
    const generated = createPathFromNamedDestination(destination, router.routes);

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
  // TODO:
  return {};
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

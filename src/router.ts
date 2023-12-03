import browserRouter from 'browser.router.js';
import hashRouter from 'hash.router.js';
import {
  DestinationOptions,
  DestinationRequest,
  RouterConfig,
  RouterEngine,
  RouterObject,
  RouterType,
} from 'types.js';
import { createPathFromNamedDestination, err, isPathValid, transformRawRoutes } from 'utils.js';

/**
 * store the singleton
 */
let router: RouterObject | undefined;

export const useEngine = (): RouterEngine => {
  if (!router) {
    throw new Error(err('unable to get engine, router is not loaded'));
  }

  return router.type === RouterType.Hash ? hashRouter : browserRouter;
};

export const createRouter = <T = unknown>(config: RouterConfig<T>) => {
  if (router) {
    throw new Error(
      err('a router is already defined, please unmount the old one before create a new one'),
    );
  }

  const {
    routes,
    base,
    correctScrolling,
    transformTitle,
    type,
    onUnloaded: onUnmounted,
    onChanged,
  } = config;
  // prepare a new router
  const newRouter: RouterObject = {
    unload() {},
    onChanged() {},
    type: type ?? RouterType.Browser,
    routes: [],
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

  if (typeof onUnmounted === 'function') {
    newRouter.onUnloaded = onUnmounted;
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
    // depending on the router we perform the action

    // TODO: cache informations related to the new path

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

import {
  BaseRoute,
  CachedRoute,
  ClosestRoute,
  NamedDestinationRequest,
  PathRoute,
  RawRoute,
  Route,
  RouteType,
  RouteWithParentRef,
  Segment,
} from './types.js';

export const err = (msg: string): string => `[Dom-Router]: ${msg}`;

export const isPathValid = (path: string): boolean => {
  // should start with a "/"

  return path.startsWith('/');
};

export const deriveRawRouteType = (route: RawRoute): RouteType => {
  // if there is no path, this is surely a wrapper route
  if (typeof route.path !== 'string') {
    return RouteType.Wrapper;
  }

  // if path is equal to "*" it is a local catch route
  if (route.path === '*') {
    return RouteType.Catch;
  }

  // if path is equal to "*" it is a catch all within route
  if (route.path === '**') {
    return RouteType.CatchAll;
  }

  if (route.path && isPathValid(route.path)) {
    return RouteType.Path;
  }

  throw new Error(err('unable to derive route type'));
};

export const segmentisePath = (path: string): Array<Segment> => {
  return path.split('/').map(value => ({ value, isParam: value.startsWith(':') }));
};

export const transformRawRoutes = <T>(rawRoutes: Array<RawRoute<T>>): Array<Route<T>> => {
  const routes: Array<Route> = rawRoutes.map(raw => {
    // we need to know the type of the route
    const type = deriveRawRouteType(raw);

    const base: BaseRoute = { children: [], params: [], segments: [] };

    const route = { ...base, ...raw, type } as Route;

    if (type === RouteType.Path) {
      const $route = route as unknown as PathRoute;

      const path = route.path as string;

      // check for multiple segments
      $route.segments = segmentisePath(path);

      // check for params
      $route.params = $route.segments.reduce((acc, seg) => {
        if (seg.isParam) acc.push(seg.value.substring(1));

        return acc;
      }, [] as Array<string>);
    }

    // children
    route.children = transformRawRoutes(raw?.children ?? []);

    return route;
  });

  return routes as Array<Route<T>>;
};

export const createPathFromNamedDestination = (
  destination: NamedDestinationRequest,
  routes: Array<CachedRoute>,
  base?: string,
): string | undefined => {
  const { name, params } = destination;

  const route = routes.find(it => it.name === name);

  if (!route) return;

  let path = route.steps.reduce((acc, el) => {
    const url = el.segments
      .map(it => {
        if (it.isParam) {
          // replace with param
          return params ? `${params[it.value.substring(1)]}` : 'undefined';
        }

        return it.value;
      })
      .join('/');

    return acc + url;
  }, '');

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

export const cacheRoutes = <T = unknown>(
  routes: Array<Route<T>>,
  previousSteps: Array<Route<T>> = [],
  parent?: RouteWithParentRef,
): Array<CachedRoute<T>> => {
  const cached: Array<CachedRoute> = [];

  routes.forEach(route => {
    const steps = [...previousSteps, route];

    if (route.type !== RouteType.Wrapper) {
      const data: Pick<CachedRoute, 'fullParams' | 'fullPath'> = { fullParams: [], fullPath: '' };

      steps.forEach(
        it => {
          const url = [RouteType.Catch, RouteType.CatchAll].includes(it.type)
            ? `/${it.path}`
            : it.segments.map(it => it.value).join('/');

          data.fullPath = `${data.fullPath}${url}`;
          data.fullParams.push(...it.params);
        },
        { fullPath: '', allParams: [] },
      );

      const cachedRoute: CachedRoute = { ...route, ...data, steps, parent };

      cached.push(cachedRoute);
    }

    const asParent: RouteWithParentRef = { ...route, parent };

    const childrenCache = cacheRoutes(route.children, steps, asParent);

    cached.push(...childrenCache);
  });

  return cached as Array<CachedRoute<T>>;
};

export const findAppropriateCatchRoute = (
  route: RouteWithParentRef,
  local = false,
): Route | undefined => {
  if (local) {
    const localCatcher = route.children.find(it => it.type === RouteType.Catch);

    if (localCatcher) return localCatcher;
  }

  // find local catch all
  const all = route.children.find(it => it.type === RouteType.CatchAll);

  if (all) return all;

  if (!route.parent) {
    return undefined;
  }

  // check parent
  return findAppropriateCatchRoute(route.parent);
};

export const matchClosestRoute = <T>(
  path: string,
  routes: Array<CachedRoute<T>>,
  rootCatcher: Route<T>,
): ClosestRoute<T> => {
  // try and match route exactly
  const exact = routes.find(it => it.fullPath === path);

  if (exact) {
    const params = exact.fullPath.split('/').reduce(
      (acc, seg) => {
        if (seg.startsWith(':')) {
          const key = seg.substring(1);

          acc[key] = seg;
        }

        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      params,
      route: exact,
      steps: exact.steps,
    };
  }

  const pathSegments = path.split('/');

  let matchingRoutes: Array<CachedRoute> = routes;

  for (let i = 0; i < pathSegments.length; i++) {
    // first, check for exact matches
    let filtered = matchingRoutes.filter(it => {
      const routeSegments = it.fullPath.split('/');

      const segment = routeSegments[i];

      return segment === pathSegments[i];
    });

    if (filtered.length === 0) {
      // check dynamic routes
      filtered = matchingRoutes.filter(it => {
        const routeSegments = it.fullPath.split('/');

        const segment = routeSegments[i];

        return segment && segment.startsWith(':');
      });
    }

    if (filtered.length === 0) break;

    matchingRoutes = filtered;
  }

  // get the shortest
  const match = matchingRoutes.sort((a, b) => a.steps.length - b.steps.length)[0];

  if (match) {
    const routeSegments = match.fullPath.split('/');

    const params: ClosestRoute['params'] = {};

    routeSegments.forEach((it, index) => {
      if (!it.startsWith(':')) return;

      const value = pathSegments[index];

      params[it.substring(1)] = value;
    });

    const steps = match.steps;

    if (routeSegments.length < pathSegments.length) {
      let catcher: Route | undefined;

      if (match.parent) {
        catcher = findAppropriateCatchRoute(match, true);
      }

      catcher ??= rootCatcher;

      steps.push(catcher);
    }

    return { params, route: match, steps } as ClosestRoute<T>;
  }

  // nothing close found, try and match the catch all route
  const catchAll = routes.find(it => it.fullPath === '/**');

  if (catchAll) {
    return { params: {}, route: catchAll, steps: catchAll.steps };
  }

  throw new Error(
    err('missing catch all-route : Your application should implement a root catch all route'),
  );
};

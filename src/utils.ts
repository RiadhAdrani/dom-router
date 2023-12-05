import {
  BaseRoute,
  CachedRoute,
  NamedDestinationRequest,
  PathRoute,
  RawRoute,
  Route,
  RouteType,
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
  if (path === '/') {
    return [{ value: '', isParam: false }];
  }

  return path.split('/').map(value => ({ value, isParam: value.startsWith(':') }));
};

export const transformRawRoutes = <T>(rawRoutes: Array<RawRoute<T>>): Array<Route> => {
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

  return routes;
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

export const cacheRoutes = (
  routes: Array<Route>,
  previousSteps: Array<Route> = [],
  previouisCatchAllRoute?: Route,
): Array<CachedRoute> => {
  const cached: Array<CachedRoute> = [];

  const catchAllRoute = routes.find(it => it.type === RouteType.CatchAll) ?? previouisCatchAllRoute;

  const catchRoute = routes.find(it => it.type === RouteType.Catch) ?? catchAllRoute;

  previouisCatchAllRoute;

  routes.forEach(route => {
    const steps = [...previousSteps, route];

    if (route.type !== RouteType.Wrapper) {
      const cachedRoute: CachedRoute = { ...route, steps, catchRoute };

      cached.push(cachedRoute);
    }

    const childrenCache = cacheRoutes(route.children, steps, catchAllRoute);

    cached.push(...childrenCache);
  });

  return cached;
};

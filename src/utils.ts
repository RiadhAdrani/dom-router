import { NamedDestinationRequest, PathRoute, RawRoute, Route, RouteType, Segment } from 'types.js';

export const err = (msg: string): string => `[Dom-Router]: ${msg}`;

export const isPathValid = (base: string): boolean => {
  // should start with a "/"

  return base.startsWith('/');
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

  return RouteType.Path;
};

export const segmentisePath = (path: string): Array<Segment> => {
  return path.split('/').map(value => ({ value, isParam: value.startsWith(':') }));
};

export const transformRawRoutes = <T>(rawRoutes: Array<RawRoute<T>>): Array<Route> => {
  const routes: Array<Route> = rawRoutes.map(raw => {
    // we need to know the type of the route
    const type = deriveRawRouteType(raw);

    const route = { ...raw, type } as unknown as Route;
    route.children = [];

    // TODO: we need stricter checks for each type
    if (type === RouteType.Path) {
      const $route = route as unknown as PathRoute;

      const path = route.path as string;

      // check if path starts with '/'
      if (!isPathValid(path)) {
        throw new Error(err(`invalid route path "${path}" : should start with "/"`));
      }

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

export const findNamedRoute = (name: string, routes: Array<Route>): Route | undefined => {
  for (const route of routes) {
    // match name
    if (route.name === name) {
      return route;
    }

    // search in children
    const res = findNamedRoute(name, route.children);

    if (res) return res;
  }

  return undefined;
};

export const createPathFromNamedDestination = (
  destination: NamedDestinationRequest,
  routes: Array<Route>,
  prevPath = '',
): string | undefined => {
  let path: string | undefined;

  // find the named path
  for (const route of routes) {
    if (route.name === destination.name) {
      // found it
      path = `${prevPath}${path}`;
    }

    // search in children
    path = createPathFromNamedDestination({ name: destination.name }, route.children, route.path);
  }

  if (!path) return;

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

  return path;
};

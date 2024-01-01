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

export enum RouteType {
  Catch = 'catch',
  Path = 'path',
  Index = 'index',
  Layout = 'layout',
}

export interface Route<T = unknown> {
  path: string;
  steps: Array<T | undefined>;
  params: Array<string>;
  name?: string;
  title?: string;
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

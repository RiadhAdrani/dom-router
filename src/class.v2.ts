export interface PathRawRoute<T = unknown> {
  path: string;
  name?: string;
  element?: T;
  title?: string;
  children?: Array<RawRoute<T>>;
}

export interface WrapperRawRoute<T = unknown> {
  element: T;
  children?: Array<RawRoute<T>>;
}

export type LayoutRawRoute<T = unknown> = PathRawRoute<T> | WrapperRawRoute<T>;

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

export type RawRoute<T = unknown> = LayoutRawRoute<T> | IndexRawRoute<T> | CatchRawRoute<T>;

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
  steps: Array<T>;
  params: Array<string>;
  name?: string;
}

export const isLayoutRawRoute = (raw: RawRoute): raw is LayoutRawRoute => {
  return 'path' in raw === false;
};

export const isIndexRawRoute = (raw: RawRoute): raw is IndexRawRoute => {
  return 'path' in raw && raw.path === '';
};

export const isCatchRawRoute = (raw: RawRoute): raw is CatchRawRoute => {
  return 'path' in raw && raw.path === '*';
};

export const joinPaths = (p1: string, p2: string): string => {
  if (p1.endsWith('/') && p2.startsWith('/')) {
    return `${p1}${p1.substring(1)}`;
  }

  return `${p1}${p2}`;
};

export const flattenRoutes = <T = unknown>(
  routes: Array<RawRoute<T>>,
  prevPath: string = '',
  prevSteps: Array<T> = [],
  prevParams: Array<string> = [],
): Record<string, Route<T>> => {
  return routes.reduce(
    (acc, it) => {
      if (isCatchRawRoute(it)) {
        const path = joinPaths(prevPath, it.path);

        const route: Route<T> = {
          params: prevParams,
          path: joinPaths(path, it.path),
          steps: [...prevSteps],
        };

        if (it.element) {
          route.steps.push(it.element);
        }

        acc[path] = route;

        return acc;
      }

      if (isLayoutRawRoute(it)) {
        const steps = [...prevSteps, it.element];

        if (it.children) {
          const record = flattenRoutes(it.children, prevPath);
        }
      }

      return acc;
    },
    {} as Record<string, Route<T>>,
  );
};

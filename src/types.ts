export interface BaseRawRoute<T = unknown> {
  path: string;
  name: string;
  title: string;
  element: T;
  errorElement: T;
  redirectTo: string;
  children: Array<RawRoute>;
  onLoaded: () => void;
  onBeforeLoaded: () => void;
  onUnLoaded: () => void;
  onBeforeUnLoaded: () => void;
}

export type WrapperRawRoute<T = unknown> = Pick<BaseRawRoute<T>, 'element'> &
  Partial<Omit<BaseRawRoute<T>, 'element'>>;

export type PathRawRoute<T = unknown> = Pick<BaseRawRoute<T>, 'path'> &
  Partial<Omit<BaseRawRoute<T>, 'path'>>;

export type CatchRawRoute<T = unknown> = Partial<BaseRawRoute<T>> & { path: '*' };

export type CatchAllRawRoute<T = unknown> = Partial<BaseRawRoute<T>> & { path: '**' };

export type NamedRawRoute<T = unknown> = Pick<BaseRawRoute<T>, 'name'> &
  Partial<Omit<BaseRawRoute<T>, 'name'>>;

export type RawRoute<T = unknown> = WrapperRawRoute<T> | PathRawRoute<T> | NamedRawRoute<T>;

export interface NamedDestinationRequest {
  name: string;
  query?: Record<string, string | number>;
  params?: Record<string, string>;
  hash?: string;
}

export type PathDestinationRequest = string;

export type DirectionalDestinationRequest = number;

export type DestinationRequest =
  | NamedDestinationRequest
  | PathDestinationRequest
  | DirectionalDestinationRequest;

export interface DestinationOptions {
  replace?: boolean;
}

export enum RouteType {
  Catch = 'catch',
  CatchAll = 'catch-all',
  Path = 'path',
  Wrapper = 'wrapper',
}

export interface Segment {
  value: string;
  isParam: boolean;
}

export interface BaseRoute {
  segments: Array<Segment>;
  params: Array<string>;
  children: Array<Route>;
}

export interface WrapperRoute<T = unknown> extends Omit<WrapperRawRoute<T>, 'children'>, BaseRoute {
  type: RouteType.Wrapper;
}

export interface CatchRoute<T = unknown> extends Omit<CatchRawRoute<T>, 'children'>, BaseRoute {
  type: RouteType.Catch;
}

export interface CatchAllRoute<T = unknown>
  extends Omit<CatchAllRawRoute<T>, 'children'>,
    BaseRoute {
  type: RouteType.CatchAll;
}

export interface PathRoute<T = unknown> extends Omit<PathRawRoute<T>, 'children'>, BaseRoute {
  type: RouteType.Path;
}

export type Route<T = unknown> = WrapperRoute<T> | CatchRoute<T> | CatchAllRoute<T> | PathRoute<T>;

export type CachedRoute<T = unknown> = Route<T> & {
  steps: Array<Route<T>>;
  catchRoute?: Route<T>;
};

export enum RouterType {
  Browser = 'browser',
  Hash = 'hash',
}

export interface RouterConfig<T = unknown> {
  correctScrolling?: boolean;
  routes: Array<RawRoute<T>>;
  base?: string;
  type?: RouterType;
  onChanged?: () => void;
  transformTitle?: (title: string) => string;
  onUnloaded?: () => void;
}

export interface RouterObject<T = unknown> extends Omit<RouterConfig, 'routes'> {
  routes: Array<Route<T>>;
  type: RouterType;
  unload: () => void;
  onChanged: () => void;
  cache: RouterCache;
}

export type HistoryArguments = [{ path: string }, string, string];

export interface RouterEngine {
  getPath: () => string;
  createHistoryArgs: (path: string) => HistoryArguments;
}

export interface RouterCache {
  sequence: Array<Route>;
  catchRoute: Route | undefined;
}
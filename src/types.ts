export interface BaseRawRoute<T = unknown> {
  path: string;
  name: string;
  title: string;
  element: T;
  children: Array<RawRoute>;
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

export type RouteWithParentRef<T = unknown> = Route<T> & { parent?: RouteWithParentRef<T> };

export type CachedRoute<T = unknown> = Route<T> & {
  steps: Array<Route<T>>;
  parent?: RouteWithParentRef;
  fullPath: string;
  fullParams: Array<string>;
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
  catchAllElement: T;
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
  getPath: (base?: string) => string;
  getQueryParams: () => Record<string, string>;
  createHistoryArgs: (path: string, base?: string) => HistoryArguments;
}

export interface RouterCache<T = unknown> {
  routes: Array<CachedRoute<T>>;
  currentRoute?: CachedRoute<T>;
  processedPaths: Record<string, ClosestRoute<T>>;
  steps: Array<Route<T>>;
  params: Record<string, string>;
}

export interface ClosestRoute<T = unknown> {
  route: CachedRoute<T>;
  steps: Array<Route<T>>;
  params: Record<string, string>;
}

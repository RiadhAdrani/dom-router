import { afterAll, beforeAll, describe, expect, it, vitest } from 'vitest';
import {
  Route,
  Router,
  RouterError,
  RouterType,
  createPathFromNamedDestination,
  findClosestRoute,
  flattenRoutes,
  joinPaths,
} from '../class.js';
import browserRouter from '../browser.router.js';
import hashRouter from '../hash.router.js';

describe('joinsPaths', () => {
  it('should join two paths', () => {
    expect(joinPaths('/', '/user')).toBe('/user');
  });

  it('should not duplicate slashes', () => {
    expect(joinPaths('/test/', '/user')).toBe('/test/user');
  });

  it('should add slashes if missing', () => {
    expect(joinPaths('/test/', 'user')).toBe('/test/user');
  });
});

describe('flattenRoutes', () => {
  it('should ignore index route', () => {
    const res = flattenRoutes([{ path: '' }]);

    expect(res).toStrictEqual({});
  });

  it('should constrcut path route', () => {
    const res = flattenRoutes([{ path: '/', element: 'home', name: 'Home' }]);

    expect(res).toStrictEqual({
      '/': {
        name: 'Home',
        steps: ['home'],
        path: '/',
        params: [],
        title: undefined,
        isIndex: true,
      },
    });
  });

  it('should append index data to the previous path route', () => {
    const res = flattenRoutes([
      {
        path: '/',
        element: 'home',
        name: 'Home',
        children: [{ path: '', element: 'index', name: 'Index', title: 'Index' }],
      },
    ]);

    expect(res).toStrictEqual({
      '/': {
        name: 'Index',
        steps: ['home', 'index'],
        title: 'Index',
        path: '/',
        params: [],
        isIndex: true,
      },
    });
  });

  it('should extract params', () => {
    const res = flattenRoutes([{ path: '/:id' }]);

    expect(res).toStrictEqual({
      '/:id': {
        name: undefined,
        steps: [undefined],
        title: undefined,
        path: '/:id',
        params: ['id'],
      },
    });
  });

  it('should append params', () => {
    const res = flattenRoutes([
      { path: '/:id', children: [{ path: '/about', children: [{ path: '/:user' }] }] },
    ]);

    expect(res['/:id/about/:user']).toStrictEqual({
      name: undefined,
      steps: [undefined, undefined, undefined],
      path: '/:id/about/:user',
      params: ['id', 'user'],
      title: undefined,
    });
  });

  it('should construct catch route', () => {
    const res = flattenRoutes([{ path: '*', element: 'catch' }]);

    expect(res).toStrictEqual({
      '/*': {
        steps: ['catch'],
        path: '/*',
        params: [],
        title: undefined,
      },
    });
  });

  it('should handle multiple layers of layouts correctly (2)', () => {
    const res = flattenRoutes([
      { element: 1, children: [{ element: 2, children: [{ path: '/', element: 3 }] }] },
    ]);

    expect(res).toStrictEqual({
      '/': {
        steps: [1, 2, 3],
        path: '/',
        params: [],
        name: undefined,
        title: undefined,
        isIndex: true,
      },
    });
  });

  it('should handle multiple layers of layouts correctly (3)', () => {
    const res = flattenRoutes([
      {
        element: 1,
        children: [{ element: 2, children: [{ element: 3, children: [{ path: '/' }] }] }],
      },
    ]);

    expect(res).toStrictEqual({
      '/': {
        steps: [1, 2, 3, undefined],
        path: '/',
        params: [],
        name: undefined,
        title: undefined,
        isIndex: true,
      },
    });
  });

  it('should handle path children correctly', () => {
    const res = flattenRoutes([
      {
        element: 1,
        path: '/',
        children: [{ path: '/users', element: 2, children: [{ path: '/:id', element: 3 }] }],
      },
    ]);

    expect(res).toStrictEqual({
      '/': {
        steps: [1],
        path: '/',
        params: [],
        name: undefined,
        isIndex: true,
        title: undefined,
      },
      '/users': {
        steps: [1, 2],
        path: '/users',
        params: [],
        name: undefined,
        title: undefined,
      },
      '/users/:id': {
        steps: [1, 2, 3],
        path: '/users/:id',
        params: ['id'],
        name: undefined,
        title: undefined,
      },
    });
  });
});

describe('findClosestRoute', () => {
  const routes: Record<string, Route> = {
    '/': {
      params: [],
      path: '/',
      steps: [1],
      isIndex: true,
    },
    '/*': {
      params: [],
      path: '/*',
      steps: [-1],
    },
    '/succ': {
      params: [],
      path: '',
      steps: [0],
    },
    '/succ/one': {
      params: [],
      path: '',
      steps: [0, 0],
    },
    '/catch': {
      params: [],
      path: '',
      steps: [2],
    },
    '/catch/*': {
      params: [],
      path: '',
      steps: [2, 2],
    },
    '/users': {
      params: [],
      path: '/users',
      steps: [1, 2, 3],
    },
    '/users/search': {
      params: [],
      path: '/users',
      steps: [1, 2, 3, 4],
    },
    '/users/:id': {
      params: [],
      path: '/users/:id',
      steps: [1, 2, 3, 5],
    },
    '/users/:id/about': {
      params: [],
      path: '/users/:id/about',
      steps: [1, 2, 3, 5, 6],
    },
    '/users/:id/about/:section': {
      params: [],
      path: '/users/:id/about/:section',
      steps: [1, 2, 3, 5, 6, 7],
    },
    '/docs': {
      params: [],
      path: '/docs',
      steps: ['docs', 'index'],
      isIndex: true,
    },
    '/docs/api': {
      params: [],
      path: '/docs/api',
      steps: ['docs', 'side', 'index'],
      isIndex: true,
    },
    '/docs/api/function': {
      params: [],
      path: '/docs/api/function',
      steps: ['docs', 'side', 'function'],
    },
    '/cs': {
      params: [],
      path: '/cs',
      steps: ['cs'],
    },
    '/cs/langs': {
      params: [],
      path: '/cs/langs',
      steps: ['cs', 'langs', 'index'],
      isIndex: true,
    },
    '/cs/langs/*': {
      params: [],
      path: '/cs/langs/*',
      steps: ['cs', 'langs', 'not-found'],
    },
    '/cs/langs/js': {
      params: [],
      path: '/cs/langs/js',
      steps: ['cs', 'langs', 'js'],
    },
  };

  it('should match exact route (root)', () => {
    expect(findClosestRoute('/', routes)).toStrictEqual({
      steps: [1],
      params: {},
      route: {
        params: [],
        path: '/',
        steps: [1],
        isIndex: true,
      },
    });
  });

  it('should match exact route', () => {
    expect(findClosestRoute('/users', routes)).toStrictEqual({
      steps: [1, 2, 3],
      params: {},
      route: {
        params: [],
        path: '/users',
        steps: [1, 2, 3],
      },
    });
  });

  it('should match exact before dynamic route', () => {
    expect(findClosestRoute('/users/search', routes)).toStrictEqual({
      steps: [1, 2, 3, 4],
      params: {},
      route: {
        params: [],
        path: '/users',
        steps: [1, 2, 3, 4],
      },
    });
  });

  it('should match dynamic route with params', () => {
    expect(findClosestRoute('/users/123', routes)).toStrictEqual({
      steps: [1, 2, 3, 5],
      params: { id: '123' },
      route: {
        params: [],
        path: '/users/:id',
        steps: [1, 2, 3, 5],
      },
    });
  });

  it('should catch route if step is missing', () => {
    expect(findClosestRoute('/succ/two', routes)).toStrictEqual({
      steps: [0, -1],
      params: {},
      route: {
        params: [],
        path: '',
        steps: [0],
      },
    });
  });

  it('should partially match dynamic route with params', () => {
    expect(findClosestRoute('/users/123/str', routes)).toStrictEqual({
      steps: [1, 2, 3, 5, -1],
      params: { id: '123' },
      route: {
        params: [],
        path: '/users/:id',
        steps: [1, 2, 3, 5],
      },
    });
  });

  it('should catch route (nested)', () => {
    expect(findClosestRoute('/catch/pls', routes)).toStrictEqual({
      steps: [2, 2],
      params: {},
      route: {
        params: [],
        path: '',
        steps: [2, 2],
      },
    });
  });

  it('should replace index path with catch-all if not matched and there still segments to process', () => {
    expect(findClosestRoute('/docs/api/class', routes)).toStrictEqual({
      steps: ['docs', 'side', -1],
      params: {},
      route: {
        params: [],
        path: '/docs/api',
        steps: ['docs', 'side', 'index'],
        isIndex: true,
      },
    });
  });

  it('should replace index path with local-catch if not matched and there still segments to process', () => {
    expect(findClosestRoute('/cs/langs/ts', routes)).toStrictEqual({
      steps: ['cs', 'langs', 'not-found'],
      params: {},
      route: {
        params: [],
        path: '/cs/langs/*',
        steps: ['cs', 'langs', 'not-found'],
      },
    });
  });
});

describe('createPathFromNamedDestination', () => {
  it('should return undefined when no route is matched', () => {
    expect(createPathFromNamedDestination({ name: 'hello' }, {})).toStrictEqual(undefined);
  });

  it('should build path from route', () => {
    expect(
      createPathFromNamedDestination(
        { name: 'hello' },
        { '/users/search': { name: 'hello', params: [], path: '/users/search', steps: [] } },
      ),
    ).toStrictEqual('/users/search');
  });

  it('should add base', () => {
    expect(
      createPathFromNamedDestination(
        { name: 'hello' },
        { '/users/search': { name: 'hello', params: [], path: '/users/search', steps: [] } },
        '/test',
      ),
    ).toStrictEqual('/test/users/search');
  });

  it('should add hash', () => {
    expect(
      createPathFromNamedDestination(
        { name: 'hello', hash: 'el' },
        { '/users/search': { name: 'hello', params: [], path: '/users/search', steps: [] } },
      ),
    ).toStrictEqual('/users/search#el');
  });

  it('should add query', () => {
    expect(
      createPathFromNamedDestination(
        { name: 'hello', query: { open: 'true', id: '123' } },
        { '/users/search': { name: 'hello', params: [], path: '/users/search', steps: [] } },
      ),
    ).toStrictEqual('/users/search?open=true&id=123');
  });

  it('should build path with params', () => {
    expect(
      createPathFromNamedDestination(
        { name: 'hello', params: { id: '123' } },
        {
          '/users/search/:id': { name: 'hello', params: [], path: '/users/search/:id', steps: [] },
        },
      ),
    ).toStrictEqual('/users/search/123');
  });
});

describe('Router class', () => {
  const onChanged = vitest.fn();

  let router: Router;

  beforeAll(() => {
    router = new Router({
      onChanged,
      routes: [
        { path: '/', name: 'Root' },
        {
          path: '/users',
          name: 'Users',
          children: [
            { path: '/:id', title: 'User', name: 'User' },
            { path: '/search', title: 'Search Users', name: 'SearchUsers' },
          ],
        },
      ],
    });
  });

  afterAll(() => {
    router.unload();
  });

  describe('constructor', () => {
    it('should throw when base is invalid', () => {
      expect(() => new Router({ onChanged, routes: [], base: 'bad' })).toThrow(
        new RouterError(`invalid base "bad" : should start with "/"`),
      );
    });

    it('should default correctScrolling to false', () => {
      expect(router.correctScrolling).toBe(false);
    });

    it('should default type to browser', () => {
      expect(router.type).toBe(RouterType.Browser);
    });

    it('should assign onChanged', () => {
      expect(router.onChanged).toStrictEqual(onChanged);
    });
  });

  describe('engine', () => {
    it('should get browser engine', () => {
      expect(router.engine).toStrictEqual(browserRouter);
    });

    it('should get browser engine', () => {
      router.type = RouterType.Hash;

      expect(router.engine).toStrictEqual(hashRouter);

      // reset
      router.type = RouterType.Browser;
    });
  });

  describe('processPath', () => {
    it('should return false when url is the same as the cached one', () => {
      expect(router.processPath()).toBe(false);
    });

    it('should update cache', () => {
      history.pushState('', '', '/users');

      router.processPath();

      // params
      const params = router.cache.params;
      expect(params).toStrictEqual({});

      // steps
      const steps = router.cache.steps;
      expect(steps).toStrictEqual([undefined]);

      // url
      const url = router.cache.url;
      expect(url).toStrictEqual(location.href);

      // should add the processed path to record
      const processed = router.cache.processed;
      expect(processed['/users']).toStrictEqual({
        route: router.routes['/users'],
        params: {},
        steps: [undefined],
      });
    });

    it('should decode params', () => {
      history.pushState('', '', '/users/one two');
      router.processPath();

      expect(router.cache.params).toStrictEqual({ id: 'one two' });
    });

    it('should update title', () => {
      history.pushState('', '', '/users/search');
      router.processPath();

      expect(document.title).toBe('Search Users');
    });
  });

  describe('navigate', () => {
    it('should change path', () => {
      router.navigate('/');

      expect(location.pathname).toBe('/');
    });

    it('should update history state', () => {
      const spy = vitest.spyOn(history, 'pushState');

      router.navigate('/users');

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should replace history state', () => {
      const spy = vitest.spyOn(history, 'replaceState');

      router.navigate('/users/123', { replace: true });

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should navigate relatively', () => {
      const spy = vitest.spyOn(history, 'go');

      router.navigate(-1);

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should run on changed method', () => {
      const spy = vitest.fn();

      router.onChanged = spy;

      router.navigate('/');

      expect(spy).toHaveBeenCalledOnce();
    });

    it('should not run (onChanged) when url did not change', () => {
      const spy = vitest.fn();

      router.onChanged = spy;

      router.navigate(0);

      expect(spy).toHaveBeenCalledTimes(0);
    });
  });

  describe('toHref', () => {
    it('should return string with base', () => {
      router.base = '/base';

      expect(router.toHref('/any')).toStrictEqual('/base/any');

      router.base = undefined;
    });

    it('should not add base when already added', () => {
      router.base = '/base';

      expect(router.toHref('/base/any')).toStrictEqual('/base/any');

      router.base = undefined;
    });

    it('should retrieve path by name', () => {
      expect(router.toHref({ name: 'Root' })).toBe('/');
    });
  });
});

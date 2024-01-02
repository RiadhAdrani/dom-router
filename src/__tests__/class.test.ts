import { describe, expect, it } from 'vitest';
import {
  Route,
  createPathFromNamedDestination,
  findClosestRoute,
  flattenRoutes,
} from '../class.js';

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
      },
    });
  });

  it('should extract params', () => {
    const res = flattenRoutes([{ path: '/:id' }]);

    expect(res).toStrictEqual({
      '/:id': {
        name: undefined,
        steps: [undefined],
        path: '/:id',
        params: ['id'],
      },
    });
  });

  it('should append params', () => {
    const res = flattenRoutes([{ path: '/:id', children: [{ path: '/about/:user' }] }]);

    expect(res['/:id/about/:user']).toStrictEqual({
      name: undefined,
      steps: [undefined, undefined],
      path: '/:id/about/:user',
      params: ['id', 'user'],
    });
  });

  it('should construct catch route', () => {
    const res = flattenRoutes([{ path: '*', element: 'catch' }]);

    expect(res).toStrictEqual({
      '/*': {
        steps: ['catch'],
        path: '/*',
        params: [],
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
      },
      '/users': {
        steps: [1, 2],
        path: '/users',
        params: [],
        name: undefined,
      },
      '/users/:id': {
        steps: [1, 2, 3],
        path: '/users/:id',
        params: ['id'],
        name: undefined,
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
  };

  it('should match exact route (root)', () => {
    expect(findClosestRoute('/', routes)).toStrictEqual({
      steps: [1],
      params: {},
      route: {
        params: [],
        path: '/',
        steps: [1],
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

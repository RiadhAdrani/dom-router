import { describe, expect, it } from 'vitest';
import { flattenRoutes } from '../class.v2.js';

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
      '*': {
        steps: ['catch'],
        path: '*',
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

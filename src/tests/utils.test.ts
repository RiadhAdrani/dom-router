import { RawRoute, Route, RouteType, Segment } from '../types.js';
import {
  cacheRoutes,
  createPathFromNamedDestination,
  deriveRawRouteType,
  err,
  isPathValid,
  matchClosestRoute,
  segmentisePath,
  transformRawRoutes,
} from '../utils.js';
import { describe, expect, it } from 'vitest';

const routes = transformRawRoutes([
  {
    element: 'outlet',
    children: [
      { path: '/', name: 'Root' },
      { path: '/home', name: 'Home' },
      { path: '/about', name: 'About' },
      { path: '**', name: 'RootCatchAll' },
      {
        path: '/users',
        name: 'Users',
        children: [
          { path: '*', name: 'UserCatch' },
          {
            path: '/:id',
            name: 'User',
            children: [
              {
                element: 'dashboard',
                children: [
                  { path: '*' },
                  { path: '/about', name: 'UserAbout' },
                  { path: '/desc', name: 'UserDescription' },
                ],
              },
            ],
          },
          { path: '/search', name: 'UserSearch' },
        ],
      },
      {
        path: '/hello',
        children: [{ path: '/world' }],
      },
      {
        path: '/first-dynamic',
        children: [
          { path: '/:id', name: 'First' },
          { path: '/:token', name: 'Token' },
        ],
      },
      {
        path: '/static-first',
        children: [
          { path: '/:id', name: 'StaticFirstId' },
          { path: '/static', name: 'Static' },
        ],
      },
      {
        path: '/catcher',
        name: 'Catcher',
        children: [
          { path: '**', name: 'AllCatcher' },
          { path: '*', name: 'LocalCatcher' },
          { element: 'wrapper', children: [{ path: '/all', name: 'All' }] },
        ],
      },
      {
        path: '/inherit',
        name: 'Inherit',
        children: [
          { path: '*', name: 'InheritCatcher' },
          { element: 'wrapper', children: [{ path: '/test', name: 'InheritTest' }] },
          { path: '/useless', name: 'Useless' },
          {
            path: '/:id',
            children: [
              { path: '/hello' },
              { path: '**', name: 'OverrideCatcher' },
              {
                path: '/nested',
                children: [
                  { path: '/about' },
                  { path: '/sections', children: [{ path: '/about' }, { path: '/settings' }] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

const cached = cacheRoutes(routes);

describe('isPathValid', () => {
  it.each([
    ['/', true],
    ['home', false],
  ])('should validate path "%s" to "%s"', (path, res) => {
    expect(isPathValid(path)).toBe(res);
  });
});

describe('deriveRawRouteType', () => {
  const tests: Array<{ route: RawRoute; expected: RouteType | undefined }> = [
    { route: { element: 'outlet' }, expected: RouteType.Wrapper },
    { route: { path: '*' }, expected: RouteType.Catch },
    { route: { path: '**' }, expected: RouteType.CatchAll },
    { route: { path: '/' }, expected: RouteType.Path },
    { route: { path: 'home' }, expected: undefined },
  ];

  it.each(tests)('should derive type from raw route', ({ expected, route }) => {
    if (!expected) {
      expect(() => deriveRawRouteType(route)).toThrow(
        new Error(err('unable to derive route type')),
      );
      return;
    }

    expect(deriveRawRouteType(route)).toBe(expected);
  });
});

describe('segmentisePath', () => {
  const tests: Array<{ path: string; expected: Array<Segment> }> = [
    {
      path: '/',
      expected: [
        { value: '', isParam: false },
        { value: '', isParam: false },
      ],
    },
    {
      path: '/main',
      expected: [
        { value: '', isParam: false },
        { value: 'main', isParam: false },
      ],
    },
    {
      path: '/:id',
      expected: [
        { value: '', isParam: false },
        { value: ':id', isParam: true },
      ],
    },
  ];

  it.each(tests)('should segmentise path', ({ path, expected }) => {
    expect(segmentisePath(path)).toStrictEqual(expected);
  });
});

describe('transformRawRoutes', () => {
  const tests: Array<{ input: Array<RawRoute>; expected: Array<Route> | string }> = [
    {
      input: [{ element: 'hello' }],
      expected: [
        { children: [], params: [], segments: [], type: RouteType.Wrapper, element: 'hello' },
      ],
    },
    {
      input: [{ path: '/' }],
      expected: [
        {
          children: [],
          params: [],
          segments: [
            { value: '', isParam: false },
            { value: '', isParam: false },
          ],
          type: RouteType.Path,
          path: '/',
        },
      ],
    },
    {
      input: [{ path: '*' }],
      expected: [
        {
          children: [],
          params: [],
          segments: [],
          type: RouteType.Catch,
          path: '*',
        },
      ],
    },
    {
      input: [{ path: '**' }],
      expected: [
        {
          children: [],
          params: [],
          segments: [],
          type: RouteType.CatchAll,
          path: '**',
        },
      ],
    },
  ];

  it.each(tests)('should transform raw routes', ({ expected, input }) => {
    if (typeof expected === 'string') {
      expect(() => transformRawRoutes(input)).toThrow(new Error(err(expected)));
      return;
    }

    expect(transformRawRoutes(input)).toStrictEqual(expected);
  });
});

describe('createPathFromNamedDestination', () => {
  it('should return undefined when not found', () => {
    const path = createPathFromNamedDestination({ name: 'Unknown' }, cached);

    expect(path).toBeUndefined();
  });

  it('should create path', () => {
    const path = createPathFromNamedDestination({ name: 'Home' }, cached);

    expect(path).toBe('/home');
  });

  it('should add base to path', () => {
    const path = createPathFromNamedDestination({ name: 'Home' }, cached, '/base');

    expect(path).toBe('/base/home');
  });

  it('should add hash to path', () => {
    const path = createPathFromNamedDestination({ name: 'Home', hash: 'nice' }, cached);

    expect(path).toBe('/home#nice');
  });

  it('should add search query to path', () => {
    const path = createPathFromNamedDestination({ name: 'Home', query: { id: '122' } }, cached);

    expect(path).toBe('/home?id=122');
  });

  it('should add replace with params', () => {
    const path = createPathFromNamedDestination({ name: 'User', params: { id: 'xyz' } }, cached);

    expect(path).toBe('/users/xyz');
  });

  it('should create path of deeply nested named route', () => {
    const path = createPathFromNamedDestination(
      { name: 'UserAbout', params: { id: 'xyz' } },
      cached,
    );

    expect(path).toBe('/users/xyz/about');
  });
});

describe('cacheRoutes', () => {
  const wrapper = routes[0];
  const users = wrapper.children[4];
  const user = users.children[1];
  const userDashboardWrapper = user.children[0];
  const userDashboardAbout = userDashboardWrapper.children[1];

  const cachedRoutes = cacheRoutes(routes);

  it('should create full path', () => {
    expect(cachedRoutes[8].fullPath).toBe('/users/:id/about');
  });

  it('should create full path', () => {
    expect(cachedRoutes[8].fullParams).toStrictEqual(['id']);
  });

  it('should add parent', () => {
    expect(cachedRoutes[8].parent).toBeDefined();
  });

  it('should create steps correctly', () => {
    const route = cachedRoutes[8];

    expect(route.steps).toStrictEqual([
      wrapper,
      users,
      user,
      userDashboardWrapper,
      userDashboardAbout,
    ]);
  });
});

describe('matchClosestRoute', () => {
  const cache = cacheRoutes(routes);

  const catcher = cache.find(
    it => it.path === '/**' && it.type === (RouteType.CatchAll as string),
  ) as Route;

  it('should match an exact route', () => {
    const matched = matchClosestRoute('/users/search', cache, catcher);

    expect(matched.route.fullPath).toBe('/users/search');
  });

  it('should add params to exact route', () => {
    const matched = matchClosestRoute('/users/:id/about', cache, catcher);

    expect(matched.route.fullPath).toBe('/users/:id/about');
    expect(matched.params).toStrictEqual({ id: ':id' });
  });

  it('should match closest route dynamic', () => {
    const matched = matchClosestRoute('/users/:id/hello', cache, catcher);

    expect(matched.route.name).toBe('User');
  });

  it('should match closest route static', () => {
    const matched = matchClosestRoute('/users/search/hello', cache, catcher);

    expect(matched.route.name).toBe('UserSearch');
  });

  it('should prioritize static routes', () => {
    const matched = matchClosestRoute('/static-first/static', cache, catcher);

    expect(matched.route.name).toBe('Static');
  });

  it('should get first route', () => {
    const matched = matchClosestRoute('/first-dynamic/test', cache, catcher);

    expect(matched.route.name).toBe('First');
  });

  it('should appened catcher route at the end of a shorter route', () => {
    const matched = matchClosestRoute('/catcher/test', cache, catcher);

    expect(matched.route.name).toBe('Catcher');

    const mCatcher = matched.steps.at(-1);

    expect(mCatcher?.name).toBe('LocalCatcher');
  });

  it('should inherit catcher', () => {
    const matched = matchClosestRoute('/inherit/test/yeeted', cache, catcher);

    const mCatcher = matched.steps.at(-1);

    expect(mCatcher?.name).toBe('RootCatchAll');
  });

  it('should inherit catcher (deep)', () => {
    const matched = matchClosestRoute('/inherit/123/nested/sections/name', cache, catcher);

    const mCatcher = matched.steps.at(-1);

    expect(mCatcher?.name).toBe('OverrideCatcher');
  });

  it('should create params record', () => {
    const matched = matchClosestRoute('/inherit/123/nested/sections/name', cache, catcher);

    expect(matched.params).toStrictEqual({ id: '123' });
  });
});

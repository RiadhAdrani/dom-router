import { RawRoute, Route, RouteType, Segment } from '../types.js';
import {
  cacheRoutes,
  createPathFromNamedDestination,
  deriveRawRouteType,
  err,
  isPathValid,
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
      { path: '**' },
      {
        path: '/users',
        name: 'Users',
        children: [
          { path: '*' },
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

describe('cachRoutes', () => {
  it('should cache a routes', () => {
    const wrapper = routes[0];
    const root = wrapper.children[0];
    const home = wrapper.children[1];
    const about = wrapper.children[2];
    const catchAll = wrapper.children[3];

    const users = wrapper.children[4];
    const usersCatch = users.children[0];
    const userSearch = users.children[2];

    const user = users.children[1];
    const userDashboardWrapper = user.children[0];
    const userDashboardCatch = userDashboardWrapper.children[0];
    const userDashboardAbout = userDashboardWrapper.children[1];
    const userDashboardDesc = userDashboardWrapper.children[2];

    const cachedRoutes = cacheRoutes(routes);

    expect(cachedRoutes.length).toBe(11);

    // root
    expect(cachedRoutes[0]).toStrictEqual({
      ...root,
      steps: [wrapper, root],
      catchRoute: catchAll,
      fullPath: '/',
      fullParams: [],
    });

    // home
    expect(cachedRoutes[1]).toStrictEqual({
      ...home,
      steps: [wrapper, home],
      catchRoute: catchAll,
      fullPath: '/home',
      fullParams: [],
    });

    // about
    expect(cachedRoutes[2]).toStrictEqual({
      ...about,
      steps: [wrapper, about],
      catchRoute: catchAll,
      fullPath: '/about',
      fullParams: [],
    });

    // catch all
    expect(cachedRoutes[3]).toStrictEqual({
      ...catchAll,
      steps: [wrapper, catchAll],
      catchRoute: catchAll,
      fullPath: '/**',
      fullParams: [],
    });

    // users
    expect(cachedRoutes[4]).toStrictEqual({
      ...users,
      steps: [wrapper, users],
      catchRoute: catchAll,
      fullPath: '/users',
      fullParams: [],
    });

    // users catch
    expect(cachedRoutes[5]).toStrictEqual({
      ...usersCatch,
      steps: [wrapper, users, usersCatch],
      catchRoute: usersCatch,
      fullPath: '/users/*',
      fullParams: [],
    });

    // user
    expect(cachedRoutes[6]).toStrictEqual({
      ...user,
      steps: [wrapper, users, user],
      catchRoute: usersCatch,
      fullPath: '/users/:id',
      fullParams: ['id'],
    });

    // user dashboard catch
    expect(cachedRoutes[7]).toStrictEqual({
      ...userDashboardCatch,
      steps: [wrapper, users, user, userDashboardWrapper, userDashboardCatch],
      catchRoute: userDashboardCatch,
      fullPath: '/users/:id/*',
      fullParams: ['id'],
    });

    // user dashboard about
    expect(cachedRoutes[8]).toStrictEqual({
      ...userDashboardAbout,
      steps: [wrapper, users, user, userDashboardWrapper, userDashboardAbout],
      catchRoute: userDashboardCatch,
      fullPath: '/users/:id/about',
      fullParams: ['id'],
    });

    // user dashboard desc
    expect(cachedRoutes[9]).toStrictEqual({
      ...userDashboardDesc,
      steps: [wrapper, users, user, userDashboardWrapper, userDashboardDesc],
      catchRoute: userDashboardCatch,
      fullPath: '/users/:id/desc',
      fullParams: ['id'],
    });
    // user search
    expect(cachedRoutes[10]).toStrictEqual({
      ...userSearch,
      steps: [wrapper, users, userSearch],
      catchRoute: usersCatch,
      fullPath: '/users/search',
      fullParams: [],
    });
  });
});

import { afterEach, describe, expect, it, vitest, beforeEach } from 'vitest';
import { RouterInstance } from '../class.js';
import { err } from '../utils.js';

describe('router class', () => {
  let router: RouterInstance;

  beforeEach(() => {
    history.replaceState('/', '', '/');

    router = new RouterInstance({
      routes: [
        {
          path: '/',
          title: 'Home',
          name: 'Home',
        },
        {
          path: '/users',
          children: [
            {
              path: '/:id',
            },
          ],
        },
      ],
      catchAllElement: 'not-found',
    });
  });

  afterEach(() => {
    router.unload();
  });

  describe('constructor', () => {
    it('should throw when base is invalid', () => {
      expect(
        () => new RouterInstance({ routes: [], base: 'base', catchAllElement: 'not found' }),
      ).toThrow(err(`invalid base "base" : should start with "/"`));
    });

    it('should throw when no root element is detected', () => {
      expect(() => new RouterInstance({ routes: [], catchAllElement: 'not found' })).toThrow(
        err(`no root route found`),
      );
    });

    it('should trigger unload hook', () => {
      const onUnloaded = vitest.fn(() => 0);

      const router = new RouterInstance({
        routes: [{ path: '/' }],
        catchAllElement: 'not found',
        onUnloaded,
      });

      router.unload();

      expect(onUnloaded).toHaveBeenCalledOnce();
    });

    it.todo('should attach listener to window:popstate event');

    it('should cache initial path data', () => {
      const { params, processedPaths, steps, currentRoute } = router.cache;

      expect(currentRoute).toBeDefined();
      expect(params).toStrictEqual({});
      expect(processedPaths).toHaveProperty('/');
      expect(steps.length).toBe(1);
    });
  });

  describe('navigate', () => {
    it('should replace state', () => {
      const stack = history.length;

      router.navigate('/user', { replace: true });

      expect(history.length).toBe(stack);
      expect(location.pathname).toBe('/user');
    });

    it('should push to state', () => {
      const stack = history.length;

      router.navigate('/test');

      expect(history.length).toBe(stack + 1);
      expect(location.pathname).toBe('/test');
    });

    it.skip('should navigate relative to the input number', () => {
      router.navigate('/one');
      router.navigate('/two');

      const fn = vitest.fn();

      router.onChanged = fn;

      router.navigate(-1);

      expect(fn).toHaveBeenCalledOnce();
    });

    it('should trigger change hook with navigation', () => {
      const onChanged = vitest.fn(() => 0);

      const router = new RouterInstance({
        routes: [{ path: '/' }],
        catchAllElement: 'not found',
        onChanged,
      });

      router.navigate('/home');

      expect(onChanged).toHaveBeenCalledOnce();

      router.unload();
    });
  });

  describe('getParams', () => {
    it('should return empty record', () => {
      expect(router.getParams()).toStrictEqual({});
    });
  });
});

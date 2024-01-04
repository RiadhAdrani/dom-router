import { describe, expect, it } from 'vitest';
import hashRouter from '../hash.router.js';

describe('hashRouter', () => {
  describe('getPath', () => {
    it('should retrieve root pathname when no hash exists', () => {
      expect(hashRouter.getPath()).toBe('/');
    });

    it('should retrieve pathname', () => {
      history.pushState({}, '', '/#/hello');

      expect(hashRouter.getPath()).toBe('/hello');
    });

    it('should remove base', () => {
      history.pushState({}, '', '/#/base/home');

      expect(hashRouter.getPath('/base')).toBe('/home');
    });

    it('should return root path for base only', () => {
      history.pushState({}, '', '/base');

      expect(hashRouter.getPath('/base')).toBe('/');
    });
  });

  describe('createHistoryArgs', () => {
    it('should create an array with three elements', () => {
      const args = hashRouter.createHistoryArgs('/home');

      expect(args).toStrictEqual([{ path: '/#/home' }, '', '/#/home']);
    });
  });

  describe('getQueryParams', () => {
    it('should return empty object', () => {
      history.pushState(null, '', '#/');

      expect(hashRouter.getQueryParams()).toStrictEqual({});
    });

    it('should return object with values', () => {
      history.pushState(null, '', '#/?value=123&name=test');

      expect(hashRouter.getQueryParams()).toStrictEqual({ value: '123', name: 'test' });
    });

    it('should decode params', () => {
      history.pushState(null, '', '#/?value=123&name=test%20one');

      expect(hashRouter.getQueryParams()).toStrictEqual({ value: '123', name: 'test one' });
    });
  });
});

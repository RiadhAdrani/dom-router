import { describe, expect, it } from 'vitest';
import browserRouter from '../browser.router.js';

describe('browserRouter', () => {
  describe('getPath', () => {
    it('should retrieve pathname', () => {
      expect(browserRouter.getPath()).toBe('/');
    });

    it('should retrieve pathname', () => {
      history.pushState({}, '', '/hello');

      expect(browserRouter.getPath()).toBe('/hello');
    });

    it('should remove base', () => {
      history.pushState({}, '', '/base/home');

      expect(browserRouter.getPath('/base')).toBe('/home');
    });

    it('should return root path for base only', () => {
      history.pushState({}, '', '/base');

      expect(browserRouter.getPath('/base')).toBe('/');
    });
  });

  describe('createHistoryArgs', () => {
    it('should create an array with three elements', () => {
      const args = browserRouter.createHistoryArgs('/home');

      expect(args).toStrictEqual([{ path: '/home' }, '', '/home']);
    });
  });
});

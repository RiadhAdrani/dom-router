import { JSDOM, DOMWindow } from 'jsdom';

function firePopstateOnRoute(window: DOMWindow): void {
  const { history } = window;
  const originalBack = history.back;
  const originalForwards = history.forward;

  (history as unknown as { __proto__: History })['__proto__'].back = function patchedBack(
    this: History,
    ...args: Parameters<History['back']>
  ): void {
    originalBack.apply(this, args);

    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  (history as unknown as { __proto__: History }).__proto__.forward = function patchedForward(
    this: History,
    ...args: Parameters<History['forward']>
  ): void {
    originalForwards.apply(this, args);

    window.dispatchEvent(new PopStateEvent('popstate'));
  };
}

export function mockBrowser(): void {
  const jsdom = new JSDOM('');
  const { window } = jsdom;

  firePopstateOnRoute(window);
}

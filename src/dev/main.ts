import { Router, RouterType } from '../class.js';
import { element as el } from '@riadh-adrani/domer';

const router = new Router({
  base: '/test',
  type: RouterType.Hash,
  routes: [
    { path: '*', element: 'not found' },
    {
      element: 'layout',
      children: [
        { path: '/', element: 'root', title: 'Home', name: 'Home' },
        {
          path: '/users',
          element: 'users',
          title: 'User',
          children: [
            { path: '', element: 'user home', name: 'UsersRoot' },
            {
              path: '/:id',
              element: 'userId',
              name: 'User',
              children: [{ path: '*', element: 'no user found' }],
            },
          ],
        },
      ],
    },
  ],
  onChanged: render,
});

let app: HTMLElement;

let renderCount = 0;

function render() {
  renderCount++;

  app = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px' } }, [
    el('div', { style: { display: 'flex', flexDirection: 'row' } }, [
      el('button', { '@click': () => router.navigate('/') }, ['Home']),
      el('button', { '@click': () => router.navigate('/users') }, ['users']),
      el('button', { '@click': () => router.navigate('/users/123') }, ['user 123']),
      el('button', { '@click': () => router.navigate('/users/123/nothing') }, ['user 123 nothing']),
    ]),
    el('button', {}, ['Render Count ', renderCount]),
    ...(() => {
      const html: Array<unknown> = [];
      let i = 0;

      do {
        const outlet = router.getElementByDepth(i);

        html.push(el('h1', {}, [outlet]));

        i++;
      } while (router.getElementByDepth(i));

      return html;
    })(),
  ]);

  document.body.innerHTML = '';
  document.body.append(app);
}

render();

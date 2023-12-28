import { RouterInstance } from '../class.js';

const router = new RouterInstance({
  base: '/test',
  routes: [
    {
      element: 'layout',
      children: [
        { path: '/', element: 'root', title: 'Home', name: 'Home' },
        {
          path: '/users',
          element: 'users',
          title: 'User',
          children: [
            { path: '/', element: 'user home', name: 'UsersRoot' },
            { path: '/:id', element: 'userId', name: 'User' },
          ],
        },
      ],
    },
  ],
  catchAllElement: 'not found',

  onChanged() {
    render();
  },
});

function render() {
  let i = 0;

  let html = '';

  const navBar = `<a href="${router.toHref({
    name: 'UsersRoot',
  })}">Users</a><a href="${router.toHref({ name: 'User', params: { id: '123' } })}">User</a>`;

  html += navBar;

  do {
    const el = router.getElementByDepth(i);

    html += `<h1>${el} ${router.getParams().id}</h1>`;

    i++;
  } while (router.getElementByDepth(i));

  document.body.innerHTML = html;
}

render();

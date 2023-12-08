import { RouterInstance } from '../class.js';

const router = new RouterInstance({
  routes: [
    {
      element: 'layout',
      children: [
        { path: '/', element: 'root' },
        { path: '/users', element: 'users', children: [{ path: '/:id' }] },
      ],
    },
  ],
  catchAllElement: 'not found',
});

console.log(router.getParams());

import { RouterInstance } from '../class.js';

const router = new RouterInstance({
  routes: [
    {
      element: 'layout',
      children: [
        { path: '/', element: 'root', title: 'Home', name: 'Home' },
        {
          path: '/users',
          element: 'users',
          title: 'User',
          children: [{ path: '/:id', element: 'userId', name: 'User' }],
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

  do {
    const el = router.getElementByDepth(i);

    html += `<h1>${el}</h1>`;

    i++;
  } while (router.getElementByDepth(i));

  document.body.innerHTML = html;
}

render();

router.navigate('/?hello=world');

const path = router.createPathFromNamedDestination({
  name: 'User',
  params: { id: '1' },
});

router.navigate(path ?? '/');

const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/history', component: () => import('pages/HistoryPage.vue') }
    ]
  }
];

export default routes;

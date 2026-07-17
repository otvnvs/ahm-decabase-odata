import { createRouter, createWebHashHistory } from 'vue-router';
import LandingPage from './pages/LandingPage.vue';
import GenericDemo from './pages/GenericDemo.vue';
import WorkflowDemo from './pages/WorkflowDemo.vue';
import WorkflowCountPage from './pages/WorkflowCountPage.vue';
import WorkflowListPage from './pages/WorkflowListPage.vue';
import WorkflowSubmitPage from './pages/WorkflowSubmitPage.vue';

const routes = [
  { path: '/', name: 'home', component: LandingPage },
  { path: '/generic', name: 'generic', component: GenericDemo },
  { path: '/workflow', name: 'workflow', component: WorkflowDemo },
  { path: '/workflow/count', name: 'workflow-count', component: WorkflowCountPage },
  { path: '/workflow/list', name: 'workflow-list', component: WorkflowListPage },
  { path: '/workflow/submit', name: 'workflow-submit', component: WorkflowSubmitPage },
];

// Hash history: works on GitHub Pages without server rewrites.
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

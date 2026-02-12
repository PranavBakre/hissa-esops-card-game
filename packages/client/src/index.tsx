// ===========================================
// ESOP Wars v4 - Client Entry Point (SolidJS)
// ===========================================

import { render } from 'solid-js/web';
import { App } from './App';

const root = document.getElementById('app');

if (root) {
  render(() => <App />, root);
}

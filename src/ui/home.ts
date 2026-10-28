import { applyTranslations } from '../i18n';

export function mountHome(root: HTMLElement): () => void {
  root.className = 'home';
  root.innerHTML = `
    <h1 data-i18n="app.title" tabindex="-1"></h1>
    <p class="tagline" data-i18n="home.tagline"></p>
    <nav class="menu">
      <a class="button" href="#/micro" data-i18n="home.micTest"></a>
    </nav>`;
  applyTranslations(root);
  return () => {};
}

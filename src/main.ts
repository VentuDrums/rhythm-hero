import { applyTranslations, chooseLang, getLang, initialLang, setLang } from './i18n';
import { mountCalibration } from './ui/calibrationScreen';
import { mountHome } from './ui/home';
import { mountLevelSelect } from './ui/levelSelect';
import { mountMicTester } from './ui/micTester';
import { mountNotationPreview } from './ui/notationPreview';
import { mountReadAndPlay } from './ui/readAndPlayScreen';
import './ui/theme.css';

// Rutas: #/pantalla o #/pantalla/parámetro (p. ej. #/leer/3).
const routes: Record<string, (root: HTMLElement, param?: string) => () => void> = {
  '#/micro': mountMicTester,
  '#/partitura': mountNotationPreview,
  '#/niveles': mountLevelSelect,
  '#/leer': mountReadAndPlay,
  '#/calibrar': mountCalibration,
};

const app = document.querySelector<HTMLElement>('#app') as HTMLElement;
const langButton = document.querySelector<HTMLButtonElement>('#lang-switch');
let unmount: () => void = () => {};

function route(): void {
  unmount();
  const [screen = '', param] = location.hash.split('/').slice(1);
  const mount = routes[`#/${screen}`];
  unmount = mount ? mount(app, param) : mountHome(app);
  // Al cambiar de pantalla, el foco va al título para que los lectores de pantalla anuncien dónde estamos.
  if (location.hash) app.querySelector<HTMLElement>('h1')?.focus();
}

function showLang(): void {
  applyTranslations(document);
  // El botón está escrito en el otro idioma ("English" / "Español"); se marca para los lectores de pantalla.
  if (langButton) langButton.lang = getLang() === 'es' ? 'en' : 'es';
}

langButton?.addEventListener('click', () => {
  chooseLang(getLang() === 'es' ? 'en' : 'es');
  showLang();
});

window.addEventListener('hashchange', route);
setLang(initialLang());
showLang();
route();

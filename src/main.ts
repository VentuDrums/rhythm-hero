import { applyTranslations, getLang, setLang } from './i18n';
import { mountCalibration } from './ui/calibrationScreen';
import { mountHome } from './ui/home';
import { mountMicTester } from './ui/micTester';
import { mountNotationPreview } from './ui/notationPreview';
import { mountReadAndPlay } from './ui/readAndPlayScreen';
import './ui/theme.css';

const routes: Record<string, (root: HTMLElement) => () => void> = {
  '#/micro': mountMicTester,
  '#/partitura': mountNotationPreview,
  '#/leer': mountReadAndPlay,
  '#/calibrar': mountCalibration,
};

const app = document.querySelector<HTMLElement>('#app') as HTMLElement;
const langButton = document.querySelector<HTMLButtonElement>('#lang-switch');
let unmount: () => void = () => {};

function route(): void {
  unmount();
  unmount = (routes[location.hash] ?? mountHome)(app);
  // Al cambiar de pantalla, el foco va al título para que los lectores de pantalla anuncien dónde estamos.
  if (location.hash) app.querySelector<HTMLElement>('h1')?.focus();
}

langButton?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyTranslations(document);
  // El botón está escrito en el otro idioma ("English" / "Español"); se marca para los lectores de pantalla.
  langButton.lang = getLang() === 'es' ? 'en' : 'es';
});

window.addEventListener('hashchange', route);
setLang(getLang());
applyTranslations(document);
route();

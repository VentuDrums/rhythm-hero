import { applyTranslations, getLang, setLang } from './i18n';
import './ui/theme.css';

const langButton = document.querySelector<HTMLButtonElement>('#lang-switch');

langButton?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyTranslations(document);
  // El botón está escrito en el otro idioma ("English" / "Español"); se marca para los lectores de pantalla.
  langButton.lang = getLang() === 'es' ? 'en' : 'es';
});

setLang(getLang());
applyTranslations(document);

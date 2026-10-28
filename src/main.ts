import { applyTranslations, getLang, setLang } from './i18n';
import './ui/theme.css';

const langButton = document.querySelector<HTMLButtonElement>('#lang-switch');

langButton?.addEventListener('click', () => {
  setLang(getLang() === 'es' ? 'en' : 'es');
  applyTranslations(document);
});

setLang(getLang());
applyTranslations(document);

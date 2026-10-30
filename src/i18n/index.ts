import en from './en.json';
import es from './es.json';

export type Lang = 'es' | 'en';
export type MessageKey = keyof typeof es;
export type Params = Record<string, string | number>;

const messages: Record<Lang, Record<MessageKey, string>> = { es, en };

let current: Lang = 'es';

export function getLang(): Lang {
  return current;
}

const LANG_KEY = 'rhythm-hero.lang';

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

/** Cambia de idioma y lo recuerda en este dispositivo (si el navegador deja guardar). */
export function chooseLang(lang: Lang): void {
  setLang(lang);
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Sin almacenamiento: el idioma vale hasta cerrar la página.
    return;
  }
}

function savedLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

/** Idioma al abrir: el elegido antes; si no, el del navegador (inglés si empieza por "en"); si no, español. */
export function initialLang(browserLang = navigator.language): Lang {
  const saved = savedLang();
  if (saved === 'es' || saved === 'en') return saved;
  return browserLang.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/** Traduce una clave; los huecos {nombre} se rellenan con params. */
export function t(key: MessageKey, params: Params = {}): string {
  return messages[current][key].replace(/\{(\w+)\}/g, (hole, name: string) => String(params[name] ?? hole));
}

export function isMessageKey(key: string | null): key is MessageKey {
  return key !== null && Object.hasOwn(messages.es, key);
}

/** Pone un texto traducible en un elemento y lo deja marcado para que cambie al cambiar de idioma. */
export function setText(el: Element, key: MessageKey, params?: Params): void {
  el.setAttribute('data-i18n', key);
  if (params) el.setAttribute('data-i18n-params', JSON.stringify(params));
  else el.removeAttribute('data-i18n-params');
  el.textContent = t(key, params);
}

function paramsOf(el: Element): Params {
  const raw = el.getAttribute('data-i18n-params');
  return raw ? (JSON.parse(raw) as Params) : {};
}

const bindings: [attr: string, apply: (el: Element, text: string) => void][] = [
  ['data-i18n', (el, text) => (el.textContent = text)],
  ['data-i18n-label', (el, text) => el.setAttribute('aria-label', text)],
];

/** Rellena los elementos marcados con data-i18n (texto) y data-i18n-label (aria-label). */
export function applyTranslations(root: ParentNode): void {
  for (const [attr, apply] of bindings) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      const key = el.getAttribute(attr);
      if (isMessageKey(key)) apply(el, t(key, paramsOf(el)));
    }
  }
}

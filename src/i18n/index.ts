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

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
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

import en from './en.json';
import es from './es.json';

export type Lang = 'es' | 'en';
export type MessageKey = keyof typeof es;

const messages: Record<Lang, Record<MessageKey, string>> = { es, en };

let current: Lang = 'es';

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function t(key: MessageKey): string {
  return messages[current][key];
}

export function isMessageKey(key: string | null): key is MessageKey {
  return key !== null && Object.hasOwn(messages.es, key);
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
      if (isMessageKey(key)) apply(el, t(key));
    }
  }
}

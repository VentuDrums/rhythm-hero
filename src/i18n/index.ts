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

function isMessageKey(key: string): key is MessageKey {
  return key in messages.es;
}

/** Rellena los elementos marcados con data-i18n (texto) y data-i18n-label (aria-label). */
export function applyTranslations(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n ?? '';
    if (isMessageKey(key)) el.textContent = t(key);
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    const key = el.dataset.i18nLabel ?? '';
    if (isMessageKey(key)) el.setAttribute('aria-label', t(key));
  }
}

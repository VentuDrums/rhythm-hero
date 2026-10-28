import { beforeEach, describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import { applyTranslations, getLang, isMessageKey, setLang, setText, t } from '../../src/i18n';

describe('i18n', () => {
  beforeEach(() => setLang('es'));

  it('has the same keys in every language', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('translates a key in the current language', () => {
    expect(t('home.tagline')).toBe(es['home.tagline']);
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('home.tagline')).toBe(en['home.tagline']);
  });

  it('updates every [data-i18n] element and the document language', () => {
    document.body.innerHTML = '<p data-i18n="home.tagline"></p>';
    setLang('en');
    applyTranslations(document.body);
    expect(document.querySelector('p')?.textContent).toBe(en['home.tagline']);
    expect(document.documentElement.lang).toBe('en');
  });

  it('translates aria-label from [data-i18n-label]', () => {
    document.body.innerHTML = '<button data-i18n-label="home.tagline"></button>';
    applyTranslations(document.body);
    expect(document.querySelector('button')?.getAttribute('aria-label')).toBe(es['home.tagline']);
  });

  it('fills {placeholders} and keeps unknown ones visible', () => {
    expect(t('mic.detected', { count: 7 })).toBe('Golpes detectados: 7');
    expect(t('mic.detected')).toBe('Golpes detectados: {count}');
  });

  it('setText keeps parameters so a language switch re-renders them', () => {
    document.body.innerHTML = '<p></p>';
    const p = document.querySelector('p') as HTMLParagraphElement;
    setText(p, 'mic.detected', { count: 3 });
    expect(p.textContent).toBe('Golpes detectados: 3');
    setLang('en');
    applyTranslations(document.body);
    expect(p.textContent).toBe('Claps detected: 3');
    setText(p, 'home.tagline');
    expect(p.hasAttribute('data-i18n-params')).toBe(false);
  });

  it('recognises only real message keys', () => {
    expect(isMessageKey('home.tagline')).toBe(true);
    expect(isMessageKey('toString')).toBe(false);
    expect(isMessageKey('')).toBe(false);
    expect(isMessageKey(null)).toBe(false);
  });

  it('leaves elements with unknown or empty keys untouched', () => {
    document.body.innerHTML =
      '<p data-i18n="no.such.key">orig</p><p data-i18n>empty</p>' +
      '<button data-i18n-label="no.such.key" aria-label="orig"></button><button data-i18n-label aria-label="empty"></button>';
    applyTranslations(document.body);
    const [p1, p2] = document.querySelectorAll('p');
    const [b1, b2] = document.querySelectorAll('button');
    expect(p1?.textContent).toBe('orig');
    expect(p2?.textContent).toBe('empty');
    expect(b1?.getAttribute('aria-label')).toBe('orig');
    expect(b2?.getAttribute('aria-label')).toBe('empty');
  });
});

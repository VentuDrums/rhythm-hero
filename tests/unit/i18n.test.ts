import { beforeEach, describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import { applyTranslations, getLang, isMessageKey, setLang, t } from '../../src/i18n';

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

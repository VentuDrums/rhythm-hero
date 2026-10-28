import { beforeEach, describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import { applyTranslations, getLang, setLang, t } from '../../src/i18n';

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
});

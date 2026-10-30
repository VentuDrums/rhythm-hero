// Selector de niveles (T9/T10): los bloqueados se ven pero no se abren; cada nivel muestra su récord y estrellas.
import { applyTranslations } from '../i18n';
import { LEVELS } from '../levels';
import { isUnlocked, loadProgress } from '../storage/progress';
import { getUnlockAll, setUnlockAll } from '../storage/settings';

export function mountLevelSelect(root: HTMLElement): () => void {
  const progress = loadProgress();
  const ids = LEVELS.map((l) => l.id);
  const unlockAll = getUnlockAll();
  root.className = 'screen';
  const items = LEVELS.map(({ id, exercise }) => {
    const { beats, beatUnit } = exercise.timeSignature;
    const record = progress[id];
    const stars = record?.stars ?? 0;
    const starsText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const info = `
      <span class="level-num" data-i18n="levels.number" data-i18n-params='{"n":${id}}'></span>
      <span class="level-title" data-i18n="level.title.${id}"></span>
      <span class="level-meta">${beats}/${beatUnit} · ${exercise.bpm} BPM</span>
      <span class="level-stars" role="img" data-i18n-label="summary.stars" data-i18n-params='{"stars":${stars}}'>${starsText}</span>
      ${record ? `<span class="level-best" data-i18n="levels.best" data-i18n-params='{"percent":${record.best}}'></span>` : ''}`;
    return unlockAll || isUnlocked(ids, id, progress)
      ? `<li><a class="level-card" href="#/leer/${id}">${info}</a></li>`
      : `<li><span class="level-card locked" aria-disabled="true">${info}<span class="level-lock" data-i18n="levels.locked"></span></span></li>`;
  }).join('');
  root.innerHTML = `
    <a class="back" href="#/" data-i18n="nav.back"></a>
    <h1 data-i18n="levels.title" tabindex="-1"></h1>
    <p data-i18n="levels.intro"></p>
    <ol class="level-list">${items}</ol>
    <section class="teacher">
      <p class="note" data-i18n="levels.teacherNote"></p>
      <button type="button" class="button secondary" id="unlock-all" data-i18n="${unlockAll ? 'levels.lockAgain' : 'levels.unlockAll'}"></button>
    </section>`;
  applyTranslations(root);
  root.querySelector('#unlock-all')?.addEventListener('click', () => {
    setUnlockAll(!unlockAll);
    mountLevelSelect(root);
    root.querySelector<HTMLElement>('#unlock-all')?.focus();
  });
  return () => {};
}

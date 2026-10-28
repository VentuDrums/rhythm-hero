# Constraints: Rhythm Hero

Last reviewed: 2026-10-28 by Carlos (dueño del proyecto)

Este archivo fija el nivel de calidad. Ningún cambio se da por terminado si alguna de estas comprobaciones falla.
Si una comprobación falla, se arregla el código. Nunca se rebaja la norma.

## Floor (siempre, sin excepciones)

- No suppressions: no se añaden `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `istanbul ignore` ni `c8 ignore`
- No stubs: ni `throw new Error("Not implemented")`, ni `catch {}` vacíos, ni `TODO` en lugar de la implementación
- No easier tests: no se usa `.skip`/`.todo`, no se borran archivos de test y no se quitan aserciones
- No secrets: ninguna clave ni contraseña en el código (la app no necesita ninguna)
- No weakening: este archivo no se rebaja para que un cambio pase

Lo comprueba `node scripts/floor-guard.mjs`, que revisa el diff respecto al último commit.

## Enforced with numbers

Política: **bloquear y avisar**. Si algo falla, la tarea no se da por terminada, no se hace commit y se le explica a Carlos qué ha fallado.

| Dimension | Rule | Checked by | Runs at |
|-----------|------|-----------|---------|
| Floor | Zero violations | `node scripts/floor-guard.mjs` | cada edición y fin de tarea |
| Types | Zero type errors | `tsc --noEmit` | cada edición y fin de tarea |
| Lint | Zero errors (typescript-eslint strict) | `eslint .` | cada edición y fin de tarea |
| Secrets | Zero findings | `secretlint "**/*"` | fin de tarea |
| Unit tests | Todos en verde | `vitest run` | fin de tarea |
| Coverage | Lines ≥ 80% y branches ≥ 80% en `src/` (excepto `src/ui/` y el punto de entrada del worklet, que cubre E2E) | `vitest run --coverage` (thresholds en `vitest.config.ts`) | fin de tarea |
| E2E | Todos los flujos en verde con micrófono simulado | `playwright test` | fin de tarea, desde que exista (T18 lo amplía) |
| Accessibility | Zero critical or serious (WCAG 2.1 AA) en cada pantalla | `@axe-core/playwright` dentro de los E2E | fin de tarea |
| Bundle | JS total ≤ 300 kB gzip | `size-limit` | fin de tarea |
| Performance | LCP ≤ 2500 ms y CLS ≤ 0.1 (móvil emulado) | `lighthouse` contra `vite preview` | fin de tarea |
| Dependencies | Nothing at high or above | `npm audit --audit-level=high` | fin de tarea y al añadir dependencias |

Todo junto se ejecuta con **`npm run check`**. Los scripts de `package.json` reflejan esta tabla; si no coinciden, manda este archivo.

**Tiempo:** no hay límite. Si `npm run check` tarda **más de 90 s**, se avisa a Carlos con el tiempo y el paso más lento, pero no se quita ni se salta ninguna comprobación.

### Por qué estos números
- **80 % de cobertura**: obliga a probar cada función con lógica, pero deja sin probar una línea de configuración.
  La UI se excluye porque la cubren los E2E en un navegador real.
- **Accesibilidad sin fallos graves**: los alumnos usan móviles y tablets diversos, y el contraste también importa en el proyector.
- **300 kB gzip**: debe cargar rápido con el wifi del instituto o con datos móviles. VexFlow ocupa unos 150–200 kB y deja margen para el resto.
- **LCP ≤ 2,5 s y CLS ≤ 0,1**: umbrales "buenos" de Core Web Vitals.
- **Dependencias sin fallos altos**: por debajo de "alto" suele ser ruido.

### Comprobaciones externas (no las escribe el propio proyecto)
axe-core (WCAG), Lighthouse (navegador real) y `npm audit` (base de datos de vulnerabilidades). Contrastan con criterios ajenos lo que los tests propios no pueden.

## Lo que ningún test automático garantiza

El micrófono real, la latencia de cada dispositivo y el ruido de un aula no se pueden simular del todo.
Los tests usan palmas sintéticas y un micro simulado. Por eso los **checkpoints del plan incluyen pruebas manuales de Carlos**
en PC, Android, iPhone y aula, y una tarea no cuenta como validada del todo hasta pasarlas.

## Measured, not yet enforced

| Metric | Today | Direction |
|--------|-------|-----------|
| Precisión del detector con grabaciones reales | sin grabaciones todavía | se fijará cuando haya grabaciones (objetivo del SPEC: ≥ 95 %, ≤ 20 ms, ≤ 5 % falsos positivos) |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|

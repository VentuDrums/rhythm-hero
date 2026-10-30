# Tareas: Rhythm Hero

Comandos de referencia: `npm test`, `npm run lint`, `npm run build`, `npm run dev`, `npm run test:e2e` y `npm run check` (todo junto).
Cada tarea (a partir de T1b) termina con `npm run check` en verde (ver `CONSTRAINTS.md`) y un commit.

---

## Fase 1: Base y riesgo técnico

### Task 1: Andamiaje del proyecto

**Description:** Inicializar git y un proyecto Vite + TypeScript estricto con Vitest y ESLint. Pantalla de inicio "Rhythm Hero" con un selector ES/EN mínimo
que ya lee los textos de `i18n/es.json` y `i18n/en.json`.

**Acceptance criteria:**
- [x] `npm run dev` muestra la portada de Rhythm Hero y el botón de idioma cambia el texto sin recargar
- [x] `npm test`, `npm run lint` y `npm run build` funcionan (con al menos un test de i18n)
- [x] Repositorio git con `.gitignore` (node_modules, dist)

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: abrir `http://localhost:5173` y cambiar de idioma

**Dependencies:** None

**Files likely touched:** `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `index.html`, `src/main.ts`, `src/i18n/*`

**Estimated scope:** M

### Task 1b: Comprobaciones de calidad (`npm run check`)

**Description:** Instalar y conectar todo lo que exige `CONSTRAINTS.md`: `scripts/floor-guard.mjs` (adaptado de la referencia de la skill, con base `HEAD`),
secretlint, umbrales de cobertura en `vitest.config.ts`, Playwright con un E2E de la portada que incluye axe, size-limit,
Lighthouse contra `vite preview` y `npm audit`. Un único `npm run check` lo ejecuta todo y muestra cuánto tarda.

**Acceptance criteria:**
- [x] `npm run check` pasa en verde con el proyecto de T1 y muestra el tiempo total
- [x] Cada fila de la tabla de `CONSTRAINTS.md` tiene su comando funcionando
- [x] Prueba de fuego: un `@ts-ignore` o un `.skip` introducido a propósito hace fallar `floor-guard` (luego se retira)

**Verification:**
- [x] `npm run check`

**Dependencies:** T1

**Files likely touched:** `package.json`, `scripts/floor-guard.mjs`, `vitest.config.ts`, `playwright.config.ts`, `e2e/home.spec.ts`, `.size-limit.json`, `.secretlintrc.json`

**Estimated scope:** M

### Task 2: Modelo rítmico

**Description:** Tipos de figuras y silencios (con puntillo), compases (2/4, 3/4, 4/4, 6/8), duración en pulsos,
conversión de un ejercicio a instantes de golpe (`hitTimes`) y validación de que cada compás suma lo que debe.

**Acceptance criteria:**
- [x] `hitTimes` da los instantes correctos para negras, corcheas, puntillo y silencios en todos los compases
- [x] La validación detecta compases incompletos o que se pasan
- [x] El pulso de 6/8 está definido (negra con puntillo) y testeado

**Verification:**
- [x] Tests pass: `npm test -- rhythm`

**Dependencies:** T1b

**Files likely touched:** `src/rhythm/types.ts`, `src/rhythm/timeline.ts`, `src/rhythm/validate.ts`, `tests/unit/rhythm.test.ts`

**Estimated scope:** S

### Task 3: Detector de golpes (función pura)

**Description:** `detectOnsets(samples, sampleRate, options)` devuelve los instantes de los golpes.
Usa una envolvente de energía, un umbral adaptativo y un periodo refractario. Incluye un generador de palmas sintéticas
(ráfagas de ruido) para los tests, con ruido de fondo y clics de metrónomo.

**Acceptance criteria:**
- [x] Con palmas sintéticas a tiempos conocidos: ≥ 95 % detectadas con error ≤ 20 ms
- [x] ≤ 5 % de falsos positivos con ruido de fondo moderado
- [x] Una palmada larga o con eco no se cuenta dos veces (refractario)

**Verification:**
- [x] Tests pass: `npm test -- audio`

**Dependencies:** T1b

**Files likely touched:** `src/audio/onsets.ts`, `tests/unit/onsets.test.ts`, `tests/helpers/synthClaps.ts`

**Estimated scope:** S

### Task 4: Probador de micro en vivo con turnos (claves → silencio)

**Description:** Pantalla que pide el micro al pulsar un botón y ejecuta el detector en un AudioWorklet.
Aplica la regla de turnos: suena 1 compás de claves, la app calla y el alumno toca con un pulso visual mientras se dibuja cada golpe detectado.
Incluye el sintetizador de claves y woodblock y `listenWindow`, que calcula cuándo cuentan los golpes y descarta los que caen fuera o en los 150 ms posteriores a un sonido propio.

**Acceptance criteria:**
- [ ] En PC y móvil aparecen los golpes en tiempo real al dar palmas o golpear la mesa durante el turno del alumno
- [x] Ninguna clave ni woodblock de la app aparece como golpe, ni siquiera con el volumen alto (test con `listenWindow` y prueba manual)
  - 2026-10-28: el contador ya las ignoraba; el cuadrado verde se encendía con las claves y ahora tampoco
- [x] Si se deniega el micro aparece un mensaje claro (ES/EN)

**Verification:**
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Carlos prueba en PC y móvil, con palmas, con mesa y con el altavoz alto
  - Resultado (2026-10-28): palmas bien en PC y móvil. Mesa en móvil/tablet: medio bien, a veces falla.
    Mesa con Shure SM58 en el PC: detección errática (probables vibraciones del soporte). Falta probar el altavoz alto.

**Dependencies:** T3

**Files likely touched:** `src/audio/mic.ts`, `src/audio/onset-worklet.ts`, `src/audio/synth.ts`, `src/audio/listenWindow.ts`, `src/ui/micTester.ts`

**Estimated scope:** M

## Checkpoint 1: la detección funciona de verdad
- [ ] Todos los tests en verde y build limpio
- [ ] Prueba manual de Carlos en PC y móvil superada
- [ ] Ajuste de umbrales si hace falta, y revisión antes de seguir
  - Golpes en mesa: se mejorarán en T8 (calibración por dispositivo) y con grabaciones reales (SPEC, pregunta abierta 1).

---

## Fase 2: Primer modo jugable (leer y tocar)

### Task 5: Puntuación

**Description:** `scoreRun(expectedTimes, hitTimes, windows)` empareja cada golpe con su figura y clasifica el resultado:
perfecto, bien (adelantado o atrasado) o fallo. Cuenta los golpes sobrantes, incluidos los que caen en silencios, y calcula el %, las estrellas y si el nivel está superado.

**Acceptance criteria:**
- [x] Cada figura recibe exactamente una clasificación. Un golpe no puede valer para dos figuras
- [x] Los golpes sobrantes y los que caen en silencio restan según la regla del SPEC
- [x] Las ventanas (75/150 ms desde el 2026-10-30; antes 50/100) y el umbral de superación (70 %) son configurables

**Verification:**
- [x] Tests pass: `npm test -- scoring`

**Dependencies:** T2

**Files likely touched:** `src/scoring/score.ts`, `tests/unit/score.test.ts`

**Estimated scope:** S

**Decisión:** estrellas con 70 % (1), 85 % (2) y 95 % (3). Un golpe sobrante resta medio punto, lo mismo que vale un "bien".

### Task 6: Notación con VexFlow

**Description:** Dibujar un ejercicio (rhythm/) como pentagrama de una línea con figuras, silencios, compás, barras de compás y barrado de corcheas.
Debe permitir colorear una figura concreta (feedback).

**Acceptance criteria:**
- [x] Cualquier ejercicio válido se dibuja con la notación correcta
- [x] Se puede marcar la figura n como perfecto, bien o fallo (color)
- [x] Legible en móvil vertical y horizontal

**Verification:**
- [x] Tests pass: `npm test -- notation` (genera el SVG en jsdom sin errores, número de figuras correcto)
- [ ] Manual check: página de muestra con todos los tipos de figura

**Dependencies:** T2

**Files likely touched:** `package.json` (vexflow), `src/notation/render.ts`, `src/ui/notationPreview.ts`, `tests/unit/notation.test.ts`

**Estimated scope:** M

### Task 7: Leer y tocar jugable con un nivel fijo

**Description:** Primer modo completo. Cuenta previa de 1 compás de claves y después silencio con pulso visual. Partitura que se desplaza hacia la línea de golpeo,
feedback en vivo por figura y pantalla de resumen. Usa un nivel fijo de negras en 4/4.

**Acceptance criteria:**
- [x] Se puede jugar de principio a fin y el resumen muestra %, desglose y estrellas
- [x] El desplazamiento está sincronizado con el reloj de audio (sin deriva en 16 compases)
- [x] Se puede abandonar a mitad y volver al menú sin que quede el micro abierto

**Verification:**
- [x] Tests pass: `npm test` (tests del controlador de partida con reloj y golpes simulados)
- [ ] Manual check: jugar el nivel en PC y móvil

**Dependencies:** T4, T5, T6

**Files likely touched:** `src/modes/readAndPlay.ts`, `src/ui/gameScreen.ts`, `src/ui/summary.ts`, `tests/unit/readAndPlay.test.ts`

**Estimated scope:** M

### Task 8: Calibración de latencia

**Description:** Asistente: 1 compás de claves y 8 palmas en silencio a ese tempo con pulso visual. Cálculo del desfase medio (ignorando valores atípicos)
y guardado por dispositivo. Leer y tocar la descuenta. Se puede repetir desde ajustes.

**Acceptance criteria:**
- [x] La latencia calculada es la mediana de las diferencias, descartando valores atípicos
- [x] Se guarda en `localStorage` y se aplica en la partida
- [x] Si la dispersión es muy alta, se pide repetir la calibración

**Verification:**
- [x] Tests pass: `npm test -- calibration`
- [ ] Manual check: tras calibrar, el nivel de negras a 80 BPM da ≥ 90 % de "perfecto" tocando bien

**Dependencies:** T7

**Files likely touched:** `src/audio/calibration.ts`, `src/storage/settings.ts`, `src/ui/calibrationScreen.ts`, `tests/unit/calibration.test.ts`

**Estimated scope:** M

## Checkpoint 2: se puede jugar un nivel completo
- [x] Tests en verde y build limpio
- [ ] Criterio 3 del SPEC comprobado en PC y móvil
- [x] Revisión con Carlos (2026-10-30: "Todo bien por ahora")

---

## Fase 3: Contenido y progreso

### Task 9: Niveles base y selector de niveles

**Description:** Escribir 10–15 niveles base en JSON en orden progresivo (redonda a corcheas y sus silencios, en 2/4, 3/4 y 4/4)
y una pantalla para elegir nivel. Los niveles bloqueados se ven pero no se pueden abrir.

**Acceptance criteria:**
- [x] Todos los niveles pasan la validación del modelo rítmico (test)
- [x] Todos se dibujan sin errores
- [x] El selector abre el nivel elegido en leer y tocar

**Verification:**
- [x] Tests pass: `npm test -- levels`
- [ ] Manual check: recorrer los niveles

**Dependencies:** T7

**Files likely touched:** `src/levels/base.json`, `src/levels/index.ts`, `src/ui/levelSelect.ts`, `tests/unit/levels.test.ts`

**Estimated scope:** M

### Task 10: Progreso, récords y estrellas

**Description:** Guardar en el dispositivo los niveles superados, el mejor % y las estrellas, y desbloquear el siguiente nivel.
El almacenamiento debe tolerar que `localStorage` falle o tenga datos corruptos.

**Acceptance criteria:**
- [x] El progreso se conserva al cerrar y abrir el navegador
- [x] Superar un nivel desbloquea el siguiente
- [x] Si `localStorage` falla o tiene datos corruptos, el juego arranca igualmente

**Verification:**
- [x] Tests pass: `npm test -- storage`

**Dependencies:** T9

**Files likely touched:** `src/storage/progress.ts`, `src/ui/levelSelect.ts`, `src/ui/summary.ts`, `tests/unit/progress.test.ts`

**Estimated scope:** S

### Task 11: Interfaz bilingüe completa

**Description:** Revisar que todos los textos estén en `i18n` en ES y EN, guardar el idioma elegido
y añadir un test que falle si falta alguna clave en un idioma.

**Acceptance criteria:**
- [x] No queda ningún texto visible escrito directamente en el código
- [x] `es.json` y `en.json` tienen exactamente las mismas claves (test)
- [x] El idioma elegido se recuerda

**Verification:**
- [x] Tests pass: `npm test -- i18n`
- [ ] Manual check: recorrer todas las pantallas en inglés

**Dependencies:** T10

**Files likely touched:** `src/i18n/*`, `src/ui/*`, `tests/unit/i18n.test.ts`

**Estimated scope:** S

---

## Fase 4: Eco y dictado

### Task 12: Eco compás a compás

**Description:** Tras 1 compás de claves, el juego toca un compás con woodblock y el jugador lo repite en el compás siguiente, en silencio y con pulso visual.
Se alterna hasta el final. La partitura se muestra al terminar (o como ayuda opcional). Se puntúa con `scoring/`.

**Acceptance criteria:**
- [ ] Alterna compás de ejemplo (suena, el micro no cuenta) y compás de respuesta (silencio, el micro cuenta) sin perder el tempo
- [ ] El woodblock del ejemplo nunca se cuenta como golpe del jugador
- [ ] Resumen con la misma puntuación que leer y tocar

**Verification:**
- [ ] Tests pass: `npm test -- echo`
- [ ] Manual check: jugar con altavoz y con auriculares

**Dependencies:** T8, T9

**Files likely touched:** `src/modes/echo.ts`, `src/ui/echoScreen.ts`, `tests/unit/echo.test.ts`

**Estimated scope:** M

### Task 13: Eco frase completa

**Description:** Variante en la que se oye una frase de 2–4 compases y después se repite entera. Se elige en el menú del modo eco.

**Acceptance criteria:**
- [ ] El menú permite elegir entre compás a compás y frase completa
- [ ] La frase de ejemplo y la de respuesta tienen la misma longitud y la puntuación es correcta

**Verification:**
- [ ] Tests pass: `npm test -- echo`

**Dependencies:** T12

**Files likely touched:** `src/modes/echo.ts`, `src/ui/echoScreen.ts`, `tests/unit/echo.test.ts`

**Estimated scope:** S

### Task 14: Dictado rítmico de 4 opciones

**Description:** Suena un ritmo una sola vez con woodblock y el jugador elige entre 4 opciones escritas.
Las opciones incorrectas se generan parecidas a la correcta (cambiando una o dos figuras) y siempre son ritmos válidos y distintos entre sí. No usa el micrófono.

**Acceptance criteria:**
- [ ] Siempre hay 4 opciones válidas, distintas entre sí, y exactamente una correcta
- [ ] El ritmo no se puede volver a escuchar
- [ ] Se muestra la respuesta correcta y la puntuación de la ronda

**Verification:**
- [ ] Tests pass: `npm test -- dictation` (generador de opciones con semilla fija)
- [ ] Manual check: jugar una ronda

**Dependencies:** T6, T9

**Files likely touched:** `src/modes/dictation.ts`, `src/ui/dictationScreen.ts`, `tests/unit/dictation.test.ts`

**Estimated scope:** M

## Checkpoint 3: los tres modos jugables desde el menú
- [ ] Tests en verde y build limpio
- [ ] Criterio 4 del SPEC comprobado
- [ ] Revisión con Carlos

---

## Fase 5: Profesor y aula

### Task 15: Editor de ejercicios

**Description:** Pantalla para crear un ejercicio: compás, tempo, número de compases, cuenta previa y figuras.
Admite también semicorcheas, puntillo, síncopa y 6/8. Vista previa en partitura y prueba con woodblock. Impide guardar compases incompletos.

**Acceptance criteria:**
- [ ] Se puede componer cualquier ejercicio admitido por el SPEC y oírlo
- [ ] No se puede guardar un ejercicio inválido, y el error indica qué compás falla
- [ ] Usable en tablet con el dedo

**Verification:**
- [ ] Tests pass: `npm test -- editor`
- [ ] Manual check: crear un ejercicio en 6/8 con puntillo

**Dependencies:** T6, T9

**Files likely touched:** `src/editor/editorState.ts`, `src/ui/editorScreen.ts`, `tests/unit/editor.test.ts`

**Estimated scope:** M

### Task 16: Compartir por enlace y JSON, y lista "Mis ejercicios"

**Description:** Codificar el ejercicio en el enlace (`#e=...`), exportarlo e importarlo como `.json`
y guardar los ejercicios propios en el dispositivo. Al abrir un enlace, el ejercicio se carga listo para jugar en cualquier modo.

**Acceptance criteria:**
- [ ] Ida y vuelta del enlace sin pérdidas (test). Un enlace corrupto muestra un error y no rompe el juego
- [ ] Exportar e importar JSON produce el mismo ejercicio
- [ ] Lista "Mis ejercicios" con jugar, editar, compartir y borrar

**Verification:**
- [ ] Tests pass: `npm test -- share`
- [ ] Manual check: crear en PC y abrir el enlace en el móvil (criterio 6)

**Dependencies:** T15

**Files likely touched:** `src/editor/share.ts`, `src/storage/exercises.ts`, `src/ui/myExercises.ts`, `tests/unit/share.test.ts`

**Estimated scope:** M

### Task 17: Modo clase

**Description:** Interruptor de modo clase: figuras grandes y alto contraste para el proyector, parámetros del detector para grupo
(refractario de unos 120 ms y agrupación de golpes) y sin guardar récords.

**Acceptance criteria:**
- [ ] Palmas sintéticas de 25 "alumnos" desfasadas ±30 ms cuentan como un solo golpe (test)
- [ ] La interfaz se lee bien proyectada (revisión manual)
- [ ] El modo clase no altera el progreso individual

**Verification:**
- [ ] Tests pass: `npm test -- classroom`
- [ ] Manual check: prueba en el aula con el proyector

**Dependencies:** T7, T10

**Files likely touched:** `src/audio/onsets.ts` (opciones de grupo), `src/ui/theme.css`, `src/ui/settings.ts`, `tests/unit/classroom.test.ts`

**Estimated scope:** M

## Checkpoint 4: prueba en el aula
- [ ] Tests en verde y build limpio
- [ ] Carlos lo prueba en clase con el proyector (criterio 7)

---

## Fase 6: Calidad y publicación

### Task 18: Test E2E con micrófono simulado

**Description:** Playwright con Chromium y micro simulado a partir de un WAV de palmas a tiempo.
Prueba de humo: portada → nivel 1 → tocar → resumen con puntuación alta. Comprueba también que no hay peticiones de red con audio.

**Acceptance criteria:**
- [ ] `npm run test:e2e` completa un nivel con el WAV y obtiene ≥ 90 %
- [ ] No se envía audio fuera del dispositivo (criterio 10)

**Verification:**
- [ ] Tests pass: `npm run test:e2e`

**Dependencies:** T10

**Files likely touched:** `playwright.config.ts`, `e2e/play-level.spec.ts`, `e2e/fixtures/claps-80bpm.wav`, `package.json`

**Estimated scope:** M

### Task 19: Publicación en GitHub Pages (preguntando antes)

**Description:** Configurar `base` de Vite y un workflow de GitHub Actions que construya y publique en GitHub Pages.
**Requiere la confirmación de Carlos** y una cuenta de GitHub. Repasar la checklist del SPEC con `/ship`.

**Acceptance criteria:**
- [ ] El enlace público abre el juego en PC, Android e iPhone
- [ ] Los enlaces de ejercicios funcionan con la URL pública

**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: abrir la URL pública en los tres tipos de dispositivo

**Dependencies:** T18

**Files likely touched:** `vite.config.ts`, `.github/workflows/deploy.yml`, `README.md`

**Estimated scope:** S

## Checkpoint final
- [ ] Los 10 criterios de éxito del SPEC comprobados (el 2, con grabaciones reales cuando estén)
- [ ] Revisión final con `/review` y `/ship`

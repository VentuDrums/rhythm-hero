# Spec: Rhythm Hero, juego de lenguaje musical rítmico

## Objetivo

Un juego web, al estilo Guitar Hero, en el que el alumnado aprende lenguaje musical
rítmico tocando con **palmas o golpes en la mesa**. El micrófono del dispositivo
detecta cada golpe y el juego lo compara con el ritmo escrito en **notación musical real**.

**Usuarios**
- **Alumnado de ESO** que practica solo en casa (móvil, tablet u ordenador).
- **Profesor** que lo proyecta en clase para que todo el grupo toque a la vez con un solo micrófono.
  También crea sus propios ejercicios.

**Modos de juego** (se eligen en el menú):
1. **Leer y tocar**: las figuras avanzan por un pentagrama de una línea y se toca cuando cruzan la línea de golpeo.
2. **Escuchar e imitar (eco)**: el juego toca un ritmo con woodblock y el jugador lo repite. Se puede repetir compás a compás o la frase completa.
3. **Dictado rítmico**: el ritmo suena una vez y el jugador elige cuál es entre 4 opciones escritas. Este modo no usa el micrófono.

**Interfaz bilingüe** español/inglés (programa BRIT), con selector en pantalla.

### Historias de usuario
- Como alumno, elijo un nivel, toco el ritmo con palmas y veo en cada figura si he ido a tiempo, adelantado o atrasado. Al final recibo una puntuación.
- Como alumno, mi progreso (niveles superados y récords) se guarda en mi dispositivo.
- Como profesor, activo el **modo clase**: interfaz grande para proyector, detección pensada para un grupo y sin récords.
- Como profesor, creo un ejercicio eligiendo compás, tempo y figuras. Se lo paso a mis alumnos con un **enlace** o un **archivo**, sin cuentas ni servidor.
- Como cualquier usuario, la primera vez calibro el micrófono y la latencia con unas palmas guiadas.

## Contenido musical

- **Niveles base (incluidos)**: redonda, blanca, negra, corcheas y sus silencios, en 2/4, 3/4 y 4/4.
  Progresión de unos 10–15 niveles.
- **Editor del profesor**: además de lo anterior, semicorcheas, puntillo (blanca y negra con puntillo),
  síncopa sencilla y compás de 6/8.
- Cada ejercicio se compone de compás, tempo (40–160 BPM), número de compases, secuencia de figuras y silencios,
  y compases de cuenta previa.
- Los silencios **no se tocan**. Un golpe dentro de un silencio cuenta como error.

## Mecánica y puntuación

- **Regla de turnos: la app y el alumno nunca suenan a la vez.** Primero la app toca y el micrófono no escucha.
  Después el alumno toca, la app calla y el micrófono escucha.
  - Cuenta previa de 1 compás con **claves** (sonido distinto del woodblock).
  - Durante el turno del alumno el pulso solo se ve: una luz o barra que late al tempo y la partitura que avanza. No suena nada.
  - Opción "uso auriculares": mantiene el metrónomo de claves audible durante el turno del alumno. Desactivada por defecto.
- Ventanas de acierto, configurables y con estos valores por defecto:
  - **Perfecto**: |error| ≤ 50 ms
  - **Bien**: |error| ≤ 100 ms
  - **Fallo**: fuera de ±100 ms o figura sin tocar
  - **Golpe sobrante**: golpe que no corresponde a ninguna figura (resta puntos)
- Feedback por figura: color y etiqueta (perfecto, bien, adelantado, atrasado o fallo).
- Resumen final: % de precisión, desglose y estrellas (1–3). Un nivel se supera con ≥ 70 % (configurable).
- **Calibración**: suena 1 compás de claves y el usuario sigue dando 8 palmas a ese tempo, en silencio y con el pulso visual.
  Es la misma situación que en el juego. Se mide el desfase medio (salida de audio, entrada de micro, detección y forma de tocar)
  y se descuenta. Se guarda por dispositivo.

## Detección de golpes (núcleo técnico)

- Micrófono con `getUserMedia`. Se pide permiso solo al entrar en un modo que lo necesita.
- Detección de *onsets* basada en energía (envolvente RMS o flujo espectral) con umbral adaptativo
  y **periodo refractario** (por defecto 80 ms, para que una palmada no cuente dos veces).
- El análisis se hace en un `AudioWorklet`. Los tiempos se toman de `AudioContext.currentTime`, nunca de `Date.now()`.
- **Modo clase**: periodo refractario mayor (unos 120 ms) y agrupación de golpes cercanos,
  para que 25 palmas algo desfasadas cuenten como un solo golpe colectivo.
- **Ventana de escucha** (evita que el micro oiga a la propia app): el micrófono se abre una sola vez al empezar la partida
  para no retrasar nada, pero los golpes solo cuentan dentro del turno del alumno.
  La ventana se abre poco antes de la primera figura (≥ 100 ms, para aceptar golpes adelantados) y se cierra tras la última.
  Como refuerzo, se ignoran los *onsets* en los 150 ms siguientes a cualquier sonido de la app.
- El micro se pide **sin procesado del navegador** (`echoCancellation`, `noiseSuppression` y `autoGainControl` desactivados): ese procesado puede apagar o deformar las palmadas, y con la regla de turnos la cancelación de eco no hace falta.
- El detector es una **función pura** (muestras → lista de tiempos) para poder probarla con grabaciones reales de palmas y mesa.

## Tech Stack

| Pieza | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript (estricto) | Tipos para el modelo rítmico y los tiempos |
| Build/dev | Vite | Sencillo, genera una web estática |
| UI | TypeScript sin framework, con DOM y SVG/Canvas | Juego pequeño. Se evita una dependencia pesada |
| Notación | VexFlow 5 (fuente Gonville, 22 kB) | Dibuja figuras, silencios, barrados y compases correctamente |
| Audio | Web Audio API + AudioWorklet | Baja latencia y reloj preciso |
| Tests | Vitest (unitarios), Playwright (e2e) | Playwright simula el micro con un WAV de palmas |
| Persistencia | `localStorage` | Sin servidor ni cuentas, así que no hay datos personales de menores |
| Hosting | GitHub Pages (u otro hosting estático gratuito) | Un enlace público, sin coste |

## Commands

```
Instalar:   npm install
Desarrollo: npm run dev          # http://localhost:5173
Tests:      npm test             # vitest run
Cobertura:  npm test -- --coverage
E2E:        npm run test:e2e     # playwright test
Lint:       npm run lint         # eslint . && tsc --noEmit
Build:      npm run build        # genera dist/ estático
```

## Project Structure

```
SPEC.md                 → Esta especificación
src/
  main.ts               → Arranque y enrutado entre pantallas
  audio/                → Micrófono, AudioWorklet, detector de onsets, metrónomo, síntesis de ejemplos
  rhythm/               → Modelo rítmico: figuras, compases, conversión a tiempos, validación
  scoring/              → Comparación golpes ↔ figuras, ventanas, puntuación
  notation/             → Dibujo con VexFlow y animación de desplazamiento
  modes/                → leer-y-tocar, eco, dictado
  editor/               → Editor del profesor; codificar/decodificar enlace y JSON
  levels/               → Niveles base (JSON)
  i18n/                 → es.json, en.json
  storage/              → Progreso, calibración y ejercicios propios en localStorage
  ui/                   → Pantallas, componentes y estilos (incluye modo clase/proyector)
tests/
  fixtures/audio/       → Grabaciones WAV de palmas y mesa con sus tiempos anotados
  unit/                 → Tests unitarios por módulo
e2e/                    → Tests Playwright con micro simulado
public/                 → Iconos y sonidos de metrónomo
```

## Code Style

- TypeScript estricto, sin `any`. Funciones puras para la lógica (ritmo, puntuación, detección). El estado del juego queda aislado en `modes/`.
- Código e identificadores en **inglés**. Textos de usuario **siempre** en `i18n/`, nunca escritos a mano en el código.
- Tiempos en **segundos (number)**, con el nombre de la variable indicando la unidad cuando no sea obvio (`toleranceMs`).

```ts
// rhythm/timeline.ts
export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface RhythmEvent {
  duration: Duration;
  dotted?: boolean;
  rest?: boolean;
}

/** Devuelve el instante (s) de cada figura que hay que tocar. Los silencios no generan golpe. */
export function hitTimes(events: RhythmEvent[], bpm: number, startTime: number): number[] {
  const beat = 60 / bpm;
  const times: number[] = [];
  let t = startTime;
  for (const e of events) {
    if (!e.rest) times.push(t);
    t += beats(e) * beat;
  }
  return times;
}
```

## Testing Strategy

- **Unitarios (Vitest)**, la mayor parte:
  - `rhythm/`: conversión figuras → tiempos en todos los compases y con puntillo, y validación de que un compás suma lo que debe.
  - `scoring/`: emparejamiento de golpes con figuras, ventanas, golpes sobrantes y silencios.
  - `audio/` detector: primero con palmas sintéticas generadas en el test y, cuando lleguen, con **grabaciones reales** (palmas, mesa, ruido de clase, metrónomo de fondo) cuyos tiempos están anotados a mano.
    Criterio: ≥ 95 % de golpes detectados con error ≤ 20 ms y ≤ 5 % de falsos positivos.
  - `editor/`: un ejercicio codificado en enlace se decodifica idéntico (ida y vuelta).
- **E2E (Playwright)**: Chromium con micro simulado (`--use-file-for-fake-audio-capture`). Se completa un nivel con palmas grabadas y se comprueba la puntuación.
- **Manual**: prueba real en móvil Android, iPhone (Safari) y en aula con proyector antes de publicar.
- Cobertura objetivo ≥ 80 % en `rhythm/`, `scoring/` y `audio/`. Se fijará en `CONSTRAINTS.md` con `/constraints`.

## Boundaries

- **Siempre**: ejecutar tests y lint antes de cada commit. Textos en i18n en ambos idiomas.
  Probar el detector con grabaciones reales al tocar `audio/`. Pedir el permiso de micro solo cuando haga falta.
- **Preguntar antes**: añadir dependencias (aparte de Vite, VexFlow, Vitest, Playwright y ESLint). Cambiar ventanas de acierto
  o criterios de superación. Añadir cualquier servidor, analítica o recogida de datos. Publicar o desplegar.
- **Nunca**: enviar audio del micrófono fuera del dispositivo (todo se procesa en local). Grabar o guardar el audio del usuario.
  Pedir datos personales. Borrar o saltarse tests que fallan para pasar a verde.

## Success Criteria

1. Abre desde un enlace en Chrome/Edge/Firefox de escritorio, Chrome Android y Safari iOS sin instalar nada.
2. Detecta palmas y golpes en mesa con el criterio de precisión del detector (≥ 95 %, ≤ 20 ms y ≤ 5 % de falsos positivos) en las grabaciones de prueba.
3. Tras calibrar, un usuario que toca bien un nivel 4/4 de negras a 80 BPM obtiene ≥ 90 % de "perfecto".
4. Los tres modos son jugables de principio a fin y el usuario puede elegir entre ellos.
5. Todos los niveles base se muestran con notación correcta (figuras, silencios, barras de compás y barrado de corcheas).
6. El profesor crea un ejercicio, genera un enlace y, al abrirlo en otro dispositivo, aparece el mismo ejercicio.
7. El modo clase es legible desde el fondo del aula (figuras grandes y alto contraste) y cuenta las palmas de un grupo como golpes únicos.
8. Toda la interfaz cambia entre español e inglés sin recargar.
9. El progreso y la calibración se conservan al cerrar y volver a abrir el navegador.
10. Ningún audio sale del dispositivo (verificable en las peticiones de red).

## Decisiones tomadas

1. **Nombre**: el juego se llama **Rhythm Hero** (antes "Pulso"). No se usará "Guitar Hero" ni su logotipo o estética de marca.
2. **Dictado**: 4 opciones por pregunta. El ritmo suena una sola vez y no se puede repetir.
3. **Eco**: hay dos variantes que se eligen en el menú. En **compás a compás** el juego toca un compás y el jugador lo repite en el siguiente. En **frase completa** el juego toca una frase de 2–4 compases y el jugador la repite entera.
4. **Sonido de los ejemplos**: woodblock sintetizado con Web Audio, sin archivos. El metrónomo usa un clic distinto para no confundirse con el ejemplo.

## Open Questions

1. **Grabaciones de prueba** (más adelante): el profesor grabará clips de palmas y golpes en mesa, solo y con la clase.
   Hasta entonces el detector se prueba con palmas sintéticas generadas en los tests y con clips de dominio público.
   El criterio de éxito 2 se valida definitivamente cuando lleguen las grabaciones reales.
2. Si más adelante quieres que el profesor vea los resultados de sus alumnos, hará falta servidor y cuentas (RGPD). Queda **fuera de esta versión**.
3. **Hardware propio** (idea en el aire, futuro): un dispositivo físico para tocar los ritmos conectado a la app.
   No afecta a esta versión. Si llega, el detector debería aceptar golpes de otra fuente además del micrófono.

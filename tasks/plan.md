# Plan de implementación: Rhythm Hero

## Resumen

Rhythm Hero es un juego web estático (Vite + TypeScript) para practicar lenguaje musical rítmico con palmas o golpes en la mesa.
El micrófono detecta los golpes y el juego los compara con un ritmo escrito en notación real.
Tiene tres modos (leer y tocar, eco, dictado), un modo clase para proyector, un editor del profesor con enlaces para compartir
y una interfaz bilingüe ES/EN. Fuente de verdad: [SPEC.md](../SPEC.md).

## Decisiones de arquitectura

- **Lo más arriesgado va primero.** La detección de palmas por micrófono y la latencia en móvil son lo que puede hundir el proyecto.
  Se construyen y se prueban en dispositivos reales (fase 1) antes de invertir en notación, niveles o modos.
- **Lógica pura, audio y DOM separados.** `rhythm/`, `scoring/` y el detector son funciones puras con tests unitarios.
  El AudioWorklet y la UI solo las llaman. Así casi todo se prueba sin navegador ni micrófono.
- **Un único reloj.** Todo tiempo viene de `AudioContext.currentTime` (segundos). Los golpes y las figuras se comparan en esa misma escala, menos la latencia calibrada.
- **Sin framework de UI.** Las pantallas son módulos TS que montan y desmontan DOM, y la notación es SVG de VexFlow.
  Si la UI crece demasiado, se replanteará (preguntando antes).
- **Sin servidor.** Progreso, calibración y ejercicios propios van en `localStorage`. Los ejercicios se comparten codificados en el enlace (`#e=...`) o como archivo JSON.
- **Turnos: la app y el alumno nunca suenan a la vez** (idea de Carlos). Hay 1 compás de cuenta con claves y/o el ejemplo con woodblock.
  Después, silencio con pulso visual mientras el alumno toca. El detector solo cuenta golpes dentro de esa "ventana de escucha".
  Un único módulo (`audio/listenWindow.ts`) calcula las ventanas a partir del ejercicio, y lo usan todos los modos.
- **Woodblock y claves sintetizados** con Web Audio (ruido filtrado + envolvente corta). No hay archivos de audio que descargar.
- **Fase 1 vertical.** La primera pantalla útil es un "probador de micro": muestra cada palmada detectada sobre un metrónomo.
  Sirve como test manual del detector en cualquier dispositivo y, más tarde, como base de la calibración.

## Grafo de dependencias

```
Andamiaje (Vite, TS, Vitest, ESLint, i18n mínimo)
   │
   ├── rhythm/ (modelo, tiempos, validación) ───────────────┐
   │                                                        │
   ├── audio/ detector puro ── probador de micro (worklet) ─┤
   │                                │                       │
   │                          calibración                   │
   │                                │                       │
   │        scoring/ ───────────────┼───────────────────────┤
   │                                │                       │
   │        notation/ (VexFlow) ────┤                       │
   │                                ▼                       │
   │                    Leer y tocar (primer modo jugable)  │
   │                                │                       │
   │            ┌───────────────────┼─────────────┐         │
   │       niveles+progreso      eco (2 var.)   dictado ────┘
   │            │
   │       editor ── compartir (enlace/JSON)
   │
   └── modo clase (usa detector + leer y tocar)
              │
        E2E + publicación
```

## Lista de tareas

Las tareas con todo el detalle están en [todo.md](todo.md).

### Fase 1: Base y riesgo técnico
- [ ] T1: Andamiaje del proyecto
- [ ] T1b: Comprobaciones de calidad (`npm run check`)
- [ ] T2: Modelo rítmico
- [ ] T3: Detector de golpes (función pura)
- [ ] T4: Probador de micro en vivo con metrónomo y woodblock

### Checkpoint 1: la detección funciona de verdad
- [ ] Tests y build en verde
- [ ] **Carlos prueba el probador de micro** en PC y en móvil, con palmas y con mesa
- [ ] Revisión antes de seguir

### Fase 2: Primer modo jugable (leer y tocar)
- [ ] T5: Puntuación
- [ ] T6: Notación con VexFlow
- [ ] T7: Leer y tocar jugable con un nivel fijo
- [ ] T8: Calibración de latencia

### Checkpoint 2: se puede jugar un nivel completo
- [ ] Un nivel de negras en 4/4 a 80 BPM, jugado bien tras calibrar, da ≥ 90 % de "perfecto"
- [ ] Funciona en PC y móvil

### Fase 3: Contenido y progreso
- [ ] T9: Niveles base y selector de niveles
- [ ] T10: Progreso, récords y estrellas
- [ ] T11: Interfaz bilingüe completa

### Fase 4: Eco y dictado
- [ ] T12: Eco compás a compás
- [ ] T13: Eco frase completa
- [ ] T14: Dictado rítmico de 4 opciones

### Checkpoint 3: los tres modos jugables desde el menú

### Fase 5: Profesor y aula
- [ ] T15: Editor de ejercicios
- [ ] T16: Compartir por enlace y JSON, y lista "Mis ejercicios"
- [ ] T17: Modo clase

### Checkpoint 4: prueba en el aula con proyector

### Fase 6: Calidad y publicación
- [ ] T18: Test E2E con micrófono simulado
- [ ] T19: Publicación en GitHub Pages (preguntando antes)

### Checkpoint final: los 10 criterios de éxito del SPEC

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El detector falla con ruido de aula o golpes suaves en la mesa | Alto | Umbral adaptativo y periodo refractario configurables. Probador de micro en la fase 1. Grabaciones reales cuando lleguen |
| Latencia alta o variable en móvil (sobre todo Bluetooth) | Alto | Calibración por dispositivo. Aviso de no usar auriculares Bluetooth. Ventanas de acierto configurables |
| El micro oye las claves y el woodblock del altavoz | Bajo (era Alto) | Turnos: la app calla mientras el alumno toca y solo cuentan los golpes dentro de la ventana de escucha. Refuerzo: ignorar 150 ms tras cada sonido propio y `echoCancellation` |
| Sin metrónomo audible, el alumno acelera o se retrasa | Medio | Pulso visual muy claro (luz/barra que late). Opción "uso auriculares" con claves audibles. Más adelante, aviso de "estás acelerando" en el resumen |
| Safari iOS: el AudioContext exige un toque del usuario y el micro tiene peculiaridades | Medio | Arrancar el audio siempre desde un botón. Prueba manual en iPhone en los checkpoints |
| Muchas palmas desfasadas en clase cuentan como varios golpes | Medio | Modo clase con refractario mayor y agrupación de golpes |
| VexFlow pesa y es difícil de animar | Medio | Dibujar cada compás una vez como SVG y desplazarlo con CSS transform, no redibujar en cada frame |
| Sin grabaciones reales al principio | Medio | Palmas sintéticas en tests y el probador de micro como validación manual. El criterio 2 queda pendiente hasta tener grabaciones |

## Preguntas abiertas

- Ninguna que bloquee. Las grabaciones reales se incorporan cuando Carlos las tenga (afectan a T3 y a la validación del criterio 2).
- Recomendado antes de `/build`: ejecutar `/constraints` para fijar por escrito el nivel de calidad (cobertura, lint, etc.).

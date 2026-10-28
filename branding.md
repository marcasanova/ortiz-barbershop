# Identidad visual — ORTIZ BARBERSHOP

Complementa [requisitos.md](requisitos.md). La app se abre en el móvil, de noche, desde WhatsApp. El logo es un **rótulo de neón sobre ladrillo**; la interfaz hereda esa atmósfera, no la copia pixel a pixel.

Fuente de verdad del logo: [`public/brand/logo-neon.jpg`](public/brand/logo-neon.jpg).

---

## 1. Personalidad

Ortiz no es una clínica ni un SaaS. Es una barbería de barrio vista de noche: tubo de neón, ladrillo mojado, lluvia, brillo.

| Palabra | Cómo se nota en pantalla |
|---|---|
| Nocturna | Fondo oscuro siempre. No hay modo claro en el MVP. |
| Eléctrica | Acentos en magenta, cian y lima, con halo suave. |
| Directa | Pocas palabras, botones grandes, cards por día. |
| Cercana | Tuteo, nombres de amigos, sin jerga de “plataforma”. |

Tono de copy: informal y corto. “Elige corte”, “Apúntate”, “Este nombre ya está cogido hoy”. Evitar “usuario”, “slot”, “disponibilidad horaria”.

---

## 2. Logo

Composición del rótulo:

- Arriba: dos navajas de cian cruzadas y un **barber pole** (naranja, magenta, cian).
- Centro: **ORTIZ** en magenta, condensada, mayúsculas, trazo de neón.
- Cinta: **BARBERSHOP** en blanco sobre cinta magenta.
- Laterales: tijeras lima (izq.) y máquina lima (der.).
- Abajo: adorno lima y estrella.

Uso:

- Cabecera pública y admin: el JPG completo, no recortado.
- Favicon / PWA más adelante: el pole o las navajas, no el texto entero.
- Fondo del logo: ladrillo oscuro o negro. Nunca sobre blanco plano (el neón se apaga).
- No recolorear. No poner sombra extra. No distorsionar.

Nombre en producto: **Ortiz Barbershop**. En títulos grandes, **ORTIZ** como en el rótulo.

---

## 3. Color

Paleta extraída del neón. Los tokens van a `globals.css` cuando se pinte la UI.

### Superficie (ladrillo / noche)

| Token | Hex | Uso |
|---|---|---|
| `--night` | `#0b0706` | Fondo de página |
| `--brick` | `#1c1210` | Cards, panel |
| `--brick-edge` | `#3a241c` | Bordes |
| `--mortar` | `#6a4a3a` | Solo trazos decorativos (bordes discontinuos, marcas). No llega a 4.5:1 sobre `--night`: nunca como texto |

### Neón

| Token | Hex | Uso |
|---|---|---|
| `--neon-pink` | `#ff2d8a` | Marca, CTA principal, “ORTIZ” |
| `--neon-magenta` | `#ff4fb0` | Cinta, hover del CTA |
| `--neon-cyan` | `#3ee0ff` | Navajas, foco, huecos libres |
| `--neon-orange` | `#ff8a1a` | Pole, avisos suaves |
| `--neon-lime` | `#c8ff3a` | Tijeras, adorno, éxito (“reservado”) |

### Texto

| Token | Hex | Uso |
|---|---|---|
| `--text` | `#f4f0ea` | Cuerpo |
| `--text-dim` | `#c4b4a8` | Ayuda, horas ocupadas |
| `--on-neon` | `#14080c` | Texto encima de botón magenta |

Reglas:

- Un acento neón por bloque. No mezclar rosa + cian + lima en el mismo botón.
- CTA de reservar: magenta. Huecos libres: cian. Confirmación y «tu hora»: lima. Petición que te hacen: cian. Liberar, cancelar y errores: naranja.
- El glow (`box-shadow` / `text-shadow`) es suave. Si el texto deja de leerse, se quita el glow y se deja el color sólido.
- Contraste de cuerpo y botones por encima de 4.5:1. El neón es adorno, no el único indicador de estado.
- La paleta vive en `globals.css` y en `src/lib/tokens.ts`; `src/lib/contrast.test.ts` comprueba que coinciden y que cada pareja texto/fondo cumple 4.5:1.

---

## 4. Tipo

El rótulo usa una sans condensada, extra-bold, mayúsculas, tracking abierto.

En la app:

- Display (títulos de pantalla y del día, hora grande en las hojas): **Big Shoulders**, condensada de rotulación, en mayúsculas.
- Wordmark «ORTIZ» de la cabecera: **Big Shoulders Inline**, cuyo doble trazo recuerda al tubo de neón. Solo ahí: a tamaño pequeño no se lee.
- UI (botones, listas, formularios): **Geist**, en minúscula de frase.
- Mayúsculas solo en los títulos display. Nada de etiquetas pequeñas en mayúsculas espaciadas sobre los bloques.
- Nunca script / cursiva para horas o nombres: en el móvil se lee mal.

Jerarquía:

1. Título de pantalla — display, 1 acento neón.
2. Día / corte — sans semibold.
3. Hora y nombre — sans regular, tabular para horas (`16:00`).

---

## 5. Forma y componentes

Del logo: cinta, estrella, tubo redondeado, ladrillo.

- Radios por jerarquía, no uno para todo: hojas inferiores 20 px, panel del día 14 px, celdas de hora 10 px, botones en píldora.
- Lo que es tuyo o te piden va en una **franja lateral de color** (lima: tu hora; cian: te piden la tuya), no en otra tarjeta igual a las demás. Paneles solo para los días.
- Frases en vez de metadatos: «Tienes hora el viernes 30 a las 17:00», no «VIERNES 30 · 17:00 · Corte».
- Bordes: 1 px `--brick-edge`. El CTA puede llevar un borde magenta semitransparente.
- Cards de día: fondo `--brick`, lista de horas en grid. Libre = cian. Ocupada = nombre + tramo en `--text-dim`.
- Inputs: fondo más oscuro que la card, borde discreto, foco cian.
- No usar sombras de “tarjeta blanca flotando”. La profundidad es luz (glow), no drop-shadow gris.

---

## 6. Fotografía y textura

El JPG del logo ya trae ladrillo y lluvia. En la app:

- Hero o cabecera puede usar el logo sobre `--night`.
- El resto de pantallas: color plano `--night` / `--brick`. No repetir el ladrillo en cada card (pesa y distrae en WhatsApp).
- No stock de “barbería genérica” ni fotos de modelos. Los amigos se identifican por el nombre.

---

## 7. Movimiento

El neón sugiere un pulso lento, no un parpadeo de fiesta.

- Un único momento de entrada: el wordmark «ORTIZ» se enciende al cargar (dos parpadeos) y se queda fijo. Sin animaciones de entrada por sección.
- Hover de botón: brillo un poco más intenso.
- Confirmar reserva: flash lima corto.
- Nada de loops infinitos ni lluvia animada en el fondo: gasta batería y marearía.

---

## 8. Qué no hacer

- Fondo blanco o “modo claro” en el MVP.
- Logo sobre fondo claro.
- Neón en todo el texto (imlegible).
- Paleta corporativa azul/gris que no está en el rótulo.
- Iconos de Material que no tengan que ver (calendario office, check de banco).
- Copiar el ladrillo como patrón a pantalla completa detrás de un formulario.

---

## 9. Relación con el producto

| Superficie | Cómo aplica la marca |
|---|---|
| `/s/[token]` (amigos) | Logo pequeño, corte, cards de día, CTA magenta |
| `/admin` (Raúl) | Misma paleta, más densa, menos adorno |
| Enlace de WhatsApp | Título “Ortiz Barbershop”; preview más adelante |

Este documento no cambia requisitos ni API. Si un color y la usabilidad chocan, gana poder leer la hora en la calle.

# Documento de requisitos de software (MVP)

> **Proyecto:** Barber Booking App - ORTIZ BARBERSHOP
> **Objetivo:** Sistema de reservas para un grupo de amigos, sin registro, pensado para abrirse desde un enlace de WhatsApp.

La apariencia, el branding y el modo oscuro no forman parte de este documento. Se deciden cuando se construya la interfaz.

---

## 1. Roles de usuario

### 1.1 Administrador (`Admin` - Raúl)

- **Descripción:** Peluquero. Prepara la disponibilidad y comparte el enlace.
- **Misión:** Crear los días y las franjas de una semana, ajustar esa semana cuando haga falta y cancelar cualquier reserva.

### 1.2 Cliente / amigo (`Client`)

- **Descripción:** Amigo del grupo de WhatsApp.
- **Misión:** Abrir el enlace, elegir tipo de corte, ver las horas que caben y quién está apuntado, y reservar con su nombre. Solo puede liberar la reserva que hizo él desde el mismo navegador.

---

## 2. Decisiones cerradas

- **Un solo enlace activo.** Solo existe un enlace de reservas válido a la vez. Al pulsar **Generar enlace**, el sistema crea una URL nueva y **destruye la anterior**. Editar días o franjas de la semana actual no cambia el enlace vigente.
- **Dos cortes fijos.** `corte` dura **30 minutos**. `corte_barba` dura **40 minutos**. Raúl no configura duraciones en el MVP.
- **Franja, no huecos prehechos.** Raúl indica el tramo del día (por ejemplo sábado y domingo de 16:00 a 20:00). Las horas que ve el amigo se **calculan** según el corte elegido, la franja y las reservas que ya hay. Paso de reloj: **10 minutos**.
- **Una reserva por persona y día.** El mismo navegador no puede reservar dos veces el mismo día.
- **Un nombre por día.** En el mismo día no puede haber dos reservas con el mismo nombre. Aviso: *«Este nombre ya está apuntado este día. Cambia el nombre.»*
- **Cancelar.** Solo el navegador que reservó, o Raúl. Escribir el nombre de otro no libera el hueco.

---

## 3. Requisitos funcionales (FR)

### Módulo A: Gestión de disponibilidad (Admin)

- **FR-A1: Días de la semana**
  - Raúl elige las fechas concretas de esa semana en las que va a cortar.
- **FR-A2: Franjas de cada día**
  - Para cada fecha indica uno o más tramos (por ejemplo 16:00–20:00, o 16:00–18:00 y 19:00–20:00 si hay un descanso).
  - No parte el día en bloques de 30 minutos. No añade ni quita “huecos sueltos”.
  - Si acorta o borra un tramo que tenía reservas, esas reservas se cancelan.
- **FR-A3: Generar enlace (invalida el anterior)**
  - Al pulsar **Generar enlace**: invalida el enlace activo, crea un token nuevo y muestra la URL para copiar.
  - El enlace anterior deja de mostrar la agenda y deja de aceptar reservas.
  - Editar franjas después no cambia esa URL.
- **FR-A4: Acceso del administrador**
  - Raúl entra con un PIN. Sin login de clientes.
  - Ve la semana, edita franjas, genera el enlace y puede cancelar cualquier reserva.

### Módulo B: Reserva (Cliente / amigos)

- **FR-B1: Acceso sin registro**
  - El amigo abre el enlace de WhatsApp. Sin cuenta.
  - Enlace invalidado → aviso de que ya no está activo.
- **FR-B2: Tipo de corte y cards por día**
  - Primero elige el tipo de corte (un selector para toda la semana): Corte o Corte + barba.
  - En la misma pantalla, una card por día habilitado.
  - Dentro de la card:
    - **Libres:** inicios que caben enteros para **ese** corte (30 o 40 min) sin pisar otra reserva ni salirse de la franja.
    - **Ocupados:** nombre, hora de inicio–fin y tipo de corte.
- **FR-B3: Reservar**
  - Flujo: tipo de corte → hora libre → nombre → confirmar.
  - El modal pide solo el **nombre** (autorelleno desde el navegador si existe).
  - Al confirmar, el intervalo queda ocupado. El navegador guarda la clave de cancelación. El nombre no es la clave.
- **FR-B4: Límites del mismo día**
  - Misma persona: no puede coger otra hora ese día sin cancelar la suya.
  - Mismo nombre: no se confirma; aviso para cambiar el nombre.
  - Se comprueban al confirmar, también en base de datos.
- **FR-B5: Ver quién está apuntado**
  - Cualquiera con el enlace vigente ve nombre, horario y tipo de cada reserva.
- **FR-B6: Cancelar**
  - Quien reservó, desde el mismo navegador. Raúl, cualquiera. Otro amigo, no.
- **FR-B7: Pedir una hora cogida**
  - Un amigo toca una hora cogida por otro y le envía una petición, siempre que su corte quepa en esa hora.
  - El dueño la ve como una tarjeta al abrir el enlace (en tiempo real) y puede aceptar o decir que no.
  - Si quien pide ya tiene hora ese día, aceptar es un **intercambio**: cada uno pasa a la hora del otro.
  - Si quien pide no tiene hora ese día, aceptar es **ceder**: el dueño se queda sin hora. No se le asigna otra automáticamente; si quiere, reserva de nuevo a mano.
  - Quien pide puede retirar la petición mientras esté pendiente. Si una de las dos reservas desaparece, la petición caduca.

---

## 4. Requisitos no funcionales (NFR)

- **NFR-1: Rapidez**
  - Corte, hora, nombre, confirmar.
- **NFR-2: Tiempo real**
  - Confirmar persiste al momento. Otro amigo con la página abierta ve el cambio sin recargar. El estado sale de Postgres.
- **NFR-3: Concurrencia**
  - Dos reservas del mismo día no pueden solaparse en el tiempo.
  - Un nombre y un navegador, como mucho una reserva activa por día.
  - Si dos pulsan un inicio que se pisa, una entra y la otra recibe que ya no está libre (`SLOT_TAKEN`).

---

## 5. Modelo de datos (esquema conceptual)

### Servicios (`services`)

- `id` (`corte` | `corte_barba`)
- `label`
- `duration_minutes` (30 o 40)

### Semana (`weeks`)

- `id`, `public_token` (único, anulable), `is_active` (como máximo una a `true`)

### Franja (`availability_windows`)

- `id`, `week_id`, `date`, `start_time`, `end_time`

Los inicios libres no se guardan.

### Reserva (`bookings`)

- `id`, `week_id`, `window_id`, `service_id`
- `slot_date`, `start_time`, `end_time`
- `client_name`, `client_key_hash`, `cancel_token_hash`, `created_at`

Restricciones: no solapar el mismo día; un nombre por día; un navegador por día.

---

## 6. Fuera de alcance para el MVP

- Pasarela de pagos o cobro por señal.
- Avisos automáticos por SMS o por la API de WhatsApp.
- Historial de cortes y ficha de cliente.
- Registro o login para los amigos.
- Branding, guía visual, modo oscuro, neón y PWA.

# Backend: esquema, funciones y endpoints

Contrato técnico del MVP. Complementa [requisitos.md](requisitos.md).
Zona horaria: `Europe/Madrid`. En Postgres se guarda `date` + `time`.

La app Next.js habla con Supabase desde el servidor. El navegador no escribe en las tablas. Los huecos libres se **calculan** con `listAvailableStarts`; no hay tabla de slots.

---

## 1. Esquema de tablas

### 1.1 `weeks`

Igual que antes: `id`, `public_token` UNIQUE, `is_active`, timestamps. Índice único parcial: una sola semana activa.

### 1.2 `services`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `text` PK | `corte` o `corte_barba` |
| `label` | `text` | |
| `duration_minutes` | `integer` | 30 o 40 |

Filas semilla: `corte` / 30, `corte_barba` / 40.

### 1.3 `availability_windows`

Franja que pone Raúl.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `week_id` | `uuid` FK → `weeks` ON DELETE CASCADE | |
| `date` | `date` | |
| `start_time` | `time` | |
| `end_time` | `time` | `end_time > start_time` |

Varias filas el mismo día si hay descanso.

### 1.4 `bookings`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `week_id` | `uuid` FK → `weeks` ON DELETE CASCADE | |
| `window_id` | `uuid` FK → `availability_windows` ON DELETE CASCADE | |
| `service_id` | `text` FK → `services` | |
| `slot_date` | `date` | |
| `start_time` / `end_time` | `time` | `end` = inicio + duración del servicio |
| `client_name` | `text` | |
| `client_name_normalized` | generado | `lower(trim(client_name))` |
| `client_key_hash` | `text` | |
| `cancel_token_hash` | `text` | |
| `created_at` | `timestamptz` | |

```
UNIQUE (slot_date, client_name_normalized)
UNIQUE (slot_date, client_key_hash)
```

Solapes: en `book_slot`, `FOR UPDATE` de las reservas del día y rechazo si `[start, end)` cruza otra (`SLOT_TAKEN`).

Borrar una ventana cancela sus reservas (`CASCADE`).

### 1.5 Vista `week_board`

Ventanas de la semana activa + reservas (nombre, servicio, inicio, fin). Sin hashes. Los inicios libres no salen aquí; se calculan al servir `GET` con `service`.

---

## 2. RLS

| Objeto | anon | service_role |
|---|---|---|
| `weeks`, `availability_windows`, `bookings` | sin acceso | todo |
| `services`, `week_board` | `SELECT` | `SELECT` |

---

## 3. Dominio (TypeScript)

| Función | Qué hace |
|---|---|
| `listAvailableStarts` | Inicios cada 10 min que caben en la franja, duran el corte y no pisan `busy` |
| `SERVICES` / `getService` | `corte` 30 min, `corte_barba` 40 min |
| `normalizeName` / `normalizeNameKey` | Sin cambios |
| `buildPublicUrl` | Sin cambios |
| `hashSecret` | Sin cambios |

Errores: `INVALID_DURATION`, `INVALID_RANGE`, `INVALID_NAME`, `INVALID_SERVICE`.

---

## 4. Funciones de Postgres

### `book_slot(p_token, p_service_id, p_date, p_start_time, p_client_name, p_client_key_hash, p_cancel_token_hash)`

1. Semana activa con ese token, o `LINK_EXPIRED`.
2. Servicio existe, o `INVALID_SERVICE`.
3. `end = start + duration`. Cabe en alguna ventana del día, o `SLOT_TAKEN`.
4. No solapa otra reserva del día, o `SLOT_TAKEN`.
5. Inserta. Unicidad de nombre → `NAME_TAKEN_THAT_DAY`. Navegador → `ALREADY_BOOKED_THAT_DAY`.

Las columnas de `RETURNS TABLE` (`start_time`, `end_time`, …) son variables PL/pgSQL: las consultas internas califican columnas de tabla (`w.start_time`, `b.slot_date`) para no chocar.

### `cancel_booking_by_token` / `admin_cancel_booking`

Sin cambio de idea. Borran la fila.

### `rotate_public_link(p_week_id)`

Invalida la activa, asigna token con `gen_random_uuid()` (sin `gen_random_bytes`).

### `replace_day_windows(p_week_id, p_date, p_windows jsonb)`

Sustituye las franjas de ese día. Las reservas de las ventanas borradas caen por `CASCADE`.

---

## 5. Identidad en el navegador

`client_key`, `display_name`, `cancel_tokens`. El servidor solo guarda hashes.

---

## 6. Endpoints HTTP

Cookie de admin tras `POST /api/admin/login`. PIN en `ADMIN_PIN`.

### Admin

- `POST /api/admin/login` `{ pin }` → cookie. `401` `INVALID_PIN`.
- `POST /api/admin/logout` → `204`.
- `GET /api/admin/session` → `200` o `401`.
- `GET /api/admin/week` → semana en edición, franjas y reservas (con servicio y horas).
- `POST /api/admin/week` → `201 { id }`.
- `PUT /api/admin/week/days` `{ date, windows: [{ startTime, endTime }] }` → `replace_day_windows`.
- `DELETE /api/admin/week/days?date=` → borra franjas del día.
- `POST /api/admin/link` → `rotate_public_link`.
- `GET /api/admin/link` → URL vigente o `404`.
- `DELETE /api/admin/bookings/:id` → `admin_cancel_booking`.

Ya no hay `PUT /settings` ni rutas de `slots` sueltos.

### Público

#### `GET /api/s/:token?service=corte`

`404` `LINK_EXPIRED`. Respuesta:

```json
{
  "service": { "id": "corte", "durationMinutes": 30 },
  "days": [
    {
      "date": "2026-10-20",
      "windows": [{ "startTime": "16:00", "endTime": "20:00" }],
      "availableStarts": ["16:00", "16:10", "16:20"],
      "bookings": [
        {
          "id": "…",
          "clientName": "Marc",
          "serviceId": "corte_barba",
          "startTime": "17:00",
          "endTime": "17:40"
        }
      ]
    }
  ]
}
```

`availableStarts` sale de `listAvailableStarts` por cada ventana, fusionado.

#### `POST /api/s/:token/bookings`

```json
{
  "serviceId": "corte_barba",
  "date": "2026-10-20",
  "startTime": "16:30",
  "name": "Marc",
  "clientKey": "uuid-del-navegador"
}
```

`201` con `booking` (id, servicio, inicio, fin, nombre) y `cancelToken`.

| HTTP | `error.code` |
|---|---|
| `404` | `LINK_EXPIRED` |
| `400` | `INVALID_NAME` / `INVALID_SERVICE` |
| `409` | `SLOT_TAKEN` / `NAME_TAKEN_THAT_DAY` / `ALREADY_BOOKED_THAT_DAY` |

#### `DELETE /api/s/:token/bookings/:id`

`{ cancelToken }`. `204` / `403` / `404`.

---

## 7. Tiempo real

`week_board` por `public_token`. Al cambiar reservas o ventanas, el cliente vuelve a pedir inicios libres para el corte seleccionado (o recalcula con las reservas nuevas). No suscribir `bookings` en crudo (hashes).

---

## 8. Mapa requisito → pieza

| Requisito | Pieza |
|---|---|
| FR-A1 / FR-A2 | `PUT /api/admin/week/days` → `replace_day_windows` |
| FR-A3 | `POST /api/admin/link` → `rotate_public_link` |
| FR-A4 | `POST /api/admin/login` |
| FR-B2 | `GET /api/s/:token?service=` + `listAvailableStarts` |
| FR-B3 / FR-B4 | `POST …/bookings` → `book_slot` |
| FR-B5 | `week_board` |
| FR-B6 | `DELETE` público / admin |
| NFR-3 | solape en `book_slot` + unicidades por día |

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceClient } from "./client";

// Este archivo corre contra la base de datos real: solo toca datos propios.
// - La semana de test es inactiva, sin token y con created_at del año 2000,
//   así que nunca es «la última semana» que abre el panel de Raúl.
// - Usa fechas de 2099 y nombres aleatorios para no chocar con nada real.
// - Al terminar borra lo suyo y comprueba que todo quedó idéntico.
// NO usar createOpenWeek aquí: desactiva la semana en vivo.

const supabase = createServiceClient();
const DAY = "2099-03-10";
const OTHER_DAY = "2099-03-11";
const CLOSED_DAY = "2099-03-12";
const FREE_DAY = "2099-03-13";
const SNAPSHOT_TABLES = [
  "weeks",
  "availability_windows",
  "bookings",
  "services",
  "swap_requests",
] as const;

const weekIds: string[] = [];
let before: string;

const unique = (name: string) => `${name} ${crypto.randomUUID().slice(0, 8)}`;

async function snapshot() {
  const tables = await Promise.all(
    SNAPSHOT_TABLES.map(async (table) => {
      const { data, error } = await supabase.from(table).select("*").order("id");
      if (error) {
        throw new Error(`${table}: ${error.message}`);
      }
      return [table, data];
    }),
  );
  return JSON.stringify(tables);
}

async function isolatedWeek() {
  const { data: week, error } = await supabase
    .from("weeks")
    .insert({
      is_active: false,
      public_token: null,
      created_at: "2000-01-01T00:00:00Z",
    })
    .select("id")
    .single();
  if (error || !week) {
    throw new Error(error?.message ?? "No se pudo crear la semana aislada");
  }
  weekIds.push(week.id);

  const { error: windowsError } = await supabase.from("availability_windows").insert(
    [DAY, OTHER_DAY].map((date) => ({
      week_id: week.id,
      date,
      start_time: "16:00",
      end_time: "20:00",
    })),
  );
  if (windowsError) {
    throw new Error(windowsError.message);
  }
  return week.id as string;
}

async function create(
  weekId: string,
  start: string,
  options: { name?: string; service?: string; date?: string } = {},
) {
  const name = options.name ?? unique("Cliente");
  const { data, error } = await supabase.rpc("admin_create_booking", {
    p_week_id: weekId,
    p_name: name,
    p_service_id: options.service ?? "corte",
    p_date: options.date ?? DAY,
    p_start_time: start,
  });
  if (error) {
    throw new Error(error.message);
  }
  return { id: data as string, name };
}

async function booking(id: string) {
  const { data } = await supabase
    .from("bookings")
    .select("slot_date, start_time, end_time, window_id, paid_at, client_name, service_id, created_by_admin")
    .eq("id", id)
    .maybeSingle();
  return data;
}

function update(
  id: string,
  fields: { name: string; service?: string; date?: string; start: string },
) {
  return supabase.rpc("admin_update_booking", {
    p_booking_id: id,
    p_name: fields.name,
    p_service_id: fields.service ?? "corte",
    p_date: fields.date ?? DAY,
    p_start_time: fields.start,
  });
}

function setWindows(weekId: string, windows: { start_time: string; end_time: string }[]) {
  return supabase.rpc("replace_day_windows", {
    p_week_id: weekId,
    p_date: DAY,
    p_windows: windows,
  });
}

beforeAll(async () => {
  before = await snapshot();
});

afterAll(async () => {
  if (weekIds.length > 0) {
    const { error } = await supabase.from("weeks").delete().in("id", weekIds);
    if (error) {
      throw new Error(`Limpieza fallida: ${error.message}`);
    }
  }
  expect(await snapshot()).toBe(before);
});

describe("admin_create_booking", () => {
  it("añade un cliente marcado como de Raúl", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "16:00");
    expect(await booking(id)).toMatchObject({
      start_time: "16:00:00",
      end_time: "16:30:00",
      created_by_admin: true,
      paid_at: null,
    });
  });

  it("permite una hora fuera del horario, sin franja", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "21:00");
    expect(await booking(id)).toMatchObject({ start_time: "21:00:00", window_id: null });
  });

  it("no deja pisar a otro cliente", async () => {
    const week = await isolatedWeek();
    await create(week, "16:00");
    await expect(create(week, "16:10")).rejects.toThrow("SLOT_TAKEN");
  });

  it("no deja poner a nadie en un día sin abrir", async () => {
    const week = await isolatedWeek();
    await expect(create(week, "16:00", { date: CLOSED_DAY })).rejects.toThrow("DAY_NOT_OPEN");
  });

  it("no deja repetir nombre el mismo día", async () => {
    const week = await isolatedWeek();
    const { name } = await create(week, "16:00");
    await expect(create(week, "17:00", { name })).rejects.toThrow("NAME_TAKEN_THAT_DAY");
  });
});

describe("admin_update_booking", () => {
  it("cambia nombre, corte, día y hora y recalcula el fin", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "16:00");
    const name = unique("Nuevo");

    const { error } = await update(id, {
      name,
      service: "corte_barba",
      date: OTHER_DAY,
      start: "18:00",
    });

    expect(error).toBeNull();
    const row = await booking(id);
    expect(row).toMatchObject({
      client_name: name,
      service_id: "corte_barba",
      slot_date: OTHER_DAY,
      start_time: "18:00:00",
    });
    expect(row?.end_time).toBe("19:00:00");
  });

  it("puede moverse sobre su propia hora sin chocar consigo misma", async () => {
    const week = await isolatedWeek();
    const { id, name } = await create(week, "16:00");
    const { error } = await update(id, { name, start: "16:10" });
    expect(error).toBeNull();
  });

  it("no deja pisar a otro cliente", async () => {
    const week = await isolatedWeek();
    const { id, name } = await create(week, "16:00");
    await create(week, "17:00");
    const { error } = await update(id, { name, start: "16:50" });
    expect(error?.message).toContain("SLOT_TAKEN");
  });

  it("devuelve NOT_FOUND si la reserva no existe", async () => {
    const { error } = await update(crypto.randomUUID(), { name: "X", start: "16:00" });
    expect(error?.message).toContain("NOT_FOUND");
  });
});

describe("admin_swap_bookings", () => {
  const swap = (a: string, b: string) =>
    supabase.rpc("admin_swap_bookings", { p_booking_a: a, p_booking_b: b });

  it("intercambia dos clientes del mismo día", async () => {
    const week = await isolatedWeek();
    const a = await create(week, "16:00");
    const b = await create(week, "18:00");

    expect((await swap(a.id, b.id)).error).toBeNull();
    expect((await booking(a.id))?.start_time).toBe("18:00:00");
    expect((await booking(b.id))?.start_time).toBe("16:00:00");
  });

  it("intercambia entre días y conserva el pago", async () => {
    const week = await isolatedWeek();
    const a = await create(week, "16:00");
    const b = await create(week, "17:00", { date: OTHER_DAY });
    await supabase.rpc("admin_set_paid", { p_booking_id: a.id, p_paid: true });

    expect((await swap(a.id, b.id)).error).toBeNull();
    const row = await booking(a.id);
    expect(row).toMatchObject({ slot_date: OTHER_DAY, start_time: "17:00:00" });
    expect(row?.paid_at).not.toBeNull();
  });

  it("cada uno conserva su duración", async () => {
    const week = await isolatedWeek();
    const a = await create(week, "16:00");
    const b = await create(week, "18:00", { service: "corte_barba" });

    expect((await swap(a.id, b.id)).error).toBeNull();
    expect(await booking(a.id)).toMatchObject({ start_time: "18:00:00", end_time: "18:30:00" });
    expect((await booking(b.id))?.start_time).toBe("16:00:00");
  });

  it("falla sin tocar nada si el corte largo no cabe", async () => {
    const week = await isolatedWeek();
    const a = await create(week, "16:00");
    await create(week, "16:30");
    const b = await create(week, "18:00", { service: "corte_barba" });

    expect((await swap(a.id, b.id)).error?.message).toContain("SLOT_TAKEN");
    expect((await booking(a.id))?.start_time).toBe("16:00:00");
    expect((await booking(b.id))?.start_time).toBe("18:00:00");
  });
});

describe("admin_set_paid", () => {
  it("marca y desmarca", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "16:00");

    await supabase.rpc("admin_set_paid", { p_booking_id: id, p_paid: true });
    expect((await booking(id))?.paid_at).not.toBeNull();

    await supabase.rpc("admin_set_paid", { p_booking_id: id, p_paid: false });
    expect((await booking(id))?.paid_at).toBeNull();
  });

  it("devuelve NOT_FOUND si la reserva no existe", async () => {
    const { error } = await supabase.rpc("admin_set_paid", {
      p_booking_id: crypto.randomUUID(),
      p_paid: true,
    });
    expect(error?.message).toContain("NOT_FOUND");
  });
});

describe("replace_day_windows", () => {
  it("conserva las reservas que siguen dentro del horario nuevo", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "16:00");

    const { error } = await setWindows(week, [{ start_time: "15:00", end_time: "19:00" }]);

    expect(error).toBeNull();
    const row = await booking(id);
    expect(row?.start_time).toBe("16:00:00");
    expect(row?.window_id).not.toBeNull();
  });

  it("quita solo las que se quedan fuera", async () => {
    const week = await isolatedWeek();
    const inside = await create(week, "16:00");
    const outside = await create(week, "19:00");

    await setWindows(week, [{ start_time: "16:00", end_time: "18:00" }]);

    expect(await booking(inside.id)).not.toBeNull();
    expect(await booking(outside.id)).toBeNull();
  });

  it("mantiene a quien Raúl puso fuera de horario", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "21:00");

    await setWindows(week, [{ start_time: "16:00", end_time: "18:00" }]);

    expect((await booking(id))?.start_time).toBe("21:00:00");
  });

  it("sin franjas quita el día con todas sus reservas", async () => {
    const week = await isolatedWeek();
    const inside = await create(week, "16:00");
    const outside = await create(week, "21:00");

    await setWindows(week, []);

    expect(await booking(inside.id)).toBeNull();
    expect(await booking(outside.id)).toBeNull();
  });
});

describe("admin_move_day", () => {
  const move = (week: string, from: string, to: string) =>
    supabase.rpc("admin_move_day", { p_week_id: week, p_from: from, p_to: to });

  it("mueve franjas y reservas a un día libre", async () => {
    const week = await isolatedWeek();
    const { id } = await create(week, "16:00");

    expect((await move(week, DAY, FREE_DAY)).error).toBeNull();
    expect(await booking(id)).toMatchObject({ slot_date: FREE_DAY, start_time: "16:00:00" });
  });

  it("no pisa un día que ya tiene horario", async () => {
    const week = await isolatedWeek();
    expect((await move(week, DAY, OTHER_DAY)).error?.message).toContain("DAY_TAKEN");
  });

  it("devuelve NOT_FOUND si el día de origen no existe", async () => {
    const week = await isolatedWeek();
    expect((await move(week, FREE_DAY, CLOSED_DAY)).error?.message).toContain("NOT_FOUND");
  });
});

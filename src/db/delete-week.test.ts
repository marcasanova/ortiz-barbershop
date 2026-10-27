import { describe, expect, it } from "vitest";
import { TEST_DATE, bookSlot, createOpenWeek } from "./test-helpers";

describe("borrar una semana", () => {
  it("borra sus franjas y reservas en cascada aunque el pulso de tiempo real esté activo", async () => {
    const { supabase, week, token } = await createOpenWeek();
    const { error: bookError } = await bookSlot({
      supabase,
      token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: `Borrado ${crypto.randomUUID().slice(0, 8)}`,
      clientKey: `client-${crypto.randomUUID()}`,
      cancelToken: "cancel-x",
    });
    expect(bookError).toBeNull();

    const { error } = await supabase.from("weeks").delete().eq("id", week.id);
    expect(error).toBeNull();

    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("week_id", week.id);
    expect(count).toBe(0);
  });
});

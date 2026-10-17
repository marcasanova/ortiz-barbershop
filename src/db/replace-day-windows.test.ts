import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TEST_DATE,
  bookSlot,
  createOpenWeek,
  deleteWeek,
} from "./test-helpers";

type Fixture = Awaited<ReturnType<typeof createOpenWeek>>;

describe("replace_day_windows", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await createOpenWeek();
  });

  afterEach(async () => {
    if (fixture) {
      await deleteWeek(fixture.supabase, fixture.week.id);
    }
  });

  it("sustituye la franja del día", async () => {
    const { error } = await fixture.supabase.rpc("replace_day_windows", {
      p_week_id: fixture.week.id,
      p_date: TEST_DATE,
      p_windows: [{ start_time: "16:00", end_time: "18:00" }],
    });

    expect(error).toBeNull();

    const { data } = await fixture.supabase
      .from("availability_windows")
      .select("start_time, end_time")
      .eq("week_id", fixture.week.id)
      .eq("date", TEST_DATE);

    expect(data).toHaveLength(1);
    expect(String(data?.[0]?.end_time)).toMatch(/^18:00/);
  });

  it("al acortar el tramo cancela la reserva que ya no cabe", async () => {
    await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "18:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    await fixture.supabase.rpc("replace_day_windows", {
      p_week_id: fixture.week.id,
      p_date: TEST_DATE,
      p_windows: [{ start_time: "16:00", end_time: "18:00" }],
    });

    const { count } = await fixture.supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("week_id", fixture.week.id)
      .eq("slot_date", TEST_DATE);

    expect(count).toBe(0);
  });
});

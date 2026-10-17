import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  TEST_DATE,
  bookSlot,
  createOpenWeek,
  deleteWeek,
  rpcMessage,
} from "./test-helpers";

type Fixture = Awaited<ReturnType<typeof createOpenWeek>>;

describe("rotate_public_link", () => {
  let fixture: Fixture;

  beforeEach(async () => {
    fixture = await createOpenWeek();
  });

  afterEach(async () => {
    if (fixture) {
      await deleteWeek(fixture.supabase, fixture.week.id);
    }
  });

  it("devuelve un token nuevo y deja la semana activa", async () => {
    const { data: token, error } = await fixture.supabase.rpc(
      "rotate_public_link",
      { p_week_id: fixture.week.id },
    );

    expect(error).toBeNull();
    expect(token).toEqual(expect.any(String));
    expect(token).not.toBe(fixture.token);

    const { data: week } = await fixture.supabase
      .from("weeks")
      .select("is_active, public_token")
      .eq("id", fixture.week.id)
      .single();

    expect(week?.is_active).toBe(true);
    expect(week?.public_token).toBe(token);
  });

  it("invalida el token anterior al generar otro enlace", async () => {
    const { data: newToken } = await fixture.supabase.rpc("rotate_public_link", {
      p_week_id: fixture.week.id,
    });

    const { error: oldLinkError } = await bookSlot({
      supabase: fixture.supabase,
      token: fixture.token,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(rpcMessage(oldLinkError)).toContain("LINK_EXPIRED");

    const { error: newLinkError } = await bookSlot({
      supabase: fixture.supabase,
      token: newToken as string,
      serviceId: "corte",
      date: TEST_DATE,
      startTime: "16:00",
      name: "Marc",
      clientKey: "client-a",
      cancelToken: "cancel-a",
    });

    expect(newLinkError).toBeNull();
  });

  it("deja una sola semana activa", async () => {
    const second = await createOpenWeek();

    try {
      const { count } = await fixture.supabase
        .from("weeks")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      expect(count).toBe(1);
    } finally {
      await deleteWeek(second.supabase, second.week.id);
    }
  });
});

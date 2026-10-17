import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  COOKIE_MAX_AGE_SECONDS,
  createSessionValue,
  pinMatches,
  verifySessionValue,
} from "./admin-session";

describe("pinMatches", () => {
  const previous = process.env.ADMIN_PIN;

  beforeEach(() => {
    process.env.ADMIN_PIN = "1234";
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ADMIN_PIN;
    } else {
      process.env.ADMIN_PIN = previous;
    }
  });

  it("acepta el PIN correcto", () => {
    expect(pinMatches("1234")).toBe(true);
  });

  it("rechaza un PIN incorrecto", () => {
    expect(pinMatches("9999")).toBe(false);
    expect(pinMatches("123")).toBe(false);
  });
});

describe("createSessionValue / verifySessionValue", () => {
  const previous = process.env.ADMIN_PIN;
  const now = Date.parse("2026-10-17T12:00:00.000Z");

  beforeEach(() => {
    process.env.ADMIN_PIN = "1234";
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.ADMIN_PIN;
    } else {
      process.env.ADMIN_PIN = previous;
    }
  });

  it("acepta una cookie recién creada", () => {
    const value = createSessionValue(now);
    expect(verifySessionValue(value, now)).toBe(true);
  });

  it("rechaza una cookie adulterada", () => {
    const value = createSessionValue(now);
    const tampered = `${value.slice(0, -2)}aa`;
    expect(verifySessionValue(tampered, now)).toBe(false);
  });

  it("rechaza una cookie caducada", () => {
    const value = createSessionValue(now);
    const afterExpiry = now + COOKIE_MAX_AGE_SECONDS * 1000 + 1;
    expect(verifySessionValue(value, afterExpiry)).toBe(false);
  });

  it("acepta la cookie justo antes de caducar", () => {
    const value = createSessionValue(now);
    const justBefore = now + COOKIE_MAX_AGE_SECONDS * 1000 - 1;
    expect(verifySessionValue(value, justBefore)).toBe(true);
  });

  it("rechaza valores vacíos o mal formados", () => {
    expect(verifySessionValue(undefined, now)).toBe(false);
    expect(verifySessionValue("solo-un-trozo", now)).toBe(false);
  });
});

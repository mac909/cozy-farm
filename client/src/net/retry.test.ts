import { describe, expect, it } from "vitest";
import { RETRY_FIRST_MS, RETRY_MAX_MS, retryDelay } from "./retry";

describe("retryDelay", () => {
  it("starts quick and doubles after each failure", () => {
    expect(retryDelay(0)).toBe(RETRY_FIRST_MS);
    expect(retryDelay(1)).toBe(RETRY_FIRST_MS * 2);
    expect(retryDelay(2)).toBe(RETRY_FIRST_MS * 4);
  });

  it("levels off", () => {
    expect(retryDelay(50)).toBe(RETRY_MAX_MS);
  });
});

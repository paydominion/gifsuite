import { describe, expect, it } from "vitest";
import { hashOwnerKey, newOwnerKey, ownerKeyFromRequest, parseOwnerKey } from "@/lib/owner";

describe("owner keys", () => {
  it("are 32 random bytes, different every time", () => {
    const a = newOwnerKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newOwnerKey()).not.toBe(a);
  });

  it("are stored only as a SHA-256 hash", () => {
    const key = newOwnerKey();
    expect(hashOwnerKey(key)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOwnerKey(key)).toBe(hashOwnerKey(key));
    expect(hashOwnerKey(null)).toBeNull();
  });

  it("are read only from a well-formed gs_owner cookie", () => {
    const key = newOwnerKey();
    const req = (cookie: string) => new Request("http://x/", { headers: { cookie } });
    expect(ownerKeyFromRequest(req(`a=1; gs_owner=${key}; b=2`))).toBe(key);
    expect(ownerKeyFromRequest(req(`not_gs_owner=${key}`))).toBeNull();
    expect(ownerKeyFromRequest(req("gs_owner=short"))).toBeNull();
    expect(parseOwnerKey(undefined)).toBeNull();
  });
});

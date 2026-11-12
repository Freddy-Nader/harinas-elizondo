import { describe, expect, it } from "vitest";
import { assertSafeTestDatabaseUrl } from "./guard";

describe("assertSafeTestDatabaseUrl (integration suite safety guard)", () => {
  it("accepts a local database whose name ends in _test", () => {
    for (const url of [
      "postgresql://test:test@localhost:54329/harinas_test",
      "postgres://test:test@127.0.0.1:5432/harinas_test",
      "postgresql://test:test@[::1]:5432/harinas_test",
      "postgresql://test:test@postgres:5432/harinas_test",
    ]) {
      expect(assertSafeTestDatabaseUrl(url)).toBe(url);
    }
  });

  it("throws when the URL is missing or malformed", () => {
    expect(() => assertSafeTestDatabaseUrl(undefined)).toThrow("TEST_DATABASE_URL is not set");
    expect(() => assertSafeTestDatabaseUrl("")).toThrow("TEST_DATABASE_URL is not set");
    expect(() => assertSafeTestDatabaseUrl("not a url")).toThrow("not a valid URL");
    expect(() => assertSafeTestDatabaseUrl("mysql://test:test@localhost/harinas_test")).toThrow("postgres://");
  });

  it("refuses any remote host, including hosts that only look local", () => {
    for (const url of [
      "postgresql://u:p@db.example.com/harinas_test",
      "postgresql://u:p@ep-example-123456.us-east-1.aws.neon.tech/harinas_test",
      "postgresql://u:p@localhost.example.com/harinas_test",
      "postgresql://u:p@10.0.0.5/harinas_test",
    ]) {
      expect(() => assertSafeTestDatabaseUrl(url)).toThrow("Refusing to run integration tests against host");
    }
  });

  it("refuses a local database that is not named *_test", () => {
    expect(() => assertSafeTestDatabaseUrl("postgresql://u:p@localhost/harinas")).toThrow('must end in "_test"');
    expect(() => assertSafeTestDatabaseUrl("postgresql://u:p@localhost/")).toThrow('must end in "_test"');
  });
});

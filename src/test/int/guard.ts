/**
 * Safety guard for the integration suite (PC-xx in docs/llm/testing.md). The suite drops
 * and recreates the schema, so it must never point at a real database (Neon or any
 * remote host). Everything that opens a connection calls this first.
 */

/** `postgres` is the service name when the CI job itself runs inside a container. */
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "postgres"]);

/**
 * Returns the URL when it is a disposable local or CI database. Throws otherwise.
 * Two conditions, both required: a local host and a database name that ends in `_test`.
 */
export function assertSafeTestDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Integration tests only run against a local or CI Postgres (see docs/llm/testing.md).",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL must be a postgres:// URL.");
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to run integration tests against host "${url.hostname}". Only localhost, 127.0.0.1, [::1] or the CI service host are allowed.`,
    );
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests on database "${database}". Its name must end in "_test".`);
  }
  return value;
}

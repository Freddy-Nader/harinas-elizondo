/**
 * `pnpm he`: runs the backend actions over HTTP, so it tests the real stack (proxy, auth,
 * route, use case, database). It never imports a use case. Flags and --help come from the
 * contract fields in src/lib/api, so the CLI asks for what the screen asks for.
 * Exit code 0 on success, 1 on a rejected request, 2 when the server cannot be reached.
 * See docs/llm/api-cli.md.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { parseArgs } from "node:util";
import { clientFields } from "../src/lib/api/clients/contracts";

const baseUrl = (process.env.HE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
/** A repeatable list flag is singular ("es" plural), so `deliveryAddresses` becomes `--delivery-address`. */
const flagOf = (field: (typeof clientFields)[number]) => kebab(field.name).replace(field.kind === "list" ? /es$/ : /$^/, "");

const options: Record<string, { type: "string" | "boolean"; multiple?: boolean }> = {
  help: { type: "boolean" }, json: { type: "boolean" }, email: { type: "string" },
};
for (const field of clientFields) {
  if (field.kind === "boolean") {
    options[flagOf(field)] = { type: "boolean" };
    options[`no-${flagOf(field)}`] = { type: "boolean" };
  } else {
    options[flagOf(field)] = { type: "string", multiple: field.kind === "list" };
  }
}

function help() {
  const rows = clientFields.map((field) => {
    const flag = field.kind === "boolean" ? `--${flagOf(field)} | --no-${flagOf(field)}` : `--${flagOf(field)} <valor>`;
    const note = field.kind === "boolean" ? "(por omisión sí)" : field.required ? "(obligatorio)" : "";
    return `  ${flag.padEnd(48)} ${field.label} ${field.kind === "list" ? "(se repite) " : ""}${note}`.trimEnd();
  });
  console.log(`Uso: pnpm he <comando> [opciones]

Comandos
  login [--email <correo>]    Inicia sesión. La contraseña va en HE_PASSWORD o se pide sin mostrarla
  logout                      Borra la sesión guardada
  clients create              Registra un cliente
  clients update <id>         Reemplaza los datos de un cliente (se envían todos, como en el formulario)
  clients list                Lista el directorio de clientes

Datos del cliente
${rows.join("\n")}

Opciones generales
  --json                      Imprime la respuesta cruda del servidor

Entorno
  HE_URL                      Dirección del servidor (por omisión http://localhost:3000)
  HE_EMAIL, HE_PASSWORD       Credenciales para login. La contraseña nunca va como opción`);
}

// --- Session file: only the session cookie ----------------------------------------------

const sessionDir = () => join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "harinas-elizondo");
const sessionFile = () => join(sessionDir(), "session.json");

function readCookie(): string | undefined {
  try {
    return JSON.parse(readFileSync(sessionFile(), "utf8")).cookie;
  } catch {
    return undefined;
  }
}

function saveCookie(cookie: string) {
  mkdirSync(sessionDir(), { recursive: true, mode: 0o700 });
  writeFileSync(sessionFile(), JSON.stringify({ cookie }), { mode: 0o600 });
  chmodSync(sessionFile(), 0o600);
}

// --- Helpers ----------------------------------------------------------------------------

function die(message: string, code: 1 | 2 = 1): never {
  console.error(message);
  process.exit(code);
}

function ask(question: string, hidden: boolean): Promise<string> {
  process.stderr.write(question);
  const reader = createInterface({
    input: process.stdin,
    output: hidden ? new Writable({ write: (_chunk, _encoding, done) => done() }) : process.stderr,
    terminal: hidden && process.stdin.isTTY === true,
  });
  return new Promise((resolve) => reader.question("", (answer) => {
    reader.close();
    if (hidden) process.stderr.write("\n");
    resolve(answer.trim());
  }));
}

async function request(method: "GET" | "POST", path: string, body?: unknown, extra: Record<string, string> = {}) {
  const cookie = readCookie();
  try {
    return await fetch(`${baseUrl}${path}`, {
      method, redirect: "manual", body: body === undefined ? undefined : JSON.stringify(body),
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...extra },
    });
  } catch {
    return die(`No se pudo conectar con ${baseUrl}. Revisa HE_URL y que el servidor esté en marcha.`, 2);
  }
}

// --- Commands ---------------------------------------------------------------------------

async function login(email: string | undefined) {
  const address = email || process.env.HE_EMAIL || await ask("Correo: ", false);
  const password = process.env.HE_PASSWORD || await ask("Contraseña: ", true);
  const response = await request("POST", "/api/auth/sign-in/email", { email: address, password }, { Origin: baseUrl });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { message?: string } | null;
    die(error?.message || `No se pudo iniciar sesión (${response.status}).`);
  }
  // Keep the session cookie only. Anything else Better Auth sets is dropped.
  const session = response.headers.getSetCookie().map((line) => line.split(";")[0]).filter((pair) => pair.split("=")[0].endsWith("session_token"));
  if (!session.length) die("El servidor no entregó una sesión.");
  saveCookie(session.join("; "));
  console.log("Sesión iniciada.");
}

function clientBody(values: ReturnType<typeof parse>["values"]) {
  const text = (name: string) => String(values[name] ?? "").trim();
  return {
    sapKey: text("sap-key"), businessName: text("business-name"), rfc: text("rfc"), fiscalAddress: text("fiscal-address"),
    deliveryAddresses: ((values["delivery-address"] as string[] | undefined) ?? []).map((value) => value.trim()),
    contactName: text("contact-name"), contactEmail: text("contact-email"),
    requiresCertificate: !values["no-requires-certificate"],
  };
}

async function call(method: "GET" | "POST", path: string, body: unknown, asJson: boolean) {
  const response = await request(method, path, body);
  const text = await response.text();
  let json: { ok?: boolean; message?: string; fieldErrors?: Record<string, string>; data?: unknown } | null = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (asJson) console.log(json ? JSON.stringify(json, null, 2) : text);
  if (!json || !response.ok || !json.ok) {
    if (!asJson) {
      console.error(json?.message ?? `El servidor respondió ${response.status}.`);
      if (response.status === 401) console.error("Ejecuta `pnpm he login` primero.");
    }
    process.exit(1);
  }
  return json as { message: string; data: unknown };
}

function parse() {
  try {
    return parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
  } catch (error) {
    return die(`${(error as Error).message}\nUsa --help para ver las opciones.`);
  }
}

async function main() {
  const { values, positionals } = parse();
  const [command, action, id] = positionals;
  const asJson = values.json === true;
  if (values.help || !command) return help();

  if (command === "login") return login(values.email as string | undefined);
  if (command === "logout") {
    if (existsSync(sessionFile())) rmSync(sessionFile());
    return console.log("Sesión cerrada.");
  }
  if (command === "clients" && action === "create") {
    const result = await call("POST", "/api/v1/clients/create", clientBody(values), asJson);
    if (!asJson) console.log(`${result.message}\nid: ${(result.data as { id: string }).id}`);
    return;
  }
  if (command === "clients" && action === "update") {
    if (!id) return die("Falta el identificador del cliente. Uso: pnpm he clients update <id> [opciones]");
    const result = await call("POST", "/api/v1/clients/update", { ...clientBody(values), id }, asJson);
    if (!asJson) console.log(result.message);
    return;
  }
  if (command === "clients" && action === "list") {
    const result = await call("GET", "/api/v1/clients/list", undefined, asJson);
    if (!asJson) {
      console.log(result.message);
      for (const row of result.data as { id: string; sapKey: string; businessName: string; rfc: string | null; status: string }[]) {
        console.log(`${row.sapKey.padEnd(10)} ${row.businessName.padEnd(36)} ${(row.rfc ?? "—").padEnd(13)} ${row.status === "active" ? "Activo" : "Inactivo"}  ${row.id}`);
      }
    }
    return;
  }
  die(`Comando desconocido: ${positionals.join(" ")}\nUsa --help para ver los comandos.`);
}

main();

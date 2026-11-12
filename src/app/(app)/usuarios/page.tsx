import { Suspense } from "react";
import { asc, inArray } from "drizzle-orm";
import { ModuleGate, PageSkeleton } from "@/components/module-gate";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import { createUser, updateUser } from "./actions";
import { UserForm } from "./user-form";

const field = "rounded-md border bg-background px-3 py-2";
const label = "flex flex-col gap-1 text-sm";

export default function UsuariosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate href="/usuarios"><Users /></ModuleGate>
    </Suspense>
  );
}

async function Users() {
  await requireRole("admin");
  const rows = await getDb().select({ id: user.id, name: user.name, email: user.email, role: user.role,
    active: user.active, employeeId: user.employeeId }).from(user)
    .where(inArray(user.role, ["transaction", "query"])).orderBy(asc(user.name));
  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">Crear cuenta</h2>
        <UserForm action={createUser} label="Crear cuenta">
          <label className={label}>Nombre <input className={field} name="name" required maxLength={100} /></label>
          <label className={label}>Correo <input className={field} name="email" type="email" required maxLength={100} /></label>
          <label className={label}>Número de empleado <input className={field} name="employeeId" required maxLength={10} /></label>
          <label className={label}>Contraseña (mínimo 12 caracteres) <input className={field} name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
          <RoleField value="query" />
        </UserForm>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Cuentas de operación</h2>
        {rows.map((row) => (
          <article key={row.id} className="space-y-2 rounded-xl border p-4">
            <h3 className="font-medium">{row.name}</h3>
            <p className="text-sm text-muted-foreground">{row.email} · {row.employeeId ?? "Sin número de empleado"}</p>
            <UserForm key={row.role + String(row.active)} action={updateUser} label="Guardar cambios">
              <input type="hidden" name="id" value={row.id} />
              <RoleField value={row.role} />
              <label className={label}>Estado
                <select className={field} name="active" defaultValue={String(row.active)}>
                  <option value="true">Activa</option><option value="false">Inactiva</option>
                </select>
              </label>
            </UserForm>
          </article>
        ))}
      </section>
    </section>
  );
}

function RoleField({ value }: { value: string }) {
  return <label className={label}>Rol
    <select className={field} name="role" defaultValue={value}>
      <option value="query">Consulta</option><option value="transaction">Transacción</option>
    </select>
  </label>;
}

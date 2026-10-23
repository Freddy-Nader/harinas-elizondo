import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Harinas Elizondo</h1>
          <p className="text-sm text-muted-foreground">Inicia sesión con tu cuenta de empleado.</p>
        </header>
        <LoginForm />
        <p className="text-center text-xs text-muted-foreground">
          Proyecto escolar no oficial, sin relación con Harinas Elizondo.
        </p>
      </div>
    </main>
  );
}

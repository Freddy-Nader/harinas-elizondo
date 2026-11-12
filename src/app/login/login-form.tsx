"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/permissions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setErrorMessage("");
    setPending(true);
    try {
      const { error } = await authClient.signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (error) {
        setErrorMessage("Revisa tu correo y contraseña e intenta de nuevo.");
        return;
      }
    } catch {
      setErrorMessage("No pudimos conectar con el servidor. Intenta de nuevo.");
      return;
    } finally {
      setPending(false);
    }
    // RF-01. Back to the page the proxy sent us from, same-site only
    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {errorMessage && (
        <div role="alert" className="flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">No pudimos iniciar sesión</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}
      <Button type="submit" disabled={pending} className="bg-[#142c68] text-white hover:bg-[#1e408c] active:scale-[0.97]">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}

"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
      window.location.replace("/login");
    } catch {
      setPending(false);
      toast.error("No pudimos cerrar la sesión. Intenta de nuevo.");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      disabled={pending}
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      className="active:scale-[0.97]"
    >
      <LogOut />
    </Button>
  );
}

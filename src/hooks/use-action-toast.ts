"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/action-state";

/** One toast per submit, success or error, from a `useActionState` result. */
export function useActionToast(state: ActionState) {
  useEffect(() => {
    if (!state.at || !state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state.at, state.ok, state.message]);
}

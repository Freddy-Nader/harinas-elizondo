"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { useActionToast } from "./use-action-toast";

/**
 * `useActionState` plus a submit handler. Passing the action to `<form action>` makes React
 * reset the form after every submit, which wipes what the user typed when validation fails.
 * Submitting through `onSubmit` keeps the values, and the submitter button's name/value is
 * still sent.
 */
export function useFormAction(action: (state: ActionState, form: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return { state, pending, onSubmit, errors: state.fieldErrors ?? {} };
}

import "server-only";
import type { z } from "zod";
import type { Contract } from "@/lib/api/contract";
import { fieldErrorsFrom } from "@/lib/action-state";
import { failure, type Result } from "@/lib/api/result";
import { clientCreateContract, clientListContract, clientUpdateContract } from "@/lib/api/clients/contracts";
import { listClients, saveClient } from "@/lib/api/clients/use-cases";
import type { SessionUser } from "@/lib/session";

export type Operation = {
  method: "GET" | "POST";
  contract: Contract;
  /** Validates the raw JSON with the contract schema, then runs the use case. */
  execute(actor: SessionUser, raw: unknown): Promise<Result<unknown>>;
};

function operation<S extends z.ZodType>(
  method: Operation["method"],
  contract: Contract<S>,
  run: (actor: SessionUser, input: z.infer<S>) => Promise<Result<unknown>>,
): Operation {
  return {
    method,
    contract,
    async execute(actor, raw) {
      const parsed = contract.input.safeParse(raw);
      if (!parsed.success) {
        return failure("invalid", parsed.error.issues[0]?.message ?? "Datos inválidos.", fieldErrorsFrom(parsed.error.issues));
      }
      return run(actor, parsed.data);
    },
  };
}

/** `<module>/<operation>` to its operation. The route handler serves exactly these. */
export const registry: Record<string, Operation> = {
  "clients/create": operation("POST", clientCreateContract, saveClient),
  "clients/update": operation("POST", clientUpdateContract, saveClient),
  "clients/list": operation("GET", clientListContract, () => listClients()),
};

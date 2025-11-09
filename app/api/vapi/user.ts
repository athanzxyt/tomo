import { getUserByPhone, type MinimalUser } from "@/lib/db";

import type { VapiPayload } from "./types";

export async function findUserByCall(
  payload: VapiPayload,
): Promise<MinimalUser | null> {
  const phone =
    payload.call?.from?.phoneNumber ?? payload.call?.customer?.number ?? null;

  if (!phone) {
    return null;
  }

  return getUserByPhone(phone);
}

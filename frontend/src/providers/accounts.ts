import { AccountId } from "../types/nominal";
import { WampCall } from "../libraries/wamp/api";
import { AccountBasicInfo, AccountDetails } from "../libraries/wamp/types";
import { Account, AccountError, AccountErrorResponse } from "../types/account";
import { failed, QueryConfiguration, successful } from "../libraries/queries";

export type AccountOld = AccountBasicInfo & AccountDetails;

export const getAccountOld = async (wampCall: WampCall, accountId: string) => {
  const [accountBasic, accountInfo] = await Promise.all([
    wampCall("account-info", [accountId]),
    wampCall("get-account-details", [accountId]),
  ]);
  if (!accountBasic || !accountInfo) {
    return;
  }
  return {
    ...accountBasic,
    ...accountInfo,
  };
};

// Everything above is stable version
// Everything below is beta version

export const accountByIdQuery: QueryConfiguration<
  AccountId,
  Account | null,
  AccountErrorResponse
> = {
  getKey: (id) => ["account", id],
  fetchData: async (id, wampCall) =>
    successful(await wampCall("account", [id])),
  onError: async (e) =>
    failed({
      error: AccountError.Internal,
      details:
        typeof e === "object" && e && "toString" in e
          ? e.toString()
          : String(e),
    }),
};

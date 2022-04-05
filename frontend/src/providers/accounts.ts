import { AccountId, UTCTimestamp } from "../types/nominal";
import { WampCall } from "../libraries/wamp/api";
import { AccountBasicInfo, AccountDetails } from "../libraries/wamp/types";
import {
  Account,
  AccountActivity,
  AccountActivityError,
  AccountActivityErrorResponse,
  AccountError,
  AccountErrorResponse,
} from "../types/account";
import {
  failed,
  InfiniteQueryConfiguration,
  QueryConfiguration,
  successful,
} from "../libraries/queries";

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

export const ACCOUNT_CHANGES_PER_PAGE = 20;

export const accountChangesQuery: InfiniteQueryConfiguration<
  AccountId,
  UTCTimestamp,
  AccountActivity,
  AccountActivityErrorResponse
> = {
  getKey: (id) => ["account-activity", id],
  fetchData: async (id, lastTimestamp, wampCall) =>
    successful(
      await wampCall("account-activity", [
        id,
        ACCOUNT_CHANGES_PER_PAGE,
        lastTimestamp || null,
      ])
    ),
  onError: async (e) =>
    failed({
      error: AccountActivityError.Internal,
      details:
        typeof e === "object" && e && "toString" in e
          ? e.toString()
          : String(e),
    }),
  getNextPageParam: (lastPage) => {
    if (lastPage.elements.length < ACCOUNT_CHANGES_PER_PAGE) {
      return;
    }
    return lastPage.elements[ACCOUNT_CHANGES_PER_PAGE - 1].timestamp;
  },
  getPreviousPageParam: (firstPage) => {
    if (firstPage.elements.length === 0) {
      return;
    }
    return firstPage.elements[0].timestamp;
  },
};

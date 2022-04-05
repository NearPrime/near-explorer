import * as ReactQuery from "react-query";
import { getNearNetwork } from "../libraries/config";
import { InfiniteQueryConfiguration, QueryResult } from "../libraries/queries";
import wampApi from "../libraries/wamp/api";

export const useInfiniteQuery = <I, P, O, E>(
  query: InfiniteQueryConfiguration<I, P, O, E>,
  input: I
): ReactQuery.UseInfiniteQueryResult<O, E> => {
  return ReactQuery.useInfiniteQuery<O, E, O>(
    query.getKey(input),
    async ({
      pageParam,
    }: ReactQuery.QueryFunctionContext<ReactQuery.QueryKey, P>) => {
      let result: QueryResult<O, E>;
      try {
        const wampCall = wampApi.getCall(getNearNetwork());
        result = await query.fetchData(input, pageParam, wampCall);
      } catch (e) {
        result = await query.onError(e);
      }
      if ("success" in result) {
        return result.success;
      }
      throw result.fail;
    },
    {
      getNextPageParam: query.getNextPageParam,
      getPreviousPageParam: query.getPreviousPageParam,
    }
  );
};

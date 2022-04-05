import * as ReactQuery from "react-query";
import { getNearNetwork } from "../libraries/config";
import { QueryConfiguration, QueryResult } from "../libraries/queries";
import wampApi from "../libraries/wamp/api";

export const useQuery = <I, O, E>(
  query: QueryConfiguration<I, O, E>,
  input: I
): ReactQuery.UseQueryResult<O, E> => {
  return ReactQuery.useQuery<O, E, O>(query.getKey(input), async () => {
    let result: QueryResult<O, E>;
    try {
      const wampCall = wampApi.getCall(getNearNetwork());
      result = await query.fetchData(input, wampCall);
    } catch (e) {
      result = await query.onError(e);
    }
    if ("success" in result) {
      return result.success;
    }
    throw result.fail;
  });
};

import * as React from "react";
import ReactEcharts from "echarts-for-react";

import { truncateAccountId } from "../../libraries/formatting";

import { Props } from "./TransactionsByDate";

import { useTranslation } from "react-i18next";
import { useWampQuery } from "../../hooks/wamp";

const ActiveAccountsList: React.FC<Props> = React.memo(({ chartStyle }) => {
  const { t } = useTranslation();
  const accounts =
    useWampQuery(
      React.useCallback(
        async (wampCall) =>
          ((await wampCall("active-accounts-list", [])) ?? []).reverse(),
        []
      )
    ) ?? [];
  const accountsIds = React.useMemo(
    () => accounts.map(({ account }) => truncateAccountId(account)),
    [accounts]
  );
  const accountsTransactionCount = React.useMemo(
    () => accounts.map(({ transactionsCount }) => Number(transactionsCount)),
    [accounts]
  );

  const getOption = () => {
    return {
      title: {
        text: t("component.stats.ActiveAccountsList.title"),
      },
      grid: { containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
      },
      xAxis: [
        {
          name: t("common.transactions.transactions"),
          type: "value",
        },
      ],
      yAxis: [
        {
          type: "category",
          data: accountsIds,
        },
      ],
      series: [
        {
          type: "bar",
          data: accountsTransactionCount,
        },
      ],
    };
  };

  return <ReactEcharts option={getOption()} style={chartStyle} />;
});

export default ActiveAccountsList;

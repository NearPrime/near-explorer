import * as React from "react";
import * as ReactQuery from "react-query";
import { useTranslation } from "react-i18next";
import moment from "moment";
import { styled } from "../../../libraries/styles";
import { AccountId } from "../../../types/nominal";
import { accountChangesQuery } from "../../../providers/accounts";
import {
  AccountActivity,
  AccountActivityElement,
  AccountActivityErrorResponse,
} from "../../../types/account";
import AccountActivityBadge from "./AccountActivityBadge";
import { formatNear, shortenString } from "../../../libraries/formatting";
import { useInfiniteQuery } from "../../../hooks/use-infinite-query";

const TableWrapper = styled("div", {
  // TODO: Place a proper padding here
  paddingHorizontal: 40,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  fontFamily: "Manrope",
});

const TableHeader = styled("thead", {
  backgroundColor: "#f8f8f8",
  textTransform: "uppercase",
  color: "#c4c4c4",
  borderRadius: 3,

  fontSize: 12,
  fontWeight: 600,
});

const TableHeaderCell = styled("th", {
  paddingVertical: 12,
  // paddingHorizontal: 9,
});

const TableRow = styled("tr", {
  fontSize: 14,
  fontWeight: 500,
  height: 50,
});

const TableElement = styled("td");

const DateTableElement = styled(TableElement, {
  color: "#9B9B9B",
});

type Props = {
  accountId: AccountId;
};

const AccountActivityView: React.FC<Props> = React.memo((props) => {
  const activityQuery = useInfiniteQuery(accountChangesQuery, props.accountId);
  return (
    <AccountActivityQueryView {...activityQuery} accountId={props.accountId} />
  );
});

type QueryProps = ReactQuery.UseInfiniteQueryResult<
  AccountActivity,
  AccountActivityErrorResponse
> & {
  accountId: AccountId;
};

const AccountActivityQueryView: React.FC<QueryProps> = React.memo((props) => {
  const { t } = useTranslation();
  switch (props.status) {
    case "success":
      const elements = props.data.pages.reduce<AccountActivityElement[]>(
        (acc, page) => acc.concat(page.elements),
        []
      );
      return (
        <TableWrapper>
          <table>
            <TableHeader>
              <tr>
                <TableHeaderCell>From</TableHeaderCell>
                <TableHeaderCell>To</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Id</TableHeaderCell>
                <TableHeaderCell>When</TableHeaderCell>
              </tr>
            </TableHeader>
            <tbody>
              {elements.map((element, index) => (
                <TableRow key={index}>
                  <TableElement>{shortenString(element.from)}</TableElement>
                  <TableElement>{shortenString(element.to)}</TableElement>
                  <TableElement>
                    <AccountActivityBadge action={element.action} />
                  </TableElement>
                  <TableElement>
                    {"amount" in element.action ? (
                      <>
                        {element.to === props.accountId ? "+" : "-"}
                        {formatNear(element.action.amount, 2)}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </TableElement>
                  <TableElement>
                    {"transactionHash" in element.action
                      ? shortenString(element.action.transactionHash)
                      : "N/A"}
                  </TableElement>
                  <DateTableElement>
                    {moment
                      .utc(element.timestamp)
                      .format(t(`pages.account.activity.dateFormat`))}
                  </DateTableElement>
                </TableRow>
              ))}
            </tbody>
          </table>
          <button
            disabled={!props.hasNextPage}
            onClick={() => props.fetchNextPage()}
          >
            More activity
          </button>
        </TableWrapper>
      );
    case "error":
      return <div>error</div>;
    case "loading":
      return <div>Loading...</div>;
    default:
      return null;
  }
});

export default AccountActivityView;

import autobahn from "autobahn";
import EventEmitter from "events";
import BN from "bn.js";

import * as stats from "./stats";
import * as receipts from "./receipts";
import * as transactions from "./transactions";
import * as contracts from "./contracts";
import * as blocks from "./blocks";
import * as chunks from "./chunks";
import * as accounts from "./accounts";
import * as telemetry from "./telemetry";

import {
  Action,
  ProcedureTypes,
  SubscriptionTopicType,
  SubscriptionTopicTypes,
} from "./client-types";

import {
  wampNearNetworkName,
  wampNearExplorerUrl,
  wampNearExplorerBackendSecret,
} from "./config";

import { sendJsonRpc, sendJsonRpcQuery } from "./near";
import {
  AccountId,
  ReceiptId,
  TransactionHash,
  UTCTimestamp,
  YoctoNEAR,
} from "../../frontend/src/types/nominal";
import {
  AccountActivityAction,
  AccountActivityElement,
} from "../../frontend/src/types/account";

const wampHandlers: {
  [P in keyof ProcedureTypes]: (
    args: ProcedureTypes[P]["args"]
  ) => Promise<ProcedureTypes[P]["result"]>;
} = {
  "node-telemetry": async ([nodeInfo]) => {
    return await telemetry.sendTelemetry(nodeInfo);
  },

  // rpc endpoint
  "nearcore-view-account": async ([accountId]) => {
    return await sendJsonRpcQuery("view_account", {
      finality: "final",
      account_id: accountId,
    });
  },

  "nearcore-view-access-key-list": async ([accountId]) => {
    return await sendJsonRpcQuery("view_access_key_list", {
      finality: "final",
      account_id: accountId,
    });
  },

  "nearcore-tx": async ([transactionHash, accountId]) => {
    return await sendJsonRpc("EXPERIMENTAL_tx_status", [
      transactionHash,
      accountId,
    ]);
  },

  "nearcore-final-block": async () => {
    return await sendJsonRpc("block", { finality: "final" });
  },

  "nearcore-status": async () => {
    return await sendJsonRpc("status", [null]);
  },

  // genesis configuration
  "nearcore-genesis-protocol-configuration": async ([blockId]) => {
    return await sendJsonRpc("block", { block_id: blockId });
  },

  "get-latest-circulating-supply": async () => {
    return await stats.getLatestCirculatingSupply();
  },

  "get-account-details": async ([accountId]) => {
    return await accounts.getAccountDetails(accountId);
  },

  // stats part
  // transaction related
  "transactions-count-aggregated-by-date": async () => {
    return await stats.getTransactionsByDate();
  },

  "gas-used-aggregated-by-date": async () => {
    return await stats.getGasUsedByDate();
  },

  "deposit-amount-aggregated-by-date": async () => {
    return await stats.getDepositAmountByDate();
  },

  "transactions-list": async ([limit, paginationIndexer]) => {
    return await transactions.getTransactionsList(limit, paginationIndexer);
  },

  "transactions-list-by-account-id": async ([
    accountId,
    limit,
    paginationIndexer,
  ]) => {
    return await transactions.getAccountTransactionsList(
      accountId,
      limit,
      paginationIndexer
    );
  },

  "transactions-list-by-block-hash": async ([
    blockHash,
    limit,
    paginationIndexer,
  ]) => {
    return await transactions.getTransactionsListInBlock(
      blockHash,
      limit,
      paginationIndexer
    );
  },

  "transaction-info": async ([transactionHash]) => {
    return await transactions.getTransactionInfo(transactionHash);
  },

  // accounts
  "new-accounts-count-aggregated-by-date": async () => {
    return await stats.getNewAccountsCountByDate();
  },

  "live-accounts-count-aggregated-by-date": async () => {
    return await stats.getLiveAccountsCountByDate();
  },

  "active-accounts-count-aggregated-by-week": async () => {
    return await stats.getActiveAccountsCountByWeek();
  },

  "active-accounts-count-aggregated-by-date": async () => {
    return await stats.getActiveAccountsCountByDate();
  },

  "active-accounts-list": async () => {
    return await stats.getActiveAccountsList();
  },

  account: async ([accountId]) => {
    const isAccountIndexed = await accounts.isAccountIndexed(accountId);
    if (!isAccountIndexed) {
      return null;
    }
    const [
      accountInfo,
      accountDetails,
      nearCoreAccount,
      transactionsCount,
    ] = await Promise.all([
      accounts.getAccountInfo(accountId),
      accounts.getAccountDetails(accountId),
      sendJsonRpcQuery("view_account", {
        finality: "final",
        account_id: accountId,
      }),
      accounts.getAccountTransactionsCount(accountId),
    ]);
    if (!accountInfo || !accountDetails) {
      return null;
    }
    return {
      id: accountId,
      isContract:
        nearCoreAccount.code_hash !== "11111111111111111111111111111111",
      created: {
        timestamp: accountInfo.createdAtBlockTimestamp,
        transactionHash: accountInfo.createdByTransactionHash,
      },
      storageUsed: accountDetails.storageUsage,
      nonStakedBalance: accountDetails.nonStakedBalance,
      stakedBalance: accountDetails.stakedBalance,
      transactionsQuantity:
        transactionsCount.inTransactionsCount +
        transactionsCount.outTransactionsCount,
    };
  },

  transaction: async ([transactionHash]) => {
    const isTransactionIndexed = await transactions.getIsTransactionIndexed(
      transactionHash
    );
    if (!isTransactionIndexed) {
      return null;
    }
    const transactionBaseInfo = await transactions.getTransactionInfo(
      transactionHash
    );
    if (!transactionBaseInfo) {
      throw new Error(`No hash ${transactionHash} found`);
    }
    const transactionInfo = await sendJsonRpc("EXPERIMENTAL_tx_status", [
      transactionBaseInfo.hash,
      transactionBaseInfo.signerId,
    ]);
    console.log(
      "==== transactionBaseInfo: ======",
      transactionBaseInfo,
      "====== transactionInfo: =======",
      transactionInfo
    );

    return {
      hash: transactionBaseInfo.hash,
      created: {
        timestamp: transactionBaseInfo.blockTimestamp,
        blockHash: transactionBaseInfo.blockHash,
      },
      transactionIndex: transactionBaseInfo.transactionIndex,
      receipts: transactionInfo.receipts,
      receiptsOutcome: transactionInfo.receipts_outcome,
      status: Object.keys(transactionInfo.status)[0],
      transaction: transactionInfo.transaction,
      transactionOutcome: transactionInfo.transaction_outcome,
    };
  },

  "is-account-indexed": async ([accountId]) => {
    return await accounts.isAccountIndexed(accountId);
  },

  "accounts-list": async ([limit, paginationIndexer]) => {
    return await accounts.getAccountsList(limit, paginationIndexer);
  },

  "account-transactions-count": async ([accountId]) => {
    return await accounts.getAccountTransactionsCount(accountId);
  },

  "account-info": async ([accountId]) => {
    return await accounts.getAccountInfo(accountId);
  },

  "account-activity": async ([accountId, limit, endTimestamp]) => {
    const changes = await accounts.getAccountChanges(
      accountId,
      limit,
      endTimestamp || undefined
    );

    const idsToFetch = changes.reduce<{
      receiptIds: ReceiptId[];
      transactionHashes: TransactionHash[];
    }>(
      (acc, change) => {
        switch (change.updateReason) {
          case "ACTION_RECEIPT_GAS_REWARD":
          case "RECEIPT_PROCESSING":
            acc.receiptIds.push(change.causedByReceiptId);
            break;
          case "TRANSACTION_PROCESSING":
            acc.transactionHashes.push(change.causedByTransactionHash);
            break;
          case "MIGRATION":
          case "VALIDATOR_ACCOUNTS_UPDATE":
            break;
        }
        return acc;
      },
      {
        receiptIds: [],
        transactionHashes: [],
      }
    );
    const [receiptsResponse, transactionsResponse] = await Promise.all([
      receipts.getReceiptsByIds(idsToFetch.receiptIds),
      transactions.getTransactionsByHashes(idsToFetch.transactionHashes),
    ]);
    const getActionMapping = (
      actions: Action[],
      transactionHash: TransactionHash,
      isRefund: boolean
    ): AccountActivityAction => {
      if (actions.length === 0) {
        throw new Error("Unexpected zero-length array of actions");
      }
      if (actions.length !== 1) {
        return {
          type: "batch",
          transactionHash,
          actions: actions.map((action) =>
            getActionMapping([action], transactionHash, isRefund)
          ),
        };
      }
      switch (actions[0].kind) {
        case "AddKey":
          return {
            type: "access-key-created",
            transactionHash,
          };
        case "CreateAccount":
          return {
            type: "account-created",
            transactionHash,
          };
        case "DeleteAccount":
          return {
            type: "account-removed",
            transactionHash,
          };
        case "DeleteKey":
          return {
            type: "access-key-removed",
            transactionHash,
          };
        case "DeployContract":
          return {
            type: "contract-deployed",
            transactionHash,
          };
        case "FunctionCall":
          return {
            type: "call-method",
            transactionHash,
            methodName: actions[0].args.method_name,
          };
        case "Stake":
          return {
            type: "restake",
            transactionHash,
          };
        case "Transfer":
          return {
            type: isRefund ? "refund" : "transfer",
            transactionHash,
            amount: actions[0].args.deposit as YoctoNEAR,
          };
      }
    };
    return {
      elements: changes
        .map<AccountActivityElement | null>((change, changeIndex, changes) => {
          switch (change.updateReason) {
            case "ACTION_RECEIPT_GAS_REWARD":
            case "RECEIPT_PROCESSING":
              const connectedReceipt = receiptsResponse.get(
                change.causedByReceiptId
              )!;
              return {
                from: connectedReceipt.signerId,
                to: connectedReceipt.receiverId,
                timestamp: connectedReceipt.blockTimestamp,
                action: getActionMapping(
                  connectedReceipt.actions,
                  connectedReceipt.originatedFromTransactionHash,
                  connectedReceipt.signerId === "system"
                ),
              };
            case "TRANSACTION_PROCESSING": {
              const connectedTransaction = transactionsResponse.get(
                change.causedByTransactionHash
              )!;
              return {
                from: connectedTransaction.signerId,
                to: connectedTransaction.receiverId,
                timestamp: connectedTransaction.blockTimestamp,
                action: getActionMapping(
                  connectedTransaction.actions,
                  connectedTransaction.hash,
                  connectedTransaction.signerId === "system"
                ),
              };
            }
            case "MIGRATION":
              return null;
            case "VALIDATOR_ACCOUNTS_UPDATE":
              const prevChange = changes[changeIndex + 1];
              if (!prevChange) {
                return null;
              }
              return {
                from: "system" as AccountId,
                to: change.affectedAccountId,
                timestamp: parseInt(
                  change.changedInBlockTimestamp
                ) as UTCTimestamp,
                action: {
                  type: "validator-reward",
                  blockHash: change.changedInBlockHash,
                  amount: new BN(change.affectedAccountStakedBalance)
                    .sub(new BN(prevChange.affectedAccountStakedBalance))
                    .toString() as YoctoNEAR,
                },
              };
          }
        })
        .filter((x): x is AccountActivityElement => Boolean(x)),
    };
  },

  // blocks
  "first-produced-block-timestamp": async () => {
    return await stats.getFirstProducedBlockTimestamp();
  },
  "blocks-list": async ([limit, paginationIndexer]) => {
    return await blocks.getBlocksList(limit, paginationIndexer);
  },
  "block-info": async ([blockId]) => {
    return await blocks.getBlockInfo(blockId);
  },
  "block-by-hash-or-id": async ([blockId]) => {
    return await blocks.getBlockByHashOrId(blockId);
  },

  // contracts
  "new-contracts-count-aggregated-by-date": async () => {
    return await stats.getNewContractsCountByDate();
  },

  "unique-deployed-contracts-count-aggregate-by-date": async () => {
    return await stats.getUniqueDeployedContractsCountByDate();
  },

  "active-contracts-count-aggregated-by-date": async () => {
    return await stats.getActiveContractsCountByDate();
  },

  "active-contracts-list": async () => {
    return await stats.getActiveContractsList();
  },

  // partner part
  "partner-total-transactions-count": async () => {
    return await stats.getPartnerTotalTransactionsCount();
  },

  "partner-first-3-month-transactions-count": async () => {
    return await stats.getPartnerFirst3MonthTransactionsCount();
  },

  // genesis stats
  "nearcore-genesis-accounts-count": async () => {
    return await stats.getGenesisAccountsCount();
  },

  "nearcore-total-fee-count": async ([daysCount]) => {
    return await stats.getTotalFee(daysCount);
  },

  "circulating-supply-stats": async () => {
    return await stats.getCirculatingSupplyByDate();
  },

  // receipts
  "receipts-count-in-block": async ([blockHash]) => {
    return await receipts.getReceiptsCountInBlock(blockHash);
  },
  "transaction-hash-by-receipt-id": async ([receiptId]) => {
    return await receipts.getReceiptInTransaction(receiptId);
  },
  "included-receipts-list-by-block-hash": async ([blockHash]) => {
    return await receipts.getIncludedReceiptsList(blockHash);
  },
  "executed-receipts-list-by-block-hash": async ([blockHash]) => {
    return await receipts.getExecutedReceiptsList(blockHash);
  },

  // transactions
  "is-transaction-indexed": async ([transactionHash]) => {
    return await transactions.getIsTransactionIndexed(transactionHash);
  },

  // contracts
  "contract-info-by-account-id": async ([accountId]) => {
    return await contracts.getContractInfo(accountId);
  },

  // chunks
  "gas-used-in-chunks": async ([blockHash]) => {
    return await chunks.getGasUsedInChunks(blockHash);
  },
};

// set up wamp
function setupWamp(): () => Promise<autobahn.Session> {
  console.log(
    `WAMP setup: connecting to ${wampNearExplorerUrl} with ticket ${wampNearExplorerBackendSecret}`
  );
  const wamp = new autobahn.Connection({
    realm: "near-explorer",
    transports: [
      {
        url: wampNearExplorerUrl,
        type: "websocket",
      },
    ],
    authmethods: ["ticket"],
    authid: "near-explorer-backend",
    onchallenge: (_session, method) => {
      if (method === "ticket") {
        return wampNearExplorerBackendSecret;
      }
      throw "WAMP authentication error: unsupported challenge method";
    },
    retry_if_unreachable: true,
    max_retries: Number.MAX_SAFE_INTEGER,
    max_retry_delay: 10,
  });

  let currentSessionPromise: Promise<autobahn.Session>;
  const openEventEmitter = new EventEmitter();

  wamp.onopen = async (session) => {
    openEventEmitter.emit("opened", session);
    currentSessionPromise = Promise.resolve(session);
    console.log("WAMP connection is established. Waiting for commands...");

    for (const [name, handler] of Object.entries(wampHandlers)) {
      const uri = `com.nearprotocol.${wampNearNetworkName}.explorer.${name}`;
      try {
        await session.register(uri, async (args, kwargs, details) => {
          try {
            return await ((handler as unknown) as autobahn.RegisterEndpoint)(
              args,
              kwargs,
              details
            );
          } catch (e: any) {
            throw new autobahn.Error(e.toString(), [e]);
          }
        });
      } catch (error) {
        console.error(`Failed to register "${uri}" handler due to:`, error);
        wamp.close();
        setTimeout(() => {
          wamp.open();
        }, 1000);
        return;
      }
    }
  };

  wamp.onclose = (reason) => {
    currentSessionPromise = new Promise((resolve) => {
      openEventEmitter.addListener("opened", resolve);
    });
    console.log(
      "WAMP connection has been closed (check WAMP router availability and credentials):",
      reason
    );
    return false;
  };

  wamp.open();
  return () => currentSessionPromise;
}

const wampPublish = async <T extends SubscriptionTopicType>(
  topic: T,
  namedArgs: SubscriptionTopicTypes[T],
  getSession: () => Promise<autobahn.Session>
): Promise<void> => {
  try {
    const uri = `com.nearprotocol.${wampNearNetworkName}.explorer.${topic}`;
    const session = await getSession();
    if (!session.isOpen) {
      console.log(`No session on stack\n${new Error().stack}`);
      return;
    }
    session.publish(uri, [], namedArgs);
  } catch (e) {
    console.error(`${topic} publishing failed.\n${new Error().stack}`);
  }
};

export { setupWamp, wampPublish };

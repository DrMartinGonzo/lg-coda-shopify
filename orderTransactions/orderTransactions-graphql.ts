import '../types/admin.generated.d.ts';

// #region Helpers
export function buildOrderTransactionsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];
  if (filters.search) searchItems.push(filters.search);

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${filters.created_at_min.toISOString()}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${filters.created_at_max.toISOString()}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${filters.updated_at_min.toISOString()}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${filters.updated_at_max.toISOString()}'`);
  if (filters.processed_at_min) searchItems.push(`processed_at:>='${filters.processed_at_min.toISOString()}'`);
  if (filters.processed_at_max) searchItems.push(`processed_at:<='${filters.processed_at_max.toISOString()}'`);

  // order gateways
  if (filters.gateways && filters.gateways.length)
    searchItems.push('(' + filters.gateways.map((gateway) => `gateway:${gateway}`).join(' OR ') + ')');

  // order test
  if (filters.test !== undefined) searchItems.push(`test:${filters.test}`);

  // order status
  if (filters.status && filters.status.length)
    searchItems.push('(' + filters.status.map((status) => `status:${status}`).join(' OR ') + ')');
  // order financial_status
  if (filters.financial_status !== undefined) searchItems.push(`financial_status:${filters.financial_status}`);
  // order fulfillment_status
  if (filters.fulfillment_status !== undefined) searchItems.push(`fulfillment_status:${filters.fulfillment_status}`);

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
const OrderTransactionFieldsFragment = /* GraphQL */ `
  fragment OrderTransactionFields on OrderTransaction {
    id
    kind
    status
    gateway
    createdAt
    authorizationCode
    accountNumber
    receiptJson @include(if: $includeReceiptJson)
    settlementCurrency
    settlementCurrencyRate
    errorCode
    processedAt
    test
    paymentId
    paymentIcon @include(if: $includeIcon) {
      url
    }
    amountSet {
      shopMoney @include(if: $includeAmount) {
        amount
      }
      presentmentMoney @include(if: $includeTransactionCurrency) {
        currencyCode
      }
    }
    totalUnsettledSet @include(if: $includeTotalUnsettled) {
      shopMoney {
        amount
      }
    }
    parentTransaction @include(if: $includeParentTransaction) {
      id
    }
    paymentDetails @include(if: $includePaymentDetails) {
      ... on BasePaymentDetails {
        paymentMethodName
      }
      ... on CardPaymentDetails {
        avsResultCode
        bin
        company
        cvvResultCode
        expirationMonth
        expirationYear
        name
        number
        wallet
      }
    }
    # user @include(if: $includeUser) {
    #   id
    # }
  }
`;
// #endregion

// #region Queries
export const QueryOrderTransactions = /* GraphQL */ `
  ${OrderTransactionFieldsFragment}

  query getOrderTransactions(
    $maxEntriesPerRun: Int!
    $cursor: String
    $searchQuery: String
    $includeAmount: Boolean!
    $includeIcon: Boolean!
    $includeParentTransaction: Boolean!
    $includePaymentDetails: Boolean!
    $includeReceiptJson: Boolean!
    $includeTotalUnsettled: Boolean!
    $includeTransactionCurrency: Boolean!
  ) {
    orders(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {
      nodes {
        id
        name
        transactions(first: 5) {
          ...OrderTransactionFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
// #endregion

import { toIsoDate } from '../utils/helpers';
import { graphql } from './utils/graphql-utils';
import { pageInfoFragment } from './sharedFragments-graphql';

// #region Helpers
export function buildOrderTransactionsSearchQuery(filters: { [key: string]: any }) {
  const searchItems = [];
  if (filters.search) searchItems.push(filters.search);

  // date range filters
  if (filters.created_at_min) searchItems.push(`created_at:>='${toIsoDate(filters.created_at_min)}'`);
  if (filters.created_at_max) searchItems.push(`created_at:<='${toIsoDate(filters.created_at_max)}'`);
  if (filters.updated_at_min) searchItems.push(`updated_at:>='${toIsoDate(filters.updated_at_min)}'`);
  if (filters.updated_at_max) searchItems.push(`updated_at:<='${toIsoDate(filters.updated_at_max)}'`);
  if (filters.processed_at_min) searchItems.push(`processed_at:>='${toIsoDate(filters.processed_at_min)}'`);
  if (filters.processed_at_max) searchItems.push(`processed_at:<='${toIsoDate(filters.processed_at_max)}'`);

  // order gateways
  if (filters.gateways && filters.gateways.length)
    searchItems.push('(' + filters.gateways.map((gateway) => `gateway:${gateway}`).join(' OR ') + ')');

  // order test
  if (filters.test !== undefined) searchItems.push(`test:${filters.test}`);

  // order status
  if (filters.status) searchItems.push(`status:'${filters.status}'`);

  // order financial_status
  if (filters.financial_status !== undefined) searchItems.push(`financial_status:${filters.financial_status}`);
  // order fulfillment_status
  if (filters.fulfillment_status !== undefined) searchItems.push(`fulfillment_status:${filters.fulfillment_status}`);

  return searchItems.join(' AND ');
}
// #endregion

// #region Fragments
export const orderTransactionFieldsFragment = graphql(`
  fragment OrderTransactionFields on OrderTransaction @_unmask {
    id
    kind
    status
    gateway
    createdAt
    authorizationCode
    authorizationExpiresAt
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
`);
// #endregion

// #region Queries
export const getOrderTransactionsQuery = graphql(
  `
    query getOrderTransactions(
      $limit: Int!
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
      orders(first: $limit, after: $cursor, query: $searchQuery) {
        nodes {
          id
          name
          transactions(first: 5) {
            ...OrderTransactionFields
          }
        }
        pageInfo {
          ...PageInfoFields
        }
      }
    }
  `,
  [orderTransactionFieldsFragment, pageInfoFragment]
);
// #endregion

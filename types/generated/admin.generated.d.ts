/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as AdminTypes from './admin.types.ts';

export type CheckThrottleStatusQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type CheckThrottleStatusQuery = { shop: Pick<AdminTypes.Shop, 'id'> };

export type CollectionFieldsFragment = (
  AdminTypes.MakeOptional<Pick<AdminTypes.Collection, 'handle' | 'id' | 'descriptionHtml' | 'updatedAt' | 'templateSuffix' | 'title' | 'sortOrder'>, 'sortOrder'>
  & { image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, ruleSet?: AdminTypes.Maybe<(
    Pick<AdminTypes.CollectionRuleSet, 'appliedDisjunctively'>
    & { rules: Array<Pick<AdminTypes.CollectionRule, 'column' | 'condition' | 'relation'>> }
  )>, metafields?: { nodes: Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    )> } }
);

export type GetCollectionsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeImage: AdminTypes.Scalars['Boolean']['input'];
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
  includeSortOrder: AdminTypes.Scalars['Boolean']['input'];
  includeRuleSet: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetCollectionsQuery = { collections: { nodes: Array<(
      AdminTypes.MakeOptional<Pick<AdminTypes.Collection, 'handle' | 'id' | 'descriptionHtml' | 'updatedAt' | 'templateSuffix' | 'title' | 'sortOrder'>, 'sortOrder'>
      & { image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, ruleSet?: AdminTypes.Maybe<(
        Pick<AdminTypes.CollectionRuleSet, 'appliedDisjunctively'>
        & { rules: Array<Pick<AdminTypes.CollectionRule, 'column' | 'condition' | 'relation'>> }
      )>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type GetCollectionTypeQueryVariables = AdminTypes.Exact<{
  collectionGid: AdminTypes.Scalars['ID']['input'];
}>;


export type GetCollectionTypeQuery = { collection?: AdminTypes.Maybe<{ isSmartCollection?: AdminTypes.Maybe<Pick<AdminTypes.CollectionRuleSet, 'appliedDisjunctively'>> }> };

export type GetCollectionTypesQueryVariables = AdminTypes.Exact<{
  ids: Array<AdminTypes.Scalars['ID']['input']> | AdminTypes.Scalars['ID']['input'];
}>;


export type GetCollectionTypesQuery = { nodes: Array<AdminTypes.Maybe<(
    { __typename: 'AbandonedCheckout' }
    & Pick<AdminTypes.AbandonedCheckout, 'id'>
  ) | (
    { __typename: 'Abandonment' }
    & Pick<AdminTypes.Abandonment, 'id'>
  ) | (
    { __typename: 'AddAllProductsOperation' }
    & Pick<AdminTypes.AddAllProductsOperation, 'id'>
  ) | (
    { __typename: 'AdditionalFee' }
    & Pick<AdminTypes.AdditionalFee, 'id'>
  ) | (
    { __typename: 'App' }
    & Pick<AdminTypes.App, 'id'>
  ) | (
    { __typename: 'AppCatalog' }
    & Pick<AdminTypes.AppCatalog, 'id'>
  ) | (
    { __typename: 'AppCredit' }
    & Pick<AdminTypes.AppCredit, 'id'>
  ) | (
    { __typename: 'AppInstallation' }
    & Pick<AdminTypes.AppInstallation, 'id'>
  ) | (
    { __typename: 'AppPurchaseOneTime' }
    & Pick<AdminTypes.AppPurchaseOneTime, 'id'>
  ) | (
    { __typename: 'AppRevenueAttributionRecord' }
    & Pick<AdminTypes.AppRevenueAttributionRecord, 'id'>
  ) | (
    { __typename: 'AppSubscription' }
    & Pick<AdminTypes.AppSubscription, 'id'>
  ) | (
    { __typename: 'AppUsageRecord' }
    & Pick<AdminTypes.AppUsageRecord, 'id'>
  ) | (
    { __typename: 'BasicEvent' }
    & Pick<AdminTypes.BasicEvent, 'id'>
  ) | (
    { __typename: 'BulkOperation' }
    & Pick<AdminTypes.BulkOperation, 'id'>
  ) | (
    { __typename: 'CalculatedOrder' }
    & Pick<AdminTypes.CalculatedOrder, 'id'>
  ) | (
    { __typename: 'CartTransform' }
    & Pick<AdminTypes.CartTransform, 'id'>
  ) | (
    { __typename: 'CatalogCsvOperation' }
    & Pick<AdminTypes.CatalogCsvOperation, 'id'>
  ) | (
    { __typename: 'Channel' }
    & Pick<AdminTypes.Channel, 'id'>
  ) | (
    { __typename: 'ChannelDefinition' }
    & Pick<AdminTypes.ChannelDefinition, 'id'>
  ) | (
    { __typename: 'ChannelInformation' }
    & Pick<AdminTypes.ChannelInformation, 'id'>
  ) | (
    { __typename: 'CheckoutProfile' }
    & Pick<AdminTypes.CheckoutProfile, 'id'>
  ) | (
    { __typename: 'Collection' }
    & Pick<AdminTypes.Collection, 'id'>
    & { isSmartCollection?: AdminTypes.Maybe<Pick<AdminTypes.CollectionRuleSet, 'appliedDisjunctively'>> }
  ) | (
    { __typename: 'CommentEvent' }
    & Pick<AdminTypes.CommentEvent, 'id'>
  ) | (
    { __typename: 'Company' }
    & Pick<AdminTypes.Company, 'id'>
  ) | (
    { __typename: 'CompanyAddress' }
    & Pick<AdminTypes.CompanyAddress, 'id'>
  ) | (
    { __typename: 'CompanyContact' }
    & Pick<AdminTypes.CompanyContact, 'id'>
  ) | (
    { __typename: 'CompanyContactRole' }
    & Pick<AdminTypes.CompanyContactRole, 'id'>
  ) | (
    { __typename: 'CompanyContactRoleAssignment' }
    & Pick<AdminTypes.CompanyContactRoleAssignment, 'id'>
  ) | (
    { __typename: 'CompanyLocation' }
    & Pick<AdminTypes.CompanyLocation, 'id'>
  ) | (
    { __typename: 'CompanyLocationCatalog' }
    & Pick<AdminTypes.CompanyLocationCatalog, 'id'>
  ) | (
    { __typename: 'Customer' }
    & Pick<AdminTypes.Customer, 'id'>
  ) | (
    { __typename: 'CustomerPaymentMethod' }
    & Pick<AdminTypes.CustomerPaymentMethod, 'id'>
  ) | (
    { __typename: 'CustomerSegmentMembersQuery' }
    & Pick<AdminTypes.CustomerSegmentMembersQuery, 'id'>
  ) | (
    { __typename: 'CustomerVisit' }
    & Pick<AdminTypes.CustomerVisit, 'id'>
  ) | (
    { __typename: 'DeliveryCarrierService' }
    & Pick<AdminTypes.DeliveryCarrierService, 'id'>
  ) | (
    { __typename: 'DeliveryCondition' }
    & Pick<AdminTypes.DeliveryCondition, 'id'>
  ) | (
    { __typename: 'DeliveryCountry' }
    & Pick<AdminTypes.DeliveryCountry, 'id'>
  ) | (
    { __typename: 'DeliveryCustomization' }
    & Pick<AdminTypes.DeliveryCustomization, 'id'>
  ) | (
    { __typename: 'DeliveryLocationGroup' }
    & Pick<AdminTypes.DeliveryLocationGroup, 'id'>
  ) | (
    { __typename: 'DeliveryMethod' }
    & Pick<AdminTypes.DeliveryMethod, 'id'>
  ) | (
    { __typename: 'DeliveryMethodDefinition' }
    & Pick<AdminTypes.DeliveryMethodDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryParticipant' }
    & Pick<AdminTypes.DeliveryParticipant, 'id'>
  ) | (
    { __typename: 'DeliveryProfile' }
    & Pick<AdminTypes.DeliveryProfile, 'id'>
  ) | (
    { __typename: 'DeliveryProfileItem' }
    & Pick<AdminTypes.DeliveryProfileItem, 'id'>
  ) | (
    { __typename: 'DeliveryProvince' }
    & Pick<AdminTypes.DeliveryProvince, 'id'>
  ) | (
    { __typename: 'DeliveryRateDefinition' }
    & Pick<AdminTypes.DeliveryRateDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryZone' }
    & Pick<AdminTypes.DeliveryZone, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticBxgy' }
    & Pick<AdminTypes.DiscountAutomaticBxgy, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticNode' }
    & Pick<AdminTypes.DiscountAutomaticNode, 'id'>
  ) | (
    { __typename: 'DiscountCodeNode' }
    & Pick<AdminTypes.DiscountCodeNode, 'id'>
  ) | (
    { __typename: 'DiscountNode' }
    & Pick<AdminTypes.DiscountNode, 'id'>
  ) | (
    { __typename: 'DiscountRedeemCodeBulkCreation' }
    & Pick<AdminTypes.DiscountRedeemCodeBulkCreation, 'id'>
  ) | (
    { __typename: 'Domain' }
    & Pick<AdminTypes.Domain, 'id'>
  ) | (
    { __typename: 'DraftOrder' }
    & Pick<AdminTypes.DraftOrder, 'id'>
  ) | (
    { __typename: 'DraftOrderLineItem' }
    & Pick<AdminTypes.DraftOrderLineItem, 'id'>
  ) | (
    { __typename: 'DraftOrderTag' }
    & Pick<AdminTypes.DraftOrderTag, 'id'>
  ) | (
    { __typename: 'Duty' }
    & Pick<AdminTypes.Duty, 'id'>
  ) | (
    { __typename: 'ExchangeV2' }
    & Pick<AdminTypes.ExchangeV2, 'id'>
  ) | (
    { __typename: 'ExternalVideo' }
    & Pick<AdminTypes.ExternalVideo, 'id'>
  ) | (
    { __typename: 'Fulfillment' }
    & Pick<AdminTypes.Fulfillment, 'id'>
  ) | (
    { __typename: 'FulfillmentConstraintRule' }
    & Pick<AdminTypes.FulfillmentConstraintRule, 'id'>
  ) | (
    { __typename: 'FulfillmentEvent' }
    & Pick<AdminTypes.FulfillmentEvent, 'id'>
  ) | (
    { __typename: 'FulfillmentLineItem' }
    & Pick<AdminTypes.FulfillmentLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrder' }
    & Pick<AdminTypes.FulfillmentOrder, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderDestination' }
    & Pick<AdminTypes.FulfillmentOrderDestination, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderLineItem' }
    & Pick<AdminTypes.FulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderMerchantRequest' }
    & Pick<AdminTypes.FulfillmentOrderMerchantRequest, 'id'>
  ) | (
    { __typename: 'GenericFile' }
    & Pick<AdminTypes.GenericFile, 'id'>
  ) | (
    { __typename: 'GiftCard' }
    & Pick<AdminTypes.GiftCard, 'id'>
  ) | (
    { __typename: 'InventoryAdjustmentGroup' }
    & Pick<AdminTypes.InventoryAdjustmentGroup, 'id'>
  ) | (
    { __typename: 'InventoryItem' }
    & Pick<AdminTypes.InventoryItem, 'id'>
  ) | (
    { __typename: 'InventoryLevel' }
    & Pick<AdminTypes.InventoryLevel, 'id'>
  ) | (
    { __typename: 'LineItem' }
    & Pick<AdminTypes.LineItem, 'id'>
  ) | (
    { __typename: 'LineItemMutable' }
    & Pick<AdminTypes.LineItemMutable, 'id'>
  ) | (
    { __typename: 'Location' }
    & Pick<AdminTypes.Location, 'id'>
  ) | (
    { __typename: 'MailingAddress' }
    & Pick<AdminTypes.MailingAddress, 'id'>
  ) | (
    { __typename: 'Market' }
    & Pick<AdminTypes.Market, 'id'>
  ) | (
    { __typename: 'MarketCatalog' }
    & Pick<AdminTypes.MarketCatalog, 'id'>
  ) | (
    { __typename: 'MarketRegionCountry' }
    & Pick<AdminTypes.MarketRegionCountry, 'id'>
  ) | (
    { __typename: 'MarketWebPresence' }
    & Pick<AdminTypes.MarketWebPresence, 'id'>
  ) | (
    { __typename: 'MarketingActivity' }
    & Pick<AdminTypes.MarketingActivity, 'id'>
  ) | (
    { __typename: 'MarketingEvent' }
    & Pick<AdminTypes.MarketingEvent, 'id'>
  ) | (
    { __typename: 'MediaImage' }
    & Pick<AdminTypes.MediaImage, 'id'>
  ) | (
    { __typename: 'Metafield' }
    & Pick<AdminTypes.Metafield, 'id'>
  ) | (
    { __typename: 'MetafieldDefinition' }
    & Pick<AdminTypes.MetafieldDefinition, 'id'>
  ) | (
    { __typename: 'MetafieldStorefrontVisibility' }
    & Pick<AdminTypes.MetafieldStorefrontVisibility, 'id'>
  ) | (
    { __typename: 'Metaobject' }
    & Pick<AdminTypes.Metaobject, 'id'>
  ) | (
    { __typename: 'MetaobjectDefinition' }
    & Pick<AdminTypes.MetaobjectDefinition, 'id'>
  ) | (
    { __typename: 'Model3d' }
    & Pick<AdminTypes.Model3d, 'id'>
  ) | (
    { __typename: 'OnlineStoreArticle' }
    & Pick<AdminTypes.OnlineStoreArticle, 'id'>
  ) | (
    { __typename: 'OnlineStoreBlog' }
    & Pick<AdminTypes.OnlineStoreBlog, 'id'>
  ) | (
    { __typename: 'OnlineStorePage' }
    & Pick<AdminTypes.OnlineStorePage, 'id'>
  ) | (
    { __typename: 'Order' }
    & Pick<AdminTypes.Order, 'id'>
  ) | (
    { __typename: 'OrderDisputeSummary' }
    & Pick<AdminTypes.OrderDisputeSummary, 'id'>
  ) | (
    { __typename: 'OrderTransaction' }
    & Pick<AdminTypes.OrderTransaction, 'id'>
  ) | (
    { __typename: 'PaymentCustomization' }
    & Pick<AdminTypes.PaymentCustomization, 'id'>
  ) | (
    { __typename: 'PaymentMandate' }
    & Pick<AdminTypes.PaymentMandate, 'id'>
  ) | (
    { __typename: 'PaymentSchedule' }
    & Pick<AdminTypes.PaymentSchedule, 'id'>
  ) | (
    { __typename: 'PaymentTerms' }
    & Pick<AdminTypes.PaymentTerms, 'id'>
  ) | (
    { __typename: 'PaymentTermsTemplate' }
    & Pick<AdminTypes.PaymentTermsTemplate, 'id'>
  ) | (
    { __typename: 'PriceList' }
    & Pick<AdminTypes.PriceList, 'id'>
  ) | (
    { __typename: 'PriceRule' }
    & Pick<AdminTypes.PriceRule, 'id'>
  ) | (
    { __typename: 'PriceRuleDiscountCode' }
    & Pick<AdminTypes.PriceRuleDiscountCode, 'id'>
  ) | (
    { __typename: 'PrivateMetafield' }
    & Pick<AdminTypes.PrivateMetafield, 'id'>
  ) | (
    { __typename: 'Product' }
    & Pick<AdminTypes.Product, 'id'>
  ) | (
    { __typename: 'ProductFeed' }
    & Pick<AdminTypes.ProductFeed, 'id'>
  ) | (
    { __typename: 'ProductOption' }
    & Pick<AdminTypes.ProductOption, 'id'>
  ) | (
    { __typename: 'ProductTaxonomyNode' }
    & Pick<AdminTypes.ProductTaxonomyNode, 'id'>
  ) | (
    { __typename: 'ProductVariant' }
    & Pick<AdminTypes.ProductVariant, 'id'>
  ) | (
    { __typename: 'ProductVariantComponent' }
    & Pick<AdminTypes.ProductVariantComponent, 'id'>
  ) | (
    { __typename: 'Publication' }
    & Pick<AdminTypes.Publication, 'id'>
  ) | (
    { __typename: 'PublicationResourceOperation' }
    & Pick<AdminTypes.PublicationResourceOperation, 'id'>
  ) | (
    { __typename: 'QuantityPriceBreak' }
    & Pick<AdminTypes.QuantityPriceBreak, 'id'>
  ) | (
    { __typename: 'Refund' }
    & Pick<AdminTypes.Refund, 'id'>
  ) | (
    { __typename: 'Return' }
    & Pick<AdminTypes.Return, 'id'>
  ) | (
    { __typename: 'ReturnLineItem' }
    & Pick<AdminTypes.ReturnLineItem, 'id'>
  ) | (
    { __typename: 'ReturnableFulfillment' }
    & Pick<AdminTypes.ReturnableFulfillment, 'id'>
  ) | (
    { __typename: 'ReverseDelivery' }
    & Pick<AdminTypes.ReverseDelivery, 'id'>
  ) | (
    { __typename: 'ReverseDeliveryLineItem' }
    & Pick<AdminTypes.ReverseDeliveryLineItem, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrder' }
    & Pick<AdminTypes.ReverseFulfillmentOrder, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderDisposition' }
    & Pick<AdminTypes.ReverseFulfillmentOrderDisposition, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderLineItem' }
    & Pick<AdminTypes.ReverseFulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'SaleAdditionalFee' }
    & Pick<AdminTypes.SaleAdditionalFee, 'id'>
  ) | (
    { __typename: 'SavedSearch' }
    & Pick<AdminTypes.SavedSearch, 'id'>
  ) | (
    { __typename: 'ScriptTag' }
    & Pick<AdminTypes.ScriptTag, 'id'>
  ) | (
    { __typename: 'Segment' }
    & Pick<AdminTypes.Segment, 'id'>
  ) | (
    { __typename: 'SellingPlan' }
    & Pick<AdminTypes.SellingPlan, 'id'>
  ) | (
    { __typename: 'SellingPlanGroup' }
    & Pick<AdminTypes.SellingPlanGroup, 'id'>
  ) | (
    { __typename: 'ServerPixel' }
    & Pick<AdminTypes.ServerPixel, 'id'>
  ) | (
    { __typename: 'Shop' }
    & Pick<AdminTypes.Shop, 'id'>
  ) | (
    { __typename: 'ShopAddress' }
    & Pick<AdminTypes.ShopAddress, 'id'>
  ) | (
    { __typename: 'ShopPolicy' }
    & Pick<AdminTypes.ShopPolicy, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsAccount' }
    & Pick<AdminTypes.ShopifyPaymentsAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsBankAccount' }
    & Pick<AdminTypes.ShopifyPaymentsBankAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDispute' }
    & Pick<AdminTypes.ShopifyPaymentsDispute, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeEvidence' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeEvidence, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFileUpload' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFileUpload, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFulfillment' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFulfillment, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsPayout' }
    & Pick<AdminTypes.ShopifyPaymentsPayout, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsVerification' }
    & Pick<AdminTypes.ShopifyPaymentsVerification, 'id'>
  ) | (
    { __typename: 'StaffMember' }
    & Pick<AdminTypes.StaffMember, 'id'>
  ) | (
    { __typename: 'StandardMetafieldDefinitionTemplate' }
    & Pick<AdminTypes.StandardMetafieldDefinitionTemplate, 'id'>
  ) | (
    { __typename: 'StorefrontAccessToken' }
    & Pick<AdminTypes.StorefrontAccessToken, 'id'>
  ) | (
    { __typename: 'SubscriptionBillingAttempt' }
    & Pick<AdminTypes.SubscriptionBillingAttempt, 'id'>
  ) | (
    { __typename: 'SubscriptionContract' }
    & Pick<AdminTypes.SubscriptionContract, 'id'>
  ) | (
    { __typename: 'SubscriptionDraft' }
    & Pick<AdminTypes.SubscriptionDraft, 'id'>
  ) | (
    { __typename: 'TenderTransaction' }
    & Pick<AdminTypes.TenderTransaction, 'id'>
  ) | (
    { __typename: 'TransactionFee' }
    & Pick<AdminTypes.TransactionFee, 'id'>
  ) | (
    { __typename: 'UrlRedirect' }
    & Pick<AdminTypes.UrlRedirect, 'id'>
  ) | (
    { __typename: 'UrlRedirectImport' }
    & Pick<AdminTypes.UrlRedirectImport, 'id'>
  ) | (
    { __typename: 'Video' }
    & Pick<AdminTypes.Video, 'id'>
  ) | (
    { __typename: 'WebPixel' }
    & Pick<AdminTypes.WebPixel, 'id'>
  ) | (
    { __typename: 'WebhookSubscription' }
    & Pick<AdminTypes.WebhookSubscription, 'id'>
  )>> };

export type CustomerAddressFieldsFragment = Pick<AdminTypes.MailingAddress, 'address1' | 'address2' | 'city' | 'company' | 'coordinatesValidated' | 'country' | 'countryCodeV2' | 'firstName' | 'formattedArea' | 'id' | 'lastName' | 'latitude' | 'longitude' | 'name' | 'phone' | 'province' | 'provinceCode' | 'timeZone' | 'zip' | 'formatted'>;

export type CustomerFieldsFragment = (
  Pick<AdminTypes.Customer, 'id' | 'createdAt' | 'displayName' | 'email' | 'firstName' | 'lastName' | 'lifetimeDuration' | 'locale' | 'multipassIdentifier' | 'note' | 'numberOfOrders' | 'phone' | 'productSubscriberStatus' | 'state' | 'tags' | 'taxExempt' | 'taxExemptions' | 'unsubscribeUrl' | 'updatedAt' | 'validEmailAddress' | 'verifiedEmail' | 'canDelete'>
  & { addresses: Array<Pick<AdminTypes.MailingAddress, 'address1' | 'address2' | 'city' | 'company' | 'coordinatesValidated' | 'country' | 'countryCodeV2' | 'firstName' | 'formattedArea' | 'id' | 'lastName' | 'latitude' | 'longitude' | 'name' | 'phone' | 'province' | 'provinceCode' | 'timeZone' | 'zip' | 'formatted'>>, defaultAddress?: AdminTypes.Maybe<Pick<AdminTypes.MailingAddress, 'address1' | 'address2' | 'city' | 'company' | 'coordinatesValidated' | 'country' | 'countryCodeV2' | 'firstName' | 'formattedArea' | 'id' | 'lastName' | 'latitude' | 'longitude' | 'name' | 'phone' | 'province' | 'provinceCode' | 'timeZone' | 'zip' | 'formatted'>>, amountSpent: Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'>, emailMarketingConsent?: AdminTypes.Maybe<Pick<AdminTypes.CustomerEmailMarketingConsentState, 'consentUpdatedAt' | 'marketingOptInLevel' | 'marketingState'>>, smsMarketingConsent?: AdminTypes.Maybe<Pick<AdminTypes.CustomerSmsMarketingConsentState, 'consentCollectedFrom' | 'consentUpdatedAt' | 'marketingOptInLevel' | 'marketingState'>>, statistics: Pick<AdminTypes.CustomerStatistics, 'predictedSpendTier'>, metafields?: { nodes: Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    )> } }
);

export type GetCustomersWithMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetCustomersWithMetafieldsQuery = { customers: { nodes: Array<(
      Pick<AdminTypes.Customer, 'id' | 'createdAt' | 'displayName' | 'email' | 'firstName' | 'lastName' | 'lifetimeDuration' | 'locale' | 'multipassIdentifier' | 'note' | 'numberOfOrders' | 'phone' | 'productSubscriberStatus' | 'state' | 'tags' | 'taxExempt' | 'taxExemptions' | 'unsubscribeUrl' | 'updatedAt' | 'validEmailAddress' | 'verifiedEmail' | 'canDelete'>
      & { addresses: Array<Pick<AdminTypes.MailingAddress, 'address1' | 'address2' | 'city' | 'company' | 'coordinatesValidated' | 'country' | 'countryCodeV2' | 'firstName' | 'formattedArea' | 'id' | 'lastName' | 'latitude' | 'longitude' | 'name' | 'phone' | 'province' | 'provinceCode' | 'timeZone' | 'zip' | 'formatted'>>, defaultAddress?: AdminTypes.Maybe<Pick<AdminTypes.MailingAddress, 'address1' | 'address2' | 'city' | 'company' | 'coordinatesValidated' | 'country' | 'countryCodeV2' | 'firstName' | 'formattedArea' | 'id' | 'lastName' | 'latitude' | 'longitude' | 'name' | 'phone' | 'province' | 'provinceCode' | 'timeZone' | 'zip' | 'formatted'>>, amountSpent: Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'>, emailMarketingConsent?: AdminTypes.Maybe<Pick<AdminTypes.CustomerEmailMarketingConsentState, 'consentUpdatedAt' | 'marketingOptInLevel' | 'marketingState'>>, smsMarketingConsent?: AdminTypes.Maybe<Pick<AdminTypes.CustomerSmsMarketingConsentState, 'consentCollectedFrom' | 'consentUpdatedAt' | 'marketingOptInLevel' | 'marketingState'>>, statistics: Pick<AdminTypes.CustomerStatistics, 'predictedSpendTier'>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

type FileFields_GenericFile_Fragment = (
  { __typename: 'GenericFile' }
  & AdminTypes.MakeOptional<Pick<AdminTypes.GenericFile, 'mimeType' | 'originalFileSize' | 'url' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'originalFileSize' | 'updatedAt' | 'alt' | 'createdAt'>
  & { thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
);

type FileFields_MediaImage_Fragment = (
  { __typename: 'MediaImage' }
  & AdminTypes.MakeOptional<Pick<AdminTypes.MediaImage, 'mimeType' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'updatedAt' | 'alt' | 'createdAt'>
  & { image?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.Image, 'url' | 'width' | 'height'>, 'width' | 'height'>>, originalSource?: AdminTypes.Maybe<Pick<AdminTypes.MediaImageOriginalSource, 'fileSize'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
);

type FileFields_Video_Fragment = (
  { __typename: 'Video' }
  & AdminTypes.MakeOptional<Pick<AdminTypes.Video, 'filename' | 'duration' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'duration' | 'updatedAt' | 'alt' | 'createdAt'>
  & { originalSource?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.VideoSource, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
);

export type FileFieldsFragment = FileFields_GenericFile_Fragment | FileFields_MediaImage_Fragment | FileFields_Video_Fragment;

export type GetFilesQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeAlt: AdminTypes.Scalars['Boolean']['input'];
  includeCreatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeDuration: AdminTypes.Scalars['Boolean']['input'];
  includeFileSize: AdminTypes.Scalars['Boolean']['input'];
  includeHeight: AdminTypes.Scalars['Boolean']['input'];
  includeMimeType: AdminTypes.Scalars['Boolean']['input'];
  includeThumbnail: AdminTypes.Scalars['Boolean']['input'];
  includeUpdatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeUrl: AdminTypes.Scalars['Boolean']['input'];
  includeWidth: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetFilesQuery = { files: { nodes: Array<(
      { __typename: 'GenericFile' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.GenericFile, 'mimeType' | 'originalFileSize' | 'url' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'originalFileSize' | 'updatedAt' | 'alt' | 'createdAt'>
      & { thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    ) | (
      { __typename: 'MediaImage' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.MediaImage, 'mimeType' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'updatedAt' | 'alt' | 'createdAt'>
      & { image?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.Image, 'url' | 'width' | 'height'>, 'width' | 'height'>>, originalSource?: AdminTypes.Maybe<Pick<AdminTypes.MediaImageOriginalSource, 'fileSize'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    ) | (
      { __typename: 'Video' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.Video, 'filename' | 'duration' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'duration' | 'updatedAt' | 'alt' | 'createdAt'>
      & { originalSource?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.VideoSource, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type GetSingleFileQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  includeAlt: AdminTypes.Scalars['Boolean']['input'];
  includeCreatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeDuration: AdminTypes.Scalars['Boolean']['input'];
  includeFileSize: AdminTypes.Scalars['Boolean']['input'];
  includeHeight: AdminTypes.Scalars['Boolean']['input'];
  includeMimeType: AdminTypes.Scalars['Boolean']['input'];
  includeThumbnail: AdminTypes.Scalars['Boolean']['input'];
  includeUpdatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeUrl: AdminTypes.Scalars['Boolean']['input'];
  includeWidth: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetSingleFileQuery = { node?: AdminTypes.Maybe<Pick<AdminTypes.AbandonedCheckout, 'id'> | Pick<AdminTypes.Abandonment, 'id'> | Pick<AdminTypes.AddAllProductsOperation, 'id'> | Pick<AdminTypes.AdditionalFee, 'id'> | Pick<AdminTypes.App, 'id'> | Pick<AdminTypes.AppCatalog, 'id'> | Pick<AdminTypes.AppCredit, 'id'> | Pick<AdminTypes.AppInstallation, 'id'> | Pick<AdminTypes.AppPurchaseOneTime, 'id'> | Pick<AdminTypes.AppRevenueAttributionRecord, 'id'> | Pick<AdminTypes.AppSubscription, 'id'> | Pick<AdminTypes.AppUsageRecord, 'id'> | Pick<AdminTypes.BasicEvent, 'id'> | Pick<AdminTypes.BulkOperation, 'id'> | Pick<AdminTypes.CalculatedOrder, 'id'> | Pick<AdminTypes.CartTransform, 'id'> | Pick<AdminTypes.CatalogCsvOperation, 'id'> | Pick<AdminTypes.Channel, 'id'> | Pick<AdminTypes.ChannelDefinition, 'id'> | Pick<AdminTypes.ChannelInformation, 'id'> | Pick<AdminTypes.CheckoutProfile, 'id'> | Pick<AdminTypes.Collection, 'id'> | Pick<AdminTypes.CommentEvent, 'id'> | Pick<AdminTypes.Company, 'id'> | Pick<AdminTypes.CompanyAddress, 'id'> | Pick<AdminTypes.CompanyContact, 'id'> | Pick<AdminTypes.CompanyContactRole, 'id'> | Pick<AdminTypes.CompanyContactRoleAssignment, 'id'> | Pick<AdminTypes.CompanyLocation, 'id'> | Pick<AdminTypes.CompanyLocationCatalog, 'id'> | Pick<AdminTypes.Customer, 'id'> | Pick<AdminTypes.CustomerPaymentMethod, 'id'> | Pick<AdminTypes.CustomerSegmentMembersQuery, 'id'> | Pick<AdminTypes.CustomerVisit, 'id'> | Pick<AdminTypes.DeliveryCarrierService, 'id'> | Pick<AdminTypes.DeliveryCondition, 'id'> | Pick<AdminTypes.DeliveryCountry, 'id'> | Pick<AdminTypes.DeliveryCustomization, 'id'> | Pick<AdminTypes.DeliveryLocationGroup, 'id'> | Pick<AdminTypes.DeliveryMethod, 'id'> | Pick<AdminTypes.DeliveryMethodDefinition, 'id'> | Pick<AdminTypes.DeliveryParticipant, 'id'> | Pick<AdminTypes.DeliveryProfile, 'id'> | Pick<AdminTypes.DeliveryProfileItem, 'id'> | Pick<AdminTypes.DeliveryProvince, 'id'> | Pick<AdminTypes.DeliveryRateDefinition, 'id'> | Pick<AdminTypes.DeliveryZone, 'id'> | Pick<AdminTypes.DiscountAutomaticBxgy, 'id'> | Pick<AdminTypes.DiscountAutomaticNode, 'id'> | Pick<AdminTypes.DiscountCodeNode, 'id'> | Pick<AdminTypes.DiscountNode, 'id'> | Pick<AdminTypes.DiscountRedeemCodeBulkCreation, 'id'> | Pick<AdminTypes.Domain, 'id'> | Pick<AdminTypes.DraftOrder, 'id'> | Pick<AdminTypes.DraftOrderLineItem, 'id'> | Pick<AdminTypes.DraftOrderTag, 'id'> | Pick<AdminTypes.Duty, 'id'> | Pick<AdminTypes.ExchangeV2, 'id'> | Pick<AdminTypes.ExternalVideo, 'id'> | Pick<AdminTypes.Fulfillment, 'id'> | Pick<AdminTypes.FulfillmentConstraintRule, 'id'> | Pick<AdminTypes.FulfillmentEvent, 'id'> | Pick<AdminTypes.FulfillmentLineItem, 'id'> | Pick<AdminTypes.FulfillmentOrder, 'id'> | Pick<AdminTypes.FulfillmentOrderDestination, 'id'> | Pick<AdminTypes.FulfillmentOrderLineItem, 'id'> | Pick<AdminTypes.FulfillmentOrderMerchantRequest, 'id'> | (
    { __typename: 'GenericFile' }
    & AdminTypes.MakeOptional<Pick<AdminTypes.GenericFile, 'id' | 'mimeType' | 'originalFileSize' | 'url' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'originalFileSize' | 'updatedAt' | 'alt' | 'createdAt'>
    & { thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
  ) | Pick<AdminTypes.GiftCard, 'id'> | Pick<AdminTypes.InventoryAdjustmentGroup, 'id'> | Pick<AdminTypes.InventoryItem, 'id'> | Pick<AdminTypes.InventoryLevel, 'id'> | Pick<AdminTypes.LineItem, 'id'> | Pick<AdminTypes.LineItemMutable, 'id'> | Pick<AdminTypes.Location, 'id'> | Pick<AdminTypes.MailingAddress, 'id'> | Pick<AdminTypes.Market, 'id'> | Pick<AdminTypes.MarketCatalog, 'id'> | Pick<AdminTypes.MarketRegionCountry, 'id'> | Pick<AdminTypes.MarketWebPresence, 'id'> | Pick<AdminTypes.MarketingActivity, 'id'> | Pick<AdminTypes.MarketingEvent, 'id'> | (
    { __typename: 'MediaImage' }
    & AdminTypes.MakeOptional<Pick<AdminTypes.MediaImage, 'id' | 'mimeType' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'updatedAt' | 'alt' | 'createdAt'>
    & { image?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.Image, 'url' | 'width' | 'height'>, 'width' | 'height'>>, originalSource?: AdminTypes.Maybe<Pick<AdminTypes.MediaImageOriginalSource, 'fileSize'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
  ) | Pick<AdminTypes.Metafield, 'id'> | Pick<AdminTypes.MetafieldDefinition, 'id'> | Pick<AdminTypes.MetafieldStorefrontVisibility, 'id'> | Pick<AdminTypes.Metaobject, 'id'> | Pick<AdminTypes.MetaobjectDefinition, 'id'> | Pick<AdminTypes.Model3d, 'id'> | Pick<AdminTypes.OnlineStoreArticle, 'id'> | Pick<AdminTypes.OnlineStoreBlog, 'id'> | Pick<AdminTypes.OnlineStorePage, 'id'> | Pick<AdminTypes.Order, 'id'> | Pick<AdminTypes.OrderDisputeSummary, 'id'> | Pick<AdminTypes.OrderTransaction, 'id'> | Pick<AdminTypes.PaymentCustomization, 'id'> | Pick<AdminTypes.PaymentMandate, 'id'> | Pick<AdminTypes.PaymentSchedule, 'id'> | Pick<AdminTypes.PaymentTerms, 'id'> | Pick<AdminTypes.PaymentTermsTemplate, 'id'> | Pick<AdminTypes.PriceList, 'id'> | Pick<AdminTypes.PriceRule, 'id'> | Pick<AdminTypes.PriceRuleDiscountCode, 'id'> | Pick<AdminTypes.PrivateMetafield, 'id'> | Pick<AdminTypes.Product, 'id'> | Pick<AdminTypes.ProductFeed, 'id'> | Pick<AdminTypes.ProductOption, 'id'> | Pick<AdminTypes.ProductTaxonomyNode, 'id'> | Pick<AdminTypes.ProductVariant, 'id'> | Pick<AdminTypes.ProductVariantComponent, 'id'> | Pick<AdminTypes.Publication, 'id'> | Pick<AdminTypes.PublicationResourceOperation, 'id'> | Pick<AdminTypes.QuantityPriceBreak, 'id'> | Pick<AdminTypes.Refund, 'id'> | Pick<AdminTypes.Return, 'id'> | Pick<AdminTypes.ReturnLineItem, 'id'> | Pick<AdminTypes.ReturnableFulfillment, 'id'> | Pick<AdminTypes.ReverseDelivery, 'id'> | Pick<AdminTypes.ReverseDeliveryLineItem, 'id'> | Pick<AdminTypes.ReverseFulfillmentOrder, 'id'> | Pick<AdminTypes.ReverseFulfillmentOrderDisposition, 'id'> | Pick<AdminTypes.ReverseFulfillmentOrderLineItem, 'id'> | Pick<AdminTypes.SaleAdditionalFee, 'id'> | Pick<AdminTypes.SavedSearch, 'id'> | Pick<AdminTypes.ScriptTag, 'id'> | Pick<AdminTypes.Segment, 'id'> | Pick<AdminTypes.SellingPlan, 'id'> | Pick<AdminTypes.SellingPlanGroup, 'id'> | Pick<AdminTypes.ServerPixel, 'id'> | Pick<AdminTypes.Shop, 'id'> | Pick<AdminTypes.ShopAddress, 'id'> | Pick<AdminTypes.ShopPolicy, 'id'> | Pick<AdminTypes.ShopifyPaymentsAccount, 'id'> | Pick<AdminTypes.ShopifyPaymentsBankAccount, 'id'> | Pick<AdminTypes.ShopifyPaymentsDispute, 'id'> | Pick<AdminTypes.ShopifyPaymentsDisputeEvidence, 'id'> | Pick<AdminTypes.ShopifyPaymentsDisputeFileUpload, 'id'> | Pick<AdminTypes.ShopifyPaymentsDisputeFulfillment, 'id'> | Pick<AdminTypes.ShopifyPaymentsPayout, 'id'> | Pick<AdminTypes.ShopifyPaymentsVerification, 'id'> | Pick<AdminTypes.StaffMember, 'id'> | Pick<AdminTypes.StandardMetafieldDefinitionTemplate, 'id'> | Pick<AdminTypes.StorefrontAccessToken, 'id'> | Pick<AdminTypes.SubscriptionBillingAttempt, 'id'> | Pick<AdminTypes.SubscriptionContract, 'id'> | Pick<AdminTypes.SubscriptionDraft, 'id'> | Pick<AdminTypes.TenderTransaction, 'id'> | Pick<AdminTypes.TransactionFee, 'id'> | Pick<AdminTypes.UrlRedirect, 'id'> | Pick<AdminTypes.UrlRedirectImport, 'id'> | (
    { __typename: 'Video' }
    & AdminTypes.MakeOptional<Pick<AdminTypes.Video, 'id' | 'filename' | 'duration' | 'updatedAt' | 'alt' | 'createdAt'>, 'duration' | 'updatedAt' | 'alt' | 'createdAt'>
    & { originalSource?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.VideoSource, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
  ) | Pick<AdminTypes.WebPixel, 'id'> | Pick<AdminTypes.WebhookSubscription, 'id'>> };

export type FileUpdateMutationVariables = AdminTypes.Exact<{
  files: Array<AdminTypes.FileUpdateInput> | AdminTypes.FileUpdateInput;
  includeAlt: AdminTypes.Scalars['Boolean']['input'];
  includeCreatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeDuration: AdminTypes.Scalars['Boolean']['input'];
  includeFileSize: AdminTypes.Scalars['Boolean']['input'];
  includeHeight: AdminTypes.Scalars['Boolean']['input'];
  includeMimeType: AdminTypes.Scalars['Boolean']['input'];
  includeThumbnail: AdminTypes.Scalars['Boolean']['input'];
  includeUpdatedAt: AdminTypes.Scalars['Boolean']['input'];
  includeUrl: AdminTypes.Scalars['Boolean']['input'];
  includeWidth: AdminTypes.Scalars['Boolean']['input'];
}>;


export type FileUpdateMutation = { fileUpdate?: AdminTypes.Maybe<{ files?: AdminTypes.Maybe<Array<(
      { __typename: 'GenericFile' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.GenericFile, 'mimeType' | 'originalFileSize' | 'url' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'originalFileSize' | 'updatedAt' | 'alt' | 'createdAt'>
      & { thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    ) | (
      { __typename: 'MediaImage' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.MediaImage, 'mimeType' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'mimeType' | 'updatedAt' | 'alt' | 'createdAt'>
      & { image?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.Image, 'url' | 'width' | 'height'>, 'width' | 'height'>>, originalSource?: AdminTypes.Maybe<Pick<AdminTypes.MediaImageOriginalSource, 'fileSize'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    ) | (
      { __typename: 'Video' }
      & AdminTypes.MakeOptional<Pick<AdminTypes.Video, 'filename' | 'duration' | 'id' | 'updatedAt' | 'alt' | 'createdAt'>, 'duration' | 'updatedAt' | 'alt' | 'createdAt'>
      & { originalSource?: AdminTypes.Maybe<AdminTypes.MakeOptional<Pick<AdminTypes.VideoSource, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>, 'fileSize' | 'height' | 'width' | 'mimeType' | 'url'>>, thumbnail?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>> }> }
    )>>, userErrors: Array<Pick<AdminTypes.FilesUserError, 'field' | 'message'>> }> };

export type FileDeleteMutationVariables = AdminTypes.Exact<{
  fileIds: Array<AdminTypes.Scalars['ID']['input']> | AdminTypes.Scalars['ID']['input'];
}>;


export type FileDeleteMutation = { fileDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.FileDeletePayload, 'deletedFileIds'>
    & { userErrors: Array<Pick<AdminTypes.FilesUserError, 'field' | 'message' | 'code'>> }
  )> };

export type InventoryItemFieldsFragment = (
  Pick<AdminTypes.InventoryItem, 'harmonizedSystemCode' | 'createdAt' | 'id' | 'inventoryHistoryUrl' | 'provinceCodeOfOrigin' | 'requiresShipping' | 'sku' | 'tracked' | 'updatedAt' | 'countryCodeOfOrigin' | 'locationsCount'>
  & { trackedEditable: Pick<AdminTypes.EditableProperty, 'locked' | 'reason'>, unitCost?: AdminTypes.Maybe<Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'>>, variant: Pick<AdminTypes.ProductVariant, 'id'> }
);

export type GetInventoryItemsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetInventoryItemsQuery = { inventoryItems: { nodes: Array<(
      Pick<AdminTypes.InventoryItem, 'harmonizedSystemCode' | 'createdAt' | 'id' | 'inventoryHistoryUrl' | 'provinceCodeOfOrigin' | 'requiresShipping' | 'sku' | 'tracked' | 'updatedAt' | 'countryCodeOfOrigin' | 'locationsCount'>
      & { trackedEditable: Pick<AdminTypes.EditableProperty, 'locked' | 'reason'>, unitCost?: AdminTypes.Maybe<Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'>>, variant: Pick<AdminTypes.ProductVariant, 'id'> }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type InventoryItemUpdateMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  input: AdminTypes.InventoryItemUpdateInput;
}>;


export type InventoryItemUpdateMutation = { inventoryItemUpdate?: AdminTypes.Maybe<{ inventoryItem?: AdminTypes.Maybe<(
      Pick<AdminTypes.InventoryItem, 'harmonizedSystemCode' | 'createdAt' | 'id' | 'inventoryHistoryUrl' | 'provinceCodeOfOrigin' | 'requiresShipping' | 'sku' | 'tracked' | 'updatedAt' | 'countryCodeOfOrigin' | 'locationsCount'>
      & { trackedEditable: Pick<AdminTypes.EditableProperty, 'locked' | 'reason'>, unitCost?: AdminTypes.Maybe<Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'>>, variant: Pick<AdminTypes.ProductVariant, 'id'> }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type LocationFragment = (
  Pick<AdminTypes.Location, 'id' | 'name' | 'isActive' | 'fulfillsOnlineOrders' | 'hasActiveInventory' | 'shipsInventory'>
  & { address: Pick<AdminTypes.LocationAddress, 'address1' | 'address2' | 'city' | 'country' | 'countryCode' | 'phone' | 'zip' | 'province' | 'provinceCode'>, fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'handle' | 'serviceName'>>, localPickupSettingsV2?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryLocalPickupSettings, 'instructions' | 'pickupTime'>>, metafields?: { nodes: Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    )> } }
);

export type GetLocationsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
  includeFulfillmentService: AdminTypes.Scalars['Boolean']['input'];
  includeLocalPickupSettings: AdminTypes.Scalars['Boolean']['input'];
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetLocationsQuery = { locations: { nodes: Array<(
      Pick<AdminTypes.Location, 'id' | 'name' | 'isActive' | 'fulfillsOnlineOrders' | 'hasActiveInventory' | 'shipsInventory'>
      & { address: Pick<AdminTypes.LocationAddress, 'address1' | 'address2' | 'city' | 'country' | 'countryCode' | 'phone' | 'zip' | 'province' | 'provinceCode'>, fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'handle' | 'serviceName'>>, localPickupSettingsV2?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryLocalPickupSettings, 'instructions' | 'pickupTime'>>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type GetSingleLocationQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
  includeFulfillmentService: AdminTypes.Scalars['Boolean']['input'];
  includeLocalPickupSettings: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetSingleLocationQuery = { location?: AdminTypes.Maybe<(
    Pick<AdminTypes.Location, 'id' | 'name' | 'isActive' | 'fulfillsOnlineOrders' | 'hasActiveInventory' | 'shipsInventory'>
    & { address: Pick<AdminTypes.LocationAddress, 'address1' | 'address2' | 'city' | 'country' | 'countryCode' | 'phone' | 'zip' | 'province' | 'provinceCode'>, fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'handle' | 'serviceName'>>, localPickupSettingsV2?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryLocalPickupSettings, 'instructions' | 'pickupTime'>>, metafields?: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  )> };

export type LocationEditMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  input: AdminTypes.LocationEditInput;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
  includeFulfillmentService: AdminTypes.Scalars['Boolean']['input'];
  includeLocalPickupSettings: AdminTypes.Scalars['Boolean']['input'];
}>;


export type LocationEditMutation = { locationEdit?: AdminTypes.Maybe<{ location?: AdminTypes.Maybe<(
      Pick<AdminTypes.Location, 'id' | 'name' | 'isActive' | 'fulfillsOnlineOrders' | 'hasActiveInventory' | 'shipsInventory'>
      & { address: Pick<AdminTypes.LocationAddress, 'address1' | 'address2' | 'city' | 'country' | 'countryCode' | 'phone' | 'zip' | 'province' | 'provinceCode'>, fulfillmentService?: AdminTypes.Maybe<Pick<AdminTypes.FulfillmentService, 'handle' | 'serviceName'>>, localPickupSettingsV2?: AdminTypes.Maybe<Pick<AdminTypes.DeliveryLocalPickupSettings, 'instructions' | 'pickupTime'>>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, userErrors: Array<Pick<AdminTypes.LocationEditUserError, 'field' | 'message'>> }> };

export type LocationActivateMutationVariables = AdminTypes.Exact<{
  locationId: AdminTypes.Scalars['ID']['input'];
}>;


export type LocationActivateMutation = { locationActivate?: AdminTypes.Maybe<{ location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'name' | 'isActive'>>, locationActivateUserErrors: Array<Pick<AdminTypes.LocationActivateUserError, 'code' | 'field' | 'message'>> }> };

export type LocationDeactivateMutationVariables = AdminTypes.Exact<{
  locationId: AdminTypes.Scalars['ID']['input'];
  destinationLocationId?: AdminTypes.InputMaybe<AdminTypes.Scalars['ID']['input']>;
}>;


export type LocationDeactivateMutation = { locationDeactivate?: AdminTypes.Maybe<{ location?: AdminTypes.Maybe<Pick<AdminTypes.Location, 'name' | 'isActive'>>, locationDeactivateUserErrors: Array<Pick<AdminTypes.LocationDeactivateUserError, 'code' | 'field' | 'message'>> }> };

export type MetafieldDefinitionFragment = (
  Pick<AdminTypes.MetafieldDefinition, 'key' | 'id' | 'namespace' | 'name' | 'description' | 'metafieldsCount' | 'ownerType' | 'pinnedPosition' | 'validationStatus' | 'visibleToStorefrontApi'>
  & { type: Pick<AdminTypes.MetafieldDefinitionType, 'name'>, validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
);

export type GetMetafieldDefinitionsQueryVariables = AdminTypes.Exact<{
  ownerType: AdminTypes.MetafieldOwnerType;
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetMetafieldDefinitionsQuery = { metafieldDefinitions: { nodes: Array<(
      Pick<AdminTypes.MetafieldDefinition, 'key' | 'id' | 'namespace' | 'name' | 'description' | 'metafieldsCount' | 'ownerType' | 'pinnedPosition' | 'validationStatus' | 'visibleToStorefrontApi'>
      & { type: Pick<AdminTypes.MetafieldDefinitionType, 'name'>, validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> } };

export type GetSingleMetafieldDefinitionQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetSingleMetafieldDefinitionQuery = { metafieldDefinition?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetafieldDefinition, 'key' | 'id' | 'namespace' | 'name' | 'description' | 'metafieldsCount' | 'ownerType' | 'pinnedPosition' | 'validationStatus' | 'visibleToStorefrontApi'>
    & { type: Pick<AdminTypes.MetafieldDefinitionType, 'name'>, validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
  )> };

export type MetafieldFieldsFragment = (
  { __typename: 'Metafield' }
  & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
);

export type GetSingleMetafieldQueryVariables = AdminTypes.Exact<{
  gid: AdminTypes.Scalars['ID']['input'];
}>;


export type GetSingleMetafieldQuery = { node?: AdminTypes.Maybe<(
    { __typename: 'Metafield' }
    & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    & { owner: (
      { __typename: 'AppInstallation' }
      & Pick<AdminTypes.AppInstallation, 'id'>
    ) | (
      { __typename: 'CartTransform' }
      & Pick<AdminTypes.CartTransform, 'id'>
    ) | (
      { __typename: 'Collection' }
      & Pick<AdminTypes.Collection, 'id'>
    ) | (
      { __typename: 'Company' }
      & Pick<AdminTypes.Company, 'id'>
    ) | (
      { __typename: 'CompanyLocation' }
      & Pick<AdminTypes.CompanyLocation, 'id'>
    ) | (
      { __typename: 'Customer' }
      & Pick<AdminTypes.Customer, 'id'>
    ) | { __typename: 'CustomerSegmentMember' | 'Image' } | (
      { __typename: 'DeliveryCustomization' }
      & Pick<AdminTypes.DeliveryCustomization, 'id'>
    ) | (
      { __typename: 'DiscountAutomaticNode' }
      & Pick<AdminTypes.DiscountAutomaticNode, 'id'>
    ) | (
      { __typename: 'DiscountCodeNode' }
      & Pick<AdminTypes.DiscountCodeNode, 'id'>
    ) | (
      { __typename: 'DiscountNode' }
      & Pick<AdminTypes.DiscountNode, 'id'>
    ) | (
      { __typename: 'DraftOrder' }
      & Pick<AdminTypes.DraftOrder, 'id'>
    ) | (
      { __typename: 'FulfillmentConstraintRule' }
      & Pick<AdminTypes.FulfillmentConstraintRule, 'id'>
    ) | (
      { __typename: 'Location' }
      & Pick<AdminTypes.Location, 'id'>
    ) | (
      { __typename: 'Market' }
      & Pick<AdminTypes.Market, 'id'>
    ) | (
      { __typename: 'MediaImage' }
      & Pick<AdminTypes.MediaImage, 'id'>
    ) | (
      { __typename: 'Order' }
      & Pick<AdminTypes.Order, 'id'>
    ) | (
      { __typename: 'PaymentCustomization' }
      & Pick<AdminTypes.PaymentCustomization, 'id'>
    ) | (
      { __typename: 'Product' }
      & Pick<AdminTypes.Product, 'id'>
    ) | (
      { __typename: 'ProductVariant' }
      & Pick<AdminTypes.ProductVariant, 'id'>
      & { owner: Pick<AdminTypes.Product, 'id'> }
    ) | (
      { __typename: 'Shop' }
      & Pick<AdminTypes.Shop, 'id'>
    ), definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
  )> };

export type GetNodesMetafieldsByKeyQueryVariables = AdminTypes.Exact<{
  ids: Array<AdminTypes.Scalars['ID']['input']> | AdminTypes.Scalars['ID']['input'];
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
}>;


export type GetNodesMetafieldsByKeyQuery = { nodes: Array<AdminTypes.Maybe<(
    { __typename: 'AbandonedCheckout' }
    & Pick<AdminTypes.AbandonedCheckout, 'id'>
  ) | (
    { __typename: 'Abandonment' }
    & Pick<AdminTypes.Abandonment, 'id'>
  ) | (
    { __typename: 'AddAllProductsOperation' }
    & Pick<AdminTypes.AddAllProductsOperation, 'id'>
  ) | (
    { __typename: 'AdditionalFee' }
    & Pick<AdminTypes.AdditionalFee, 'id'>
  ) | (
    { __typename: 'App' }
    & Pick<AdminTypes.App, 'id'>
  ) | (
    { __typename: 'AppCatalog' }
    & Pick<AdminTypes.AppCatalog, 'id'>
  ) | (
    { __typename: 'AppCredit' }
    & Pick<AdminTypes.AppCredit, 'id'>
  ) | (
    { __typename: 'AppInstallation' }
    & Pick<AdminTypes.AppInstallation, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'AppPurchaseOneTime' }
    & Pick<AdminTypes.AppPurchaseOneTime, 'id'>
  ) | (
    { __typename: 'AppRevenueAttributionRecord' }
    & Pick<AdminTypes.AppRevenueAttributionRecord, 'id'>
  ) | (
    { __typename: 'AppSubscription' }
    & Pick<AdminTypes.AppSubscription, 'id'>
  ) | (
    { __typename: 'AppUsageRecord' }
    & Pick<AdminTypes.AppUsageRecord, 'id'>
  ) | (
    { __typename: 'BasicEvent' }
    & Pick<AdminTypes.BasicEvent, 'id'>
  ) | (
    { __typename: 'BulkOperation' }
    & Pick<AdminTypes.BulkOperation, 'id'>
  ) | (
    { __typename: 'CalculatedOrder' }
    & Pick<AdminTypes.CalculatedOrder, 'id'>
  ) | (
    { __typename: 'CartTransform' }
    & Pick<AdminTypes.CartTransform, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'CatalogCsvOperation' }
    & Pick<AdminTypes.CatalogCsvOperation, 'id'>
  ) | (
    { __typename: 'Channel' }
    & Pick<AdminTypes.Channel, 'id'>
  ) | (
    { __typename: 'ChannelDefinition' }
    & Pick<AdminTypes.ChannelDefinition, 'id'>
  ) | (
    { __typename: 'ChannelInformation' }
    & Pick<AdminTypes.ChannelInformation, 'id'>
  ) | (
    { __typename: 'CheckoutProfile' }
    & Pick<AdminTypes.CheckoutProfile, 'id'>
  ) | (
    { __typename: 'Collection' }
    & Pick<AdminTypes.Collection, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'CommentEvent' }
    & Pick<AdminTypes.CommentEvent, 'id'>
  ) | (
    { __typename: 'Company' }
    & Pick<AdminTypes.Company, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'CompanyAddress' }
    & Pick<AdminTypes.CompanyAddress, 'id'>
  ) | (
    { __typename: 'CompanyContact' }
    & Pick<AdminTypes.CompanyContact, 'id'>
  ) | (
    { __typename: 'CompanyContactRole' }
    & Pick<AdminTypes.CompanyContactRole, 'id'>
  ) | (
    { __typename: 'CompanyContactRoleAssignment' }
    & Pick<AdminTypes.CompanyContactRoleAssignment, 'id'>
  ) | (
    { __typename: 'CompanyLocation' }
    & Pick<AdminTypes.CompanyLocation, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'CompanyLocationCatalog' }
    & Pick<AdminTypes.CompanyLocationCatalog, 'id'>
  ) | (
    { __typename: 'Customer' }
    & Pick<AdminTypes.Customer, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'CustomerPaymentMethod' }
    & Pick<AdminTypes.CustomerPaymentMethod, 'id'>
  ) | (
    { __typename: 'CustomerSegmentMembersQuery' }
    & Pick<AdminTypes.CustomerSegmentMembersQuery, 'id'>
  ) | (
    { __typename: 'CustomerVisit' }
    & Pick<AdminTypes.CustomerVisit, 'id'>
  ) | (
    { __typename: 'DeliveryCarrierService' }
    & Pick<AdminTypes.DeliveryCarrierService, 'id'>
  ) | (
    { __typename: 'DeliveryCondition' }
    & Pick<AdminTypes.DeliveryCondition, 'id'>
  ) | (
    { __typename: 'DeliveryCountry' }
    & Pick<AdminTypes.DeliveryCountry, 'id'>
  ) | (
    { __typename: 'DeliveryCustomization' }
    & Pick<AdminTypes.DeliveryCustomization, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'DeliveryLocationGroup' }
    & Pick<AdminTypes.DeliveryLocationGroup, 'id'>
  ) | (
    { __typename: 'DeliveryMethod' }
    & Pick<AdminTypes.DeliveryMethod, 'id'>
  ) | (
    { __typename: 'DeliveryMethodDefinition' }
    & Pick<AdminTypes.DeliveryMethodDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryParticipant' }
    & Pick<AdminTypes.DeliveryParticipant, 'id'>
  ) | (
    { __typename: 'DeliveryProfile' }
    & Pick<AdminTypes.DeliveryProfile, 'id'>
  ) | (
    { __typename: 'DeliveryProfileItem' }
    & Pick<AdminTypes.DeliveryProfileItem, 'id'>
  ) | (
    { __typename: 'DeliveryProvince' }
    & Pick<AdminTypes.DeliveryProvince, 'id'>
  ) | (
    { __typename: 'DeliveryRateDefinition' }
    & Pick<AdminTypes.DeliveryRateDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryZone' }
    & Pick<AdminTypes.DeliveryZone, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticBxgy' }
    & Pick<AdminTypes.DiscountAutomaticBxgy, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticNode' }
    & Pick<AdminTypes.DiscountAutomaticNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'DiscountCodeNode' }
    & Pick<AdminTypes.DiscountCodeNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'DiscountNode' }
    & Pick<AdminTypes.DiscountNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'DiscountRedeemCodeBulkCreation' }
    & Pick<AdminTypes.DiscountRedeemCodeBulkCreation, 'id'>
  ) | (
    { __typename: 'Domain' }
    & Pick<AdminTypes.Domain, 'id'>
  ) | (
    { __typename: 'DraftOrder' }
    & Pick<AdminTypes.DraftOrder, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'DraftOrderLineItem' }
    & Pick<AdminTypes.DraftOrderLineItem, 'id'>
  ) | (
    { __typename: 'DraftOrderTag' }
    & Pick<AdminTypes.DraftOrderTag, 'id'>
  ) | (
    { __typename: 'Duty' }
    & Pick<AdminTypes.Duty, 'id'>
  ) | (
    { __typename: 'ExchangeV2' }
    & Pick<AdminTypes.ExchangeV2, 'id'>
  ) | (
    { __typename: 'ExternalVideo' }
    & Pick<AdminTypes.ExternalVideo, 'id'>
  ) | (
    { __typename: 'Fulfillment' }
    & Pick<AdminTypes.Fulfillment, 'id'>
  ) | (
    { __typename: 'FulfillmentConstraintRule' }
    & Pick<AdminTypes.FulfillmentConstraintRule, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'FulfillmentEvent' }
    & Pick<AdminTypes.FulfillmentEvent, 'id'>
  ) | (
    { __typename: 'FulfillmentLineItem' }
    & Pick<AdminTypes.FulfillmentLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrder' }
    & Pick<AdminTypes.FulfillmentOrder, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderDestination' }
    & Pick<AdminTypes.FulfillmentOrderDestination, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderLineItem' }
    & Pick<AdminTypes.FulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderMerchantRequest' }
    & Pick<AdminTypes.FulfillmentOrderMerchantRequest, 'id'>
  ) | (
    { __typename: 'GenericFile' }
    & Pick<AdminTypes.GenericFile, 'id'>
  ) | (
    { __typename: 'GiftCard' }
    & Pick<AdminTypes.GiftCard, 'id'>
  ) | (
    { __typename: 'InventoryAdjustmentGroup' }
    & Pick<AdminTypes.InventoryAdjustmentGroup, 'id'>
  ) | (
    { __typename: 'InventoryItem' }
    & Pick<AdminTypes.InventoryItem, 'id'>
  ) | (
    { __typename: 'InventoryLevel' }
    & Pick<AdminTypes.InventoryLevel, 'id'>
  ) | (
    { __typename: 'LineItem' }
    & Pick<AdminTypes.LineItem, 'id'>
  ) | (
    { __typename: 'LineItemMutable' }
    & Pick<AdminTypes.LineItemMutable, 'id'>
  ) | (
    { __typename: 'Location' }
    & Pick<AdminTypes.Location, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'MailingAddress' }
    & Pick<AdminTypes.MailingAddress, 'id'>
  ) | (
    { __typename: 'Market' }
    & Pick<AdminTypes.Market, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'MarketCatalog' }
    & Pick<AdminTypes.MarketCatalog, 'id'>
  ) | (
    { __typename: 'MarketRegionCountry' }
    & Pick<AdminTypes.MarketRegionCountry, 'id'>
  ) | (
    { __typename: 'MarketWebPresence' }
    & Pick<AdminTypes.MarketWebPresence, 'id'>
  ) | (
    { __typename: 'MarketingActivity' }
    & Pick<AdminTypes.MarketingActivity, 'id'>
  ) | (
    { __typename: 'MarketingEvent' }
    & Pick<AdminTypes.MarketingEvent, 'id'>
  ) | (
    { __typename: 'MediaImage' }
    & Pick<AdminTypes.MediaImage, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'Metafield' }
    & Pick<AdminTypes.Metafield, 'id'>
  ) | (
    { __typename: 'MetafieldDefinition' }
    & Pick<AdminTypes.MetafieldDefinition, 'id'>
  ) | (
    { __typename: 'MetafieldStorefrontVisibility' }
    & Pick<AdminTypes.MetafieldStorefrontVisibility, 'id'>
  ) | (
    { __typename: 'Metaobject' }
    & Pick<AdminTypes.Metaobject, 'id'>
  ) | (
    { __typename: 'MetaobjectDefinition' }
    & Pick<AdminTypes.MetaobjectDefinition, 'id'>
  ) | (
    { __typename: 'Model3d' }
    & Pick<AdminTypes.Model3d, 'id'>
  ) | (
    { __typename: 'OnlineStoreArticle' }
    & Pick<AdminTypes.OnlineStoreArticle, 'id'>
  ) | (
    { __typename: 'OnlineStoreBlog' }
    & Pick<AdminTypes.OnlineStoreBlog, 'id'>
  ) | (
    { __typename: 'OnlineStorePage' }
    & Pick<AdminTypes.OnlineStorePage, 'id'>
  ) | (
    { __typename: 'Order' }
    & Pick<AdminTypes.Order, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'OrderDisputeSummary' }
    & Pick<AdminTypes.OrderDisputeSummary, 'id'>
  ) | (
    { __typename: 'OrderTransaction' }
    & Pick<AdminTypes.OrderTransaction, 'id'>
  ) | (
    { __typename: 'PaymentCustomization' }
    & Pick<AdminTypes.PaymentCustomization, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'PaymentMandate' }
    & Pick<AdminTypes.PaymentMandate, 'id'>
  ) | (
    { __typename: 'PaymentSchedule' }
    & Pick<AdminTypes.PaymentSchedule, 'id'>
  ) | (
    { __typename: 'PaymentTerms' }
    & Pick<AdminTypes.PaymentTerms, 'id'>
  ) | (
    { __typename: 'PaymentTermsTemplate' }
    & Pick<AdminTypes.PaymentTermsTemplate, 'id'>
  ) | (
    { __typename: 'PriceList' }
    & Pick<AdminTypes.PriceList, 'id'>
  ) | (
    { __typename: 'PriceRule' }
    & Pick<AdminTypes.PriceRule, 'id'>
  ) | (
    { __typename: 'PriceRuleDiscountCode' }
    & Pick<AdminTypes.PriceRuleDiscountCode, 'id'>
  ) | (
    { __typename: 'PrivateMetafield' }
    & Pick<AdminTypes.PrivateMetafield, 'id'>
  ) | (
    { __typename: 'Product' }
    & Pick<AdminTypes.Product, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'ProductFeed' }
    & Pick<AdminTypes.ProductFeed, 'id'>
  ) | (
    { __typename: 'ProductOption' }
    & Pick<AdminTypes.ProductOption, 'id'>
  ) | (
    { __typename: 'ProductTaxonomyNode' }
    & Pick<AdminTypes.ProductTaxonomyNode, 'id'>
  ) | (
    { __typename: 'ProductVariant' }
    & Pick<AdminTypes.ProductVariant, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'ProductVariantComponent' }
    & Pick<AdminTypes.ProductVariantComponent, 'id'>
  ) | (
    { __typename: 'Publication' }
    & Pick<AdminTypes.Publication, 'id'>
  ) | (
    { __typename: 'PublicationResourceOperation' }
    & Pick<AdminTypes.PublicationResourceOperation, 'id'>
  ) | (
    { __typename: 'QuantityPriceBreak' }
    & Pick<AdminTypes.QuantityPriceBreak, 'id'>
  ) | (
    { __typename: 'Refund' }
    & Pick<AdminTypes.Refund, 'id'>
  ) | (
    { __typename: 'Return' }
    & Pick<AdminTypes.Return, 'id'>
  ) | (
    { __typename: 'ReturnLineItem' }
    & Pick<AdminTypes.ReturnLineItem, 'id'>
  ) | (
    { __typename: 'ReturnableFulfillment' }
    & Pick<AdminTypes.ReturnableFulfillment, 'id'>
  ) | (
    { __typename: 'ReverseDelivery' }
    & Pick<AdminTypes.ReverseDelivery, 'id'>
  ) | (
    { __typename: 'ReverseDeliveryLineItem' }
    & Pick<AdminTypes.ReverseDeliveryLineItem, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrder' }
    & Pick<AdminTypes.ReverseFulfillmentOrder, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderDisposition' }
    & Pick<AdminTypes.ReverseFulfillmentOrderDisposition, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderLineItem' }
    & Pick<AdminTypes.ReverseFulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'SaleAdditionalFee' }
    & Pick<AdminTypes.SaleAdditionalFee, 'id'>
  ) | (
    { __typename: 'SavedSearch' }
    & Pick<AdminTypes.SavedSearch, 'id'>
  ) | (
    { __typename: 'ScriptTag' }
    & Pick<AdminTypes.ScriptTag, 'id'>
  ) | (
    { __typename: 'Segment' }
    & Pick<AdminTypes.Segment, 'id'>
  ) | (
    { __typename: 'SellingPlan' }
    & Pick<AdminTypes.SellingPlan, 'id'>
  ) | (
    { __typename: 'SellingPlanGroup' }
    & Pick<AdminTypes.SellingPlanGroup, 'id'>
  ) | (
    { __typename: 'ServerPixel' }
    & Pick<AdminTypes.ServerPixel, 'id'>
  ) | (
    { __typename: 'Shop' }
    & Pick<AdminTypes.Shop, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      )> } }
  ) | (
    { __typename: 'ShopAddress' }
    & Pick<AdminTypes.ShopAddress, 'id'>
  ) | (
    { __typename: 'ShopPolicy' }
    & Pick<AdminTypes.ShopPolicy, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsAccount' }
    & Pick<AdminTypes.ShopifyPaymentsAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsBankAccount' }
    & Pick<AdminTypes.ShopifyPaymentsBankAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDispute' }
    & Pick<AdminTypes.ShopifyPaymentsDispute, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeEvidence' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeEvidence, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFileUpload' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFileUpload, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFulfillment' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFulfillment, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsPayout' }
    & Pick<AdminTypes.ShopifyPaymentsPayout, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsVerification' }
    & Pick<AdminTypes.ShopifyPaymentsVerification, 'id'>
  ) | (
    { __typename: 'StaffMember' }
    & Pick<AdminTypes.StaffMember, 'id'>
  ) | (
    { __typename: 'StandardMetafieldDefinitionTemplate' }
    & Pick<AdminTypes.StandardMetafieldDefinitionTemplate, 'id'>
  ) | (
    { __typename: 'StorefrontAccessToken' }
    & Pick<AdminTypes.StorefrontAccessToken, 'id'>
  ) | (
    { __typename: 'SubscriptionBillingAttempt' }
    & Pick<AdminTypes.SubscriptionBillingAttempt, 'id'>
  ) | (
    { __typename: 'SubscriptionContract' }
    & Pick<AdminTypes.SubscriptionContract, 'id'>
  ) | (
    { __typename: 'SubscriptionDraft' }
    & Pick<AdminTypes.SubscriptionDraft, 'id'>
  ) | (
    { __typename: 'TenderTransaction' }
    & Pick<AdminTypes.TenderTransaction, 'id'>
  ) | (
    { __typename: 'TransactionFee' }
    & Pick<AdminTypes.TransactionFee, 'id'>
  ) | (
    { __typename: 'UrlRedirect' }
    & Pick<AdminTypes.UrlRedirect, 'id'>
  ) | (
    { __typename: 'UrlRedirectImport' }
    & Pick<AdminTypes.UrlRedirectImport, 'id'>
  ) | (
    { __typename: 'Video' }
    & Pick<AdminTypes.Video, 'id'>
  ) | (
    { __typename: 'WebPixel' }
    & Pick<AdminTypes.WebPixel, 'id'>
  ) | (
    { __typename: 'WebhookSubscription' }
    & Pick<AdminTypes.WebhookSubscription, 'id'>
  )>> };

export type GetSingleNodeMetafieldsByKeyQueryVariables = AdminTypes.Exact<{
  ownerGid: AdminTypes.Scalars['ID']['input'];
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields: AdminTypes.Scalars['Int']['input'];
}>;


export type GetSingleNodeMetafieldsByKeyQuery = { node?: AdminTypes.Maybe<(
    { __typename: 'AbandonedCheckout' }
    & Pick<AdminTypes.AbandonedCheckout, 'id'>
  ) | (
    { __typename: 'Abandonment' }
    & Pick<AdminTypes.Abandonment, 'id'>
  ) | (
    { __typename: 'AddAllProductsOperation' }
    & Pick<AdminTypes.AddAllProductsOperation, 'id'>
  ) | (
    { __typename: 'AdditionalFee' }
    & Pick<AdminTypes.AdditionalFee, 'id'>
  ) | (
    { __typename: 'App' }
    & Pick<AdminTypes.App, 'id'>
  ) | (
    { __typename: 'AppCatalog' }
    & Pick<AdminTypes.AppCatalog, 'id'>
  ) | (
    { __typename: 'AppCredit' }
    & Pick<AdminTypes.AppCredit, 'id'>
  ) | (
    { __typename: 'AppInstallation' }
    & Pick<AdminTypes.AppInstallation, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'AppPurchaseOneTime' }
    & Pick<AdminTypes.AppPurchaseOneTime, 'id'>
  ) | (
    { __typename: 'AppRevenueAttributionRecord' }
    & Pick<AdminTypes.AppRevenueAttributionRecord, 'id'>
  ) | (
    { __typename: 'AppSubscription' }
    & Pick<AdminTypes.AppSubscription, 'id'>
  ) | (
    { __typename: 'AppUsageRecord' }
    & Pick<AdminTypes.AppUsageRecord, 'id'>
  ) | (
    { __typename: 'BasicEvent' }
    & Pick<AdminTypes.BasicEvent, 'id'>
  ) | (
    { __typename: 'BulkOperation' }
    & Pick<AdminTypes.BulkOperation, 'id'>
  ) | (
    { __typename: 'CalculatedOrder' }
    & Pick<AdminTypes.CalculatedOrder, 'id'>
  ) | (
    { __typename: 'CartTransform' }
    & Pick<AdminTypes.CartTransform, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'CatalogCsvOperation' }
    & Pick<AdminTypes.CatalogCsvOperation, 'id'>
  ) | (
    { __typename: 'Channel' }
    & Pick<AdminTypes.Channel, 'id'>
  ) | (
    { __typename: 'ChannelDefinition' }
    & Pick<AdminTypes.ChannelDefinition, 'id'>
  ) | (
    { __typename: 'ChannelInformation' }
    & Pick<AdminTypes.ChannelInformation, 'id'>
  ) | (
    { __typename: 'CheckoutProfile' }
    & Pick<AdminTypes.CheckoutProfile, 'id'>
  ) | (
    { __typename: 'Collection' }
    & Pick<AdminTypes.Collection, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'CommentEvent' }
    & Pick<AdminTypes.CommentEvent, 'id'>
  ) | (
    { __typename: 'Company' }
    & Pick<AdminTypes.Company, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'CompanyAddress' }
    & Pick<AdminTypes.CompanyAddress, 'id'>
  ) | (
    { __typename: 'CompanyContact' }
    & Pick<AdminTypes.CompanyContact, 'id'>
  ) | (
    { __typename: 'CompanyContactRole' }
    & Pick<AdminTypes.CompanyContactRole, 'id'>
  ) | (
    { __typename: 'CompanyContactRoleAssignment' }
    & Pick<AdminTypes.CompanyContactRoleAssignment, 'id'>
  ) | (
    { __typename: 'CompanyLocation' }
    & Pick<AdminTypes.CompanyLocation, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'CompanyLocationCatalog' }
    & Pick<AdminTypes.CompanyLocationCatalog, 'id'>
  ) | (
    { __typename: 'Customer' }
    & Pick<AdminTypes.Customer, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'CustomerPaymentMethod' }
    & Pick<AdminTypes.CustomerPaymentMethod, 'id'>
  ) | (
    { __typename: 'CustomerSegmentMembersQuery' }
    & Pick<AdminTypes.CustomerSegmentMembersQuery, 'id'>
  ) | (
    { __typename: 'CustomerVisit' }
    & Pick<AdminTypes.CustomerVisit, 'id'>
  ) | (
    { __typename: 'DeliveryCarrierService' }
    & Pick<AdminTypes.DeliveryCarrierService, 'id'>
  ) | (
    { __typename: 'DeliveryCondition' }
    & Pick<AdminTypes.DeliveryCondition, 'id'>
  ) | (
    { __typename: 'DeliveryCountry' }
    & Pick<AdminTypes.DeliveryCountry, 'id'>
  ) | (
    { __typename: 'DeliveryCustomization' }
    & Pick<AdminTypes.DeliveryCustomization, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'DeliveryLocationGroup' }
    & Pick<AdminTypes.DeliveryLocationGroup, 'id'>
  ) | (
    { __typename: 'DeliveryMethod' }
    & Pick<AdminTypes.DeliveryMethod, 'id'>
  ) | (
    { __typename: 'DeliveryMethodDefinition' }
    & Pick<AdminTypes.DeliveryMethodDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryParticipant' }
    & Pick<AdminTypes.DeliveryParticipant, 'id'>
  ) | (
    { __typename: 'DeliveryProfile' }
    & Pick<AdminTypes.DeliveryProfile, 'id'>
  ) | (
    { __typename: 'DeliveryProfileItem' }
    & Pick<AdminTypes.DeliveryProfileItem, 'id'>
  ) | (
    { __typename: 'DeliveryProvince' }
    & Pick<AdminTypes.DeliveryProvince, 'id'>
  ) | (
    { __typename: 'DeliveryRateDefinition' }
    & Pick<AdminTypes.DeliveryRateDefinition, 'id'>
  ) | (
    { __typename: 'DeliveryZone' }
    & Pick<AdminTypes.DeliveryZone, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticBxgy' }
    & Pick<AdminTypes.DiscountAutomaticBxgy, 'id'>
  ) | (
    { __typename: 'DiscountAutomaticNode' }
    & Pick<AdminTypes.DiscountAutomaticNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'DiscountCodeNode' }
    & Pick<AdminTypes.DiscountCodeNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'DiscountNode' }
    & Pick<AdminTypes.DiscountNode, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'DiscountRedeemCodeBulkCreation' }
    & Pick<AdminTypes.DiscountRedeemCodeBulkCreation, 'id'>
  ) | (
    { __typename: 'Domain' }
    & Pick<AdminTypes.Domain, 'id'>
  ) | (
    { __typename: 'DraftOrder' }
    & Pick<AdminTypes.DraftOrder, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'DraftOrderLineItem' }
    & Pick<AdminTypes.DraftOrderLineItem, 'id'>
  ) | (
    { __typename: 'DraftOrderTag' }
    & Pick<AdminTypes.DraftOrderTag, 'id'>
  ) | (
    { __typename: 'Duty' }
    & Pick<AdminTypes.Duty, 'id'>
  ) | (
    { __typename: 'ExchangeV2' }
    & Pick<AdminTypes.ExchangeV2, 'id'>
  ) | (
    { __typename: 'ExternalVideo' }
    & Pick<AdminTypes.ExternalVideo, 'id'>
  ) | (
    { __typename: 'Fulfillment' }
    & Pick<AdminTypes.Fulfillment, 'id'>
  ) | (
    { __typename: 'FulfillmentConstraintRule' }
    & Pick<AdminTypes.FulfillmentConstraintRule, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'FulfillmentEvent' }
    & Pick<AdminTypes.FulfillmentEvent, 'id'>
  ) | (
    { __typename: 'FulfillmentLineItem' }
    & Pick<AdminTypes.FulfillmentLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrder' }
    & Pick<AdminTypes.FulfillmentOrder, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderDestination' }
    & Pick<AdminTypes.FulfillmentOrderDestination, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderLineItem' }
    & Pick<AdminTypes.FulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'FulfillmentOrderMerchantRequest' }
    & Pick<AdminTypes.FulfillmentOrderMerchantRequest, 'id'>
  ) | (
    { __typename: 'GenericFile' }
    & Pick<AdminTypes.GenericFile, 'id'>
  ) | (
    { __typename: 'GiftCard' }
    & Pick<AdminTypes.GiftCard, 'id'>
  ) | (
    { __typename: 'InventoryAdjustmentGroup' }
    & Pick<AdminTypes.InventoryAdjustmentGroup, 'id'>
  ) | (
    { __typename: 'InventoryItem' }
    & Pick<AdminTypes.InventoryItem, 'id'>
  ) | (
    { __typename: 'InventoryLevel' }
    & Pick<AdminTypes.InventoryLevel, 'id'>
  ) | (
    { __typename: 'LineItem' }
    & Pick<AdminTypes.LineItem, 'id'>
  ) | (
    { __typename: 'LineItemMutable' }
    & Pick<AdminTypes.LineItemMutable, 'id'>
  ) | (
    { __typename: 'Location' }
    & Pick<AdminTypes.Location, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'MailingAddress' }
    & Pick<AdminTypes.MailingAddress, 'id'>
  ) | (
    { __typename: 'Market' }
    & Pick<AdminTypes.Market, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'MarketCatalog' }
    & Pick<AdminTypes.MarketCatalog, 'id'>
  ) | (
    { __typename: 'MarketRegionCountry' }
    & Pick<AdminTypes.MarketRegionCountry, 'id'>
  ) | (
    { __typename: 'MarketWebPresence' }
    & Pick<AdminTypes.MarketWebPresence, 'id'>
  ) | (
    { __typename: 'MarketingActivity' }
    & Pick<AdminTypes.MarketingActivity, 'id'>
  ) | (
    { __typename: 'MarketingEvent' }
    & Pick<AdminTypes.MarketingEvent, 'id'>
  ) | (
    { __typename: 'MediaImage' }
    & Pick<AdminTypes.MediaImage, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'Metafield' }
    & Pick<AdminTypes.Metafield, 'id'>
  ) | (
    { __typename: 'MetafieldDefinition' }
    & Pick<AdminTypes.MetafieldDefinition, 'id'>
  ) | (
    { __typename: 'MetafieldStorefrontVisibility' }
    & Pick<AdminTypes.MetafieldStorefrontVisibility, 'id'>
  ) | (
    { __typename: 'Metaobject' }
    & Pick<AdminTypes.Metaobject, 'id'>
  ) | (
    { __typename: 'MetaobjectDefinition' }
    & Pick<AdminTypes.MetaobjectDefinition, 'id'>
  ) | (
    { __typename: 'Model3d' }
    & Pick<AdminTypes.Model3d, 'id'>
  ) | (
    { __typename: 'OnlineStoreArticle' }
    & Pick<AdminTypes.OnlineStoreArticle, 'id'>
  ) | (
    { __typename: 'OnlineStoreBlog' }
    & Pick<AdminTypes.OnlineStoreBlog, 'id'>
  ) | (
    { __typename: 'OnlineStorePage' }
    & Pick<AdminTypes.OnlineStorePage, 'id'>
  ) | (
    { __typename: 'Order' }
    & Pick<AdminTypes.Order, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'OrderDisputeSummary' }
    & Pick<AdminTypes.OrderDisputeSummary, 'id'>
  ) | (
    { __typename: 'OrderTransaction' }
    & Pick<AdminTypes.OrderTransaction, 'id'>
  ) | (
    { __typename: 'PaymentCustomization' }
    & Pick<AdminTypes.PaymentCustomization, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'PaymentMandate' }
    & Pick<AdminTypes.PaymentMandate, 'id'>
  ) | (
    { __typename: 'PaymentSchedule' }
    & Pick<AdminTypes.PaymentSchedule, 'id'>
  ) | (
    { __typename: 'PaymentTerms' }
    & Pick<AdminTypes.PaymentTerms, 'id'>
  ) | (
    { __typename: 'PaymentTermsTemplate' }
    & Pick<AdminTypes.PaymentTermsTemplate, 'id'>
  ) | (
    { __typename: 'PriceList' }
    & Pick<AdminTypes.PriceList, 'id'>
  ) | (
    { __typename: 'PriceRule' }
    & Pick<AdminTypes.PriceRule, 'id'>
  ) | (
    { __typename: 'PriceRuleDiscountCode' }
    & Pick<AdminTypes.PriceRuleDiscountCode, 'id'>
  ) | (
    { __typename: 'PrivateMetafield' }
    & Pick<AdminTypes.PrivateMetafield, 'id'>
  ) | (
    { __typename: 'Product' }
    & Pick<AdminTypes.Product, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'ProductFeed' }
    & Pick<AdminTypes.ProductFeed, 'id'>
  ) | (
    { __typename: 'ProductOption' }
    & Pick<AdminTypes.ProductOption, 'id'>
  ) | (
    { __typename: 'ProductTaxonomyNode' }
    & Pick<AdminTypes.ProductTaxonomyNode, 'id'>
  ) | (
    { __typename: 'ProductVariant' }
    & Pick<AdminTypes.ProductVariant, 'id'>
    & { parentOwner: Pick<AdminTypes.Product, 'id'>, metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'ProductVariantComponent' }
    & Pick<AdminTypes.ProductVariantComponent, 'id'>
  ) | (
    { __typename: 'Publication' }
    & Pick<AdminTypes.Publication, 'id'>
  ) | (
    { __typename: 'PublicationResourceOperation' }
    & Pick<AdminTypes.PublicationResourceOperation, 'id'>
  ) | (
    { __typename: 'QuantityPriceBreak' }
    & Pick<AdminTypes.QuantityPriceBreak, 'id'>
  ) | (
    { __typename: 'Refund' }
    & Pick<AdminTypes.Refund, 'id'>
  ) | (
    { __typename: 'Return' }
    & Pick<AdminTypes.Return, 'id'>
  ) | (
    { __typename: 'ReturnLineItem' }
    & Pick<AdminTypes.ReturnLineItem, 'id'>
  ) | (
    { __typename: 'ReturnableFulfillment' }
    & Pick<AdminTypes.ReturnableFulfillment, 'id'>
  ) | (
    { __typename: 'ReverseDelivery' }
    & Pick<AdminTypes.ReverseDelivery, 'id'>
  ) | (
    { __typename: 'ReverseDeliveryLineItem' }
    & Pick<AdminTypes.ReverseDeliveryLineItem, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrder' }
    & Pick<AdminTypes.ReverseFulfillmentOrder, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderDisposition' }
    & Pick<AdminTypes.ReverseFulfillmentOrderDisposition, 'id'>
  ) | (
    { __typename: 'ReverseFulfillmentOrderLineItem' }
    & Pick<AdminTypes.ReverseFulfillmentOrderLineItem, 'id'>
  ) | (
    { __typename: 'SaleAdditionalFee' }
    & Pick<AdminTypes.SaleAdditionalFee, 'id'>
  ) | (
    { __typename: 'SavedSearch' }
    & Pick<AdminTypes.SavedSearch, 'id'>
  ) | (
    { __typename: 'ScriptTag' }
    & Pick<AdminTypes.ScriptTag, 'id'>
  ) | (
    { __typename: 'Segment' }
    & Pick<AdminTypes.Segment, 'id'>
  ) | (
    { __typename: 'SellingPlan' }
    & Pick<AdminTypes.SellingPlan, 'id'>
  ) | (
    { __typename: 'SellingPlanGroup' }
    & Pick<AdminTypes.SellingPlanGroup, 'id'>
  ) | (
    { __typename: 'ServerPixel' }
    & Pick<AdminTypes.ServerPixel, 'id'>
  ) | (
    { __typename: 'Shop' }
    & Pick<AdminTypes.Shop, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) | (
    { __typename: 'ShopAddress' }
    & Pick<AdminTypes.ShopAddress, 'id'>
  ) | (
    { __typename: 'ShopPolicy' }
    & Pick<AdminTypes.ShopPolicy, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsAccount' }
    & Pick<AdminTypes.ShopifyPaymentsAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsBankAccount' }
    & Pick<AdminTypes.ShopifyPaymentsBankAccount, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDispute' }
    & Pick<AdminTypes.ShopifyPaymentsDispute, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeEvidence' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeEvidence, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFileUpload' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFileUpload, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsDisputeFulfillment' }
    & Pick<AdminTypes.ShopifyPaymentsDisputeFulfillment, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsPayout' }
    & Pick<AdminTypes.ShopifyPaymentsPayout, 'id'>
  ) | (
    { __typename: 'ShopifyPaymentsVerification' }
    & Pick<AdminTypes.ShopifyPaymentsVerification, 'id'>
  ) | (
    { __typename: 'StaffMember' }
    & Pick<AdminTypes.StaffMember, 'id'>
  ) | (
    { __typename: 'StandardMetafieldDefinitionTemplate' }
    & Pick<AdminTypes.StandardMetafieldDefinitionTemplate, 'id'>
  ) | (
    { __typename: 'StorefrontAccessToken' }
    & Pick<AdminTypes.StorefrontAccessToken, 'id'>
  ) | (
    { __typename: 'SubscriptionBillingAttempt' }
    & Pick<AdminTypes.SubscriptionBillingAttempt, 'id'>
  ) | (
    { __typename: 'SubscriptionContract' }
    & Pick<AdminTypes.SubscriptionContract, 'id'>
  ) | (
    { __typename: 'SubscriptionDraft' }
    & Pick<AdminTypes.SubscriptionDraft, 'id'>
  ) | (
    { __typename: 'TenderTransaction' }
    & Pick<AdminTypes.TenderTransaction, 'id'>
  ) | (
    { __typename: 'TransactionFee' }
    & Pick<AdminTypes.TransactionFee, 'id'>
  ) | (
    { __typename: 'UrlRedirect' }
    & Pick<AdminTypes.UrlRedirect, 'id'>
  ) | (
    { __typename: 'UrlRedirectImport' }
    & Pick<AdminTypes.UrlRedirectImport, 'id'>
  ) | (
    { __typename: 'Video' }
    & Pick<AdminTypes.Video, 'id'>
  ) | (
    { __typename: 'WebPixel' }
    & Pick<AdminTypes.WebPixel, 'id'>
  ) | (
    { __typename: 'WebhookSubscription' }
    & Pick<AdminTypes.WebhookSubscription, 'id'>
  )> };

export type GetShopMetafieldsByKeyQueryVariables = AdminTypes.Exact<{
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields: AdminTypes.Scalars['Int']['input'];
}>;


export type GetShopMetafieldsByKeyQuery = { shop: (
    Pick<AdminTypes.Shop, 'id'>
    & { metafields: { nodes: Array<(
        { __typename: 'Metafield' }
        & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
      )> } }
  ) };

export type SetMetafieldsMutationVariables = AdminTypes.Exact<{
  inputs: Array<AdminTypes.MetafieldsSetInput> | AdminTypes.MetafieldsSetInput;
}>;


export type SetMetafieldsMutation = { metafieldsSet?: AdminTypes.Maybe<{ metafields?: AdminTypes.Maybe<Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
      & { definition?: AdminTypes.Maybe<Pick<AdminTypes.MetafieldDefinition, 'id'>> }
    )>>, userErrors: Array<Pick<AdminTypes.MetafieldsSetUserError, 'field' | 'message'>> }> };

export type MetafieldDeleteMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.MetafieldDeleteInput;
}>;


export type MetafieldDeleteMutation = { metafieldDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetafieldDeletePayload, 'deletedId'>
    & { userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }
  )> };

export type MetaobjectFieldDefinitionFragment = (
  Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
  & { type: (
    Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
    & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
  ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
);

export type MetaobjectDefinitionFragment = (
  Pick<AdminTypes.MetaobjectDefinition, 'id' | 'name' | 'displayNameKey' | 'type'>
  & { capabilities?: { publishable: Pick<AdminTypes.MetaobjectCapabilitiesPublishable, 'enabled'> }, fieldDefinitions?: Array<(
    Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
    & { type: (
      Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
      & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
    ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
  )> }
);

export type GetSingleMetaObjectDefinitionQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  includeCapabilities: AdminTypes.Scalars['Boolean']['input'];
  includeFieldDefinitions: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetSingleMetaObjectDefinitionQuery = { metaobjectDefinition?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetaobjectDefinition, 'id' | 'name' | 'displayNameKey' | 'type'>
    & { capabilities?: { publishable: Pick<AdminTypes.MetaobjectCapabilitiesPublishable, 'enabled'> }, fieldDefinitions?: Array<(
      Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
      & { type: (
        Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
        & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
      ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> }
  )> };

export type GetSingleMetaObjectDefinitionByTypeQueryVariables = AdminTypes.Exact<{
  type: AdminTypes.Scalars['String']['input'];
  includeCapabilities: AdminTypes.Scalars['Boolean']['input'];
  includeFieldDefinitions: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetSingleMetaObjectDefinitionByTypeQuery = { metaobjectDefinitionByType?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetaobjectDefinition, 'id' | 'name' | 'displayNameKey' | 'type'>
    & { capabilities?: { publishable: Pick<AdminTypes.MetaobjectCapabilitiesPublishable, 'enabled'> }, fieldDefinitions?: Array<(
      Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
      & { type: (
        Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
        & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
      ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> }
  )> };

export type GetMetaobjectDefinitionsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeCapabilities: AdminTypes.Scalars['Boolean']['input'];
  includeFieldDefinitions: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetMetaobjectDefinitionsQuery = { metaobjectDefinitions: { nodes: Array<(
      Pick<AdminTypes.MetaobjectDefinition, 'id' | 'name' | 'displayNameKey' | 'type'>
      & { capabilities?: { publishable: Pick<AdminTypes.MetaobjectCapabilitiesPublishable, 'enabled'> }, fieldDefinitions?: Array<(
        Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
        & { type: (
          Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
          & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
        ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
      )> }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type CreateMetaobjectMutationVariables = AdminTypes.Exact<{
  metaobject: AdminTypes.MetaobjectCreateInput;
}>;


export type CreateMetaobjectMutation = { metaobjectCreate?: AdminTypes.Maybe<{ metaobject?: AdminTypes.Maybe<Pick<AdminTypes.Metaobject, 'id'>>, userErrors: Array<Pick<AdminTypes.MetaobjectUserError, 'field' | 'message' | 'code'>> }> };

export type DeleteMetaobjectMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type DeleteMetaobjectMutation = { metaobjectDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetaobjectDeletePayload, 'deletedId'>
    & { userErrors: Array<Pick<AdminTypes.MetaobjectUserError, 'field' | 'message' | 'code'>> }
  )> };

export type OrderTransactionFieldsFragment = (
  AdminTypes.MakeOptional<Pick<AdminTypes.OrderTransaction, 'id' | 'kind' | 'status' | 'gateway' | 'createdAt' | 'authorizationCode' | 'accountNumber' | 'receiptJson' | 'settlementCurrency' | 'settlementCurrencyRate' | 'errorCode' | 'processedAt' | 'test' | 'paymentId'>, 'receiptJson'>
  & { paymentIcon?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, amountSet: { shopMoney?: Pick<AdminTypes.MoneyV2, 'amount'>, presentmentMoney?: Pick<AdminTypes.MoneyV2, 'currencyCode'> }, totalUnsettledSet?: AdminTypes.Maybe<{ shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }>, parentTransaction?: AdminTypes.Maybe<Pick<AdminTypes.OrderTransaction, 'id'>>, paymentDetails?: AdminTypes.Maybe<Pick<AdminTypes.CardPaymentDetails, 'paymentMethodName' | 'avsResultCode' | 'bin' | 'company' | 'cvvResultCode' | 'expirationMonth' | 'expirationYear' | 'name' | 'number' | 'wallet'> | Pick<AdminTypes.ShopPayInstallmentsPaymentDetails, 'paymentMethodName'>> }
);

export type GetOrderTransactionsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeAmount: AdminTypes.Scalars['Boolean']['input'];
  includeIcon: AdminTypes.Scalars['Boolean']['input'];
  includeParentTransaction: AdminTypes.Scalars['Boolean']['input'];
  includePaymentDetails: AdminTypes.Scalars['Boolean']['input'];
  includeReceiptJson: AdminTypes.Scalars['Boolean']['input'];
  includeTotalUnsettled: AdminTypes.Scalars['Boolean']['input'];
  includeTransactionCurrency: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetOrderTransactionsQuery = { orders: { nodes: Array<(
      Pick<AdminTypes.Order, 'id' | 'name'>
      & { transactions: Array<(
        AdminTypes.MakeOptional<Pick<AdminTypes.OrderTransaction, 'id' | 'kind' | 'status' | 'gateway' | 'createdAt' | 'authorizationCode' | 'accountNumber' | 'receiptJson' | 'settlementCurrency' | 'settlementCurrencyRate' | 'errorCode' | 'processedAt' | 'test' | 'paymentId'>, 'receiptJson'>
        & { paymentIcon?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, amountSet: { shopMoney?: Pick<AdminTypes.MoneyV2, 'amount'>, presentmentMoney?: Pick<AdminTypes.MoneyV2, 'currencyCode'> }, totalUnsettledSet?: AdminTypes.Maybe<{ shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }>, parentTransaction?: AdminTypes.Maybe<Pick<AdminTypes.OrderTransaction, 'id'>>, paymentDetails?: AdminTypes.Maybe<Pick<AdminTypes.CardPaymentDetails, 'paymentMethodName' | 'avsResultCode' | 'bin' | 'company' | 'cvvResultCode' | 'expirationMonth' | 'expirationYear' | 'name' | 'number' | 'wallet'> | Pick<AdminTypes.ShopPayInstallmentsPaymentDetails, 'paymentMethodName'>> }
      )> }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type ProductFieldsFragment = (
  Pick<AdminTypes.Product, 'id' | 'handle' | 'createdAt' | 'title' | 'productType' | 'publishedAt' | 'status' | 'tags' | 'templateSuffix' | 'updatedAt' | 'vendor' | 'isGiftCard' | 'descriptionHtml' | 'onlineStoreUrl'>
  & { options?: Array<Pick<AdminTypes.ProductOption, 'name'>>, featuredImage?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, metafields?: { nodes: Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    )> } }
);

export type QueryProductTypesQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type QueryProductTypesQuery = { shop: (
    Pick<AdminTypes.Shop, 'name'>
    & { productTypes: { edges: Array<Pick<AdminTypes.StringEdge, 'node'>> } }
  ) };

export type GetProductsWithMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  maxOptions?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeOptions: AdminTypes.Scalars['Boolean']['input'];
  includeFeaturedImage: AdminTypes.Scalars['Boolean']['input'];
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetProductsWithMetafieldsQuery = { products: { nodes: Array<(
      Pick<AdminTypes.Product, 'id' | 'handle' | 'createdAt' | 'title' | 'productType' | 'publishedAt' | 'status' | 'tags' | 'templateSuffix' | 'updatedAt' | 'vendor' | 'isGiftCard' | 'descriptionHtml' | 'onlineStoreUrl'>
      & { options?: Array<Pick<AdminTypes.ProductOption, 'name'>>, featuredImage?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type UpdateProductMutationVariables = AdminTypes.Exact<{
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  includeFeaturedImage: AdminTypes.Scalars['Boolean']['input'];
  includeMetafields: AdminTypes.Scalars['Boolean']['input'];
  includeOptions: AdminTypes.Scalars['Boolean']['input'];
  maxOptions?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  metafieldsSetsInput: Array<AdminTypes.MetafieldsSetInput> | AdminTypes.MetafieldsSetInput;
  productInput: AdminTypes.ProductInput;
}>;


export type UpdateProductMutation = { metafieldsSet?: AdminTypes.Maybe<{ metafields?: AdminTypes.Maybe<Array<Pick<AdminTypes.Metafield, 'key' | 'namespace' | 'value'>>>, userErrors: Array<Pick<AdminTypes.MetafieldsSetUserError, 'field' | 'message'>> }>, productUpdate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<(
      Pick<AdminTypes.Product, 'id' | 'handle' | 'createdAt' | 'title' | 'productType' | 'publishedAt' | 'status' | 'tags' | 'templateSuffix' | 'updatedAt' | 'vendor' | 'isGiftCard' | 'descriptionHtml' | 'onlineStoreUrl'>
      & { options?: Array<Pick<AdminTypes.ProductOption, 'name'>>, featuredImage?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, metafields?: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type GetOnlineStorePublicationQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetOnlineStorePublicationQuery = { appByHandle?: AdminTypes.Maybe<(
    Pick<AdminTypes.App, 'id' | 'handle' | 'title'>
    & { installation?: AdminTypes.Maybe<{ publication?: AdminTypes.Maybe<Pick<AdminTypes.Publication, 'id'>> }> }
  )> };

interface GeneratedQueryTypes {
  "\n  query CheckThrottleStatus {\n    shop {\n      id\n    }\n  }\n": {return: CheckThrottleStatusQuery, variables: CheckThrottleStatusQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment CollectionFields on Collection {\n    handle\n    id\n    descriptionHtml\n    updatedAt\n    templateSuffix\n    title\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n\n    # Optional fields and connections\n    image @include(if: $includeImage) {\n      url\n    }\n    sortOrder @include(if: $includeSortOrder)\n    ruleSet @include(if: $includeRuleSet) {\n      appliedDisjunctively\n      rules {\n        column\n        condition\n        relation\n      }\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetCollections(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n    $includeImage: Boolean!\n    $includeMetafields: Boolean!\n    $includeSortOrder: Boolean!\n    $includeRuleSet: Boolean!\n  ) {\n    collections(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...CollectionFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCollectionsQuery, variables: GetCollectionsQueryVariables},
  "\n  query GetCollectionType($collectionGid: ID!) {\n    collection(id: $collectionGid) {\n      # will be null for non smart collections\n      isSmartCollection: ruleSet {\n        appliedDisjunctively\n      }\n    }\n  }\n": {return: GetCollectionTypeQuery, variables: GetCollectionTypeQueryVariables},
  "\n  query GetCollectionTypes($ids: [ID!]!) {\n    nodes(ids: $ids) {\n      id\n      __typename\n      ... on Collection {\n        isSmartCollection: ruleSet {\n          appliedDisjunctively\n        }\n      }\n    }\n  }\n": {return: GetCollectionTypesQuery, variables: GetCollectionTypesQueryVariables},
  "\n  \n  \n  fragment CustomerAddressFields on MailingAddress {\n    address1\n    address2\n    city\n    company\n    coordinatesValidated\n    country\n    countryCodeV2\n    firstName\n    formattedArea\n    id\n    lastName\n    latitude\n    longitude\n    name\n    phone\n    province\n    provinceCode\n    timeZone\n    zip\n    formatted(withName: true, withCompany: true)\n  }\n\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment CustomerFields on Customer {\n    id\n    createdAt\n    displayName\n    email\n    firstName\n    lastName\n    lifetimeDuration\n    locale\n    multipassIdentifier\n    note\n    numberOfOrders\n    phone\n    productSubscriberStatus\n    state\n    tags\n    taxExempt\n    taxExemptions\n    unsubscribeUrl\n    updatedAt\n    validEmailAddress\n    verifiedEmail\n    addresses(first: 3) {\n      ...CustomerAddressFields\n    }\n    defaultAddress {\n      ...CustomerAddressFields\n    }\n    amountSpent {\n      amount\n      currencyCode\n    }\n    canDelete\n    # events(first: 2) {\n    #   nodes {\n    #     ... on CommentEvent {\n    #       id\n    #       message\n    #     }\n    #   }\n    # }\n    emailMarketingConsent {\n      consentUpdatedAt\n      marketingOptInLevel\n      marketingState\n    }\n    smsMarketingConsent {\n      consentCollectedFrom\n      consentUpdatedAt\n      marketingOptInLevel\n      marketingState\n    }\n    statistics {\n      predictedSpendTier\n    }\n\n    # Optional fields and connections\n    # options(first: $maxOptions) @include(if: $includeOptions) {\n    #   name\n    # }\n    # featuredImage @include(if: $includeFeaturedImage) {\n    #   url\n    # }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query getCustomersWithMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n    $includeMetafields: Boolean!\n  ) {\n    customers(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...CustomerFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCustomersWithMetafieldsQuery, variables: GetCustomersWithMetafieldsQueryVariables},
  "\n  \n  fragment FileFields on File {\n    __typename\n    id\n    updatedAt\n    alt @include(if: $includeAlt)\n    createdAt @include(if: $includeCreatedAt)\n    updatedAt @include(if: $includeUpdatedAt)\n    thumbnail: preview @include(if: $includeThumbnail) {\n      image {\n        url\n      }\n    }\n\n    ... on GenericFile {\n      mimeType @include(if: $includeMimeType)\n      originalFileSize @include(if: $includeFileSize)\n      url\n    }\n\n    ... on MediaImage {\n      image {\n        url\n        width @include(if: $includeWidth)\n        height @include(if: $includeHeight)\n      }\n      mimeType @include(if: $includeMimeType)\n      originalSource @include(if: $includeFileSize) {\n        fileSize\n      }\n    }\n\n    ... on Video {\n      filename\n      duration @include(if: $includeDuration)\n      originalSource {\n        fileSize @include(if: $includeFileSize)\n        height @include(if: $includeHeight)\n        width @include(if: $includeWidth)\n        mimeType @include(if: $includeMimeType)\n        url @include(if: $includeUrl)\n      }\n    }\n  }\n\n\n  query GetFiles(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $searchQuery: String\n    $includeAlt: Boolean!\n    $includeCreatedAt: Boolean!\n    $includeDuration: Boolean!\n    $includeFileSize: Boolean!\n    $includeHeight: Boolean!\n    $includeMimeType: Boolean!\n    $includeThumbnail: Boolean!\n    $includeUpdatedAt: Boolean!\n    $includeUrl: Boolean!\n    $includeWidth: Boolean!\n  ) {\n    files(first: $maxEntriesPerRun, after: $cursor, reverse: true, sortKey: CREATED_AT, query: $searchQuery) {\n      nodes {\n        ...FileFields\n      }\n\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetFilesQuery, variables: GetFilesQueryVariables},
  "\n  \n  fragment FileFields on File {\n    __typename\n    id\n    updatedAt\n    alt @include(if: $includeAlt)\n    createdAt @include(if: $includeCreatedAt)\n    updatedAt @include(if: $includeUpdatedAt)\n    thumbnail: preview @include(if: $includeThumbnail) {\n      image {\n        url\n      }\n    }\n\n    ... on GenericFile {\n      mimeType @include(if: $includeMimeType)\n      originalFileSize @include(if: $includeFileSize)\n      url\n    }\n\n    ... on MediaImage {\n      image {\n        url\n        width @include(if: $includeWidth)\n        height @include(if: $includeHeight)\n      }\n      mimeType @include(if: $includeMimeType)\n      originalSource @include(if: $includeFileSize) {\n        fileSize\n      }\n    }\n\n    ... on Video {\n      filename\n      duration @include(if: $includeDuration)\n      originalSource {\n        fileSize @include(if: $includeFileSize)\n        height @include(if: $includeHeight)\n        width @include(if: $includeWidth)\n        mimeType @include(if: $includeMimeType)\n        url @include(if: $includeUrl)\n      }\n    }\n  }\n\n\n  query GetSingleFile(\n    $id: ID!\n    $includeAlt: Boolean!\n    $includeCreatedAt: Boolean!\n    $includeDuration: Boolean!\n    $includeFileSize: Boolean!\n    $includeHeight: Boolean!\n    $includeMimeType: Boolean!\n    $includeThumbnail: Boolean!\n    $includeUpdatedAt: Boolean!\n    $includeUrl: Boolean!\n    $includeWidth: Boolean!\n  ) {\n    node(id: $id) {\n      id\n      ...FileFields\n    }\n  }\n": {return: GetSingleFileQuery, variables: GetSingleFileQueryVariables},
  "\n  \n  fragment InventoryItemFields on InventoryItem {\n    harmonizedSystemCode\n    createdAt\n    id\n    inventoryHistoryUrl\n    provinceCodeOfOrigin\n    requiresShipping\n    sku\n    tracked\n    trackedEditable {\n      locked\n      reason\n    }\n    updatedAt\n    unitCost {\n      amount\n      currencyCode\n    }\n    countryCodeOfOrigin\n    locationsCount\n    variant {\n      id\n    }\n  }\n\n\n  query GetInventoryItems($maxEntriesPerRun: Int!, $cursor: String, $searchQuery: String) {\n    inventoryItems(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...InventoryItemFields\n      }\n\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetInventoryItemsQuery, variables: GetInventoryItemsQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetLocations(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n    $searchQuery: String\n  ) {\n    locations(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID, includeInactive: true) {\n      nodes {\n        ...Location\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetLocationsQuery, variables: GetLocationsQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetSingleLocation(\n    $id: ID!\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n  ) {\n    location(id: $id) {\n      ...Location\n    }\n  }\n": {return: GetSingleLocationQuery, variables: GetSingleLocationQueryVariables},
  "\n  \n  fragment MetafieldDefinition on MetafieldDefinition {\n    key\n    id\n    namespace\n    name\n    description\n    metafieldsCount\n    ownerType\n    pinnedPosition\n    type {\n      name\n    }\n    validations {\n      name\n      type\n      value\n    }\n    validationStatus\n    visibleToStorefrontApi\n  }\n\n\n  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxEntriesPerRun: Int!, $cursor: String) {\n    metafieldDefinitions(ownerType: $ownerType, first: $maxEntriesPerRun, after: $cursor) {\n      nodes {\n        ...MetafieldDefinition\n      }\n    }\n  }\n": {return: GetMetafieldDefinitionsQuery, variables: GetMetafieldDefinitionsQueryVariables},
  "\n  \n  fragment MetafieldDefinition on MetafieldDefinition {\n    key\n    id\n    namespace\n    name\n    description\n    metafieldsCount\n    ownerType\n    pinnedPosition\n    type {\n      name\n    }\n    validations {\n      name\n      type\n      value\n    }\n    validationStatus\n    visibleToStorefrontApi\n  }\n\n\n  query GetSingleMetafieldDefinition($id: ID!) {\n    metafieldDefinition(id: $id) {\n      ...MetafieldDefinition\n    }\n  }\n": {return: GetSingleMetafieldDefinitionQuery, variables: GetSingleMetafieldDefinitionQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query GetSingleMetafield($gid: ID!) {\n    node(id: $gid) {\n      ... on Metafield {\n        ...MetafieldFields\n        owner {\n          __typename\n          ... on Node {\n            id\n          }\n          ... on Product {\n            id\n          }\n          ... on Collection {\n            id\n          }\n          ... on Customer {\n            id\n          }\n          ... on DraftOrder {\n            id\n          }\n          ... on Location {\n            id\n          }\n          ... on Order {\n            id\n          }\n          ... on ProductVariant {\n            id\n            owner: product {\n              id\n            }\n          }\n          ... on Shop {\n            id\n          }\n        }\n        definition {\n          id\n        }\n      }\n    }\n  }\n": {return: GetSingleMetafieldQuery, variables: GetSingleMetafieldQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query GetNodesMetafieldsByKey($ids: [ID!]!, $metafieldKeys: [String!], $countMetafields: Int) {\n    nodes(ids: $ids) {\n      id\n      __typename\n      ... on HasMetafields {\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n    }\n  }\n": {return: GetNodesMetafieldsByKeyQuery, variables: GetNodesMetafieldsByKeyQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query GetSingleNodeMetafieldsByKey($ownerGid: ID!, $metafieldKeys: [String!], $countMetafields: Int!) {\n    node(id: $ownerGid) {\n      id\n      __typename\n      ... on ProductVariant {\n        parentOwner: product {\n          id\n        }\n      }\n      ... on HasMetafields {\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n            definition {\n              id\n            }\n          }\n        }\n      }\n    }\n  }\n": {return: GetSingleNodeMetafieldsByKeyQuery, variables: GetSingleNodeMetafieldsByKeyQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query GetShopMetafieldsByKey($metafieldKeys: [String!], $countMetafields: Int!) {\n    shop {\n      id\n      metafields(keys: $metafieldKeys, first: $countMetafields) {\n        nodes {\n          ...MetafieldFields\n          definition {\n            id\n          }\n        }\n      }\n    }\n  }\n": {return: GetShopMetafieldsByKeyQuery, variables: GetShopMetafieldsByKeyQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetSingleMetaObjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {\n    metaobjectDefinition(id: $id) {\n      ...MetaobjectDefinition\n    }\n  }\n": {return: GetSingleMetaObjectDefinitionQuery, variables: GetSingleMetaObjectDefinitionQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetSingleMetaObjectDefinitionByType(\n    $type: String!\n    $includeCapabilities: Boolean!\n    $includeFieldDefinitions: Boolean!\n  ) {\n    metaobjectDefinitionByType(type: $type) {\n      ...MetaobjectDefinition\n    }\n  }\n": {return: GetSingleMetaObjectDefinitionByTypeQuery, variables: GetSingleMetaObjectDefinitionByTypeQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetMetaobjectDefinitions(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $includeCapabilities: Boolean!\n    $includeFieldDefinitions: Boolean!\n  ) {\n    metaobjectDefinitions(first: $maxEntriesPerRun, after: $cursor) {\n      nodes {\n        ...MetaobjectDefinition\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetMetaobjectDefinitionsQuery, variables: GetMetaobjectDefinitionsQueryVariables},
  "\n  \n  fragment OrderTransactionFields on OrderTransaction {\n    id\n    kind\n    status\n    gateway\n    createdAt\n    authorizationCode\n    accountNumber\n    receiptJson @include(if: $includeReceiptJson)\n    settlementCurrency\n    settlementCurrencyRate\n    errorCode\n    processedAt\n    test\n    paymentId\n    paymentIcon @include(if: $includeIcon) {\n      url\n    }\n    amountSet {\n      shopMoney @include(if: $includeAmount) {\n        amount\n      }\n      presentmentMoney @include(if: $includeTransactionCurrency) {\n        currencyCode\n      }\n    }\n    totalUnsettledSet @include(if: $includeTotalUnsettled) {\n      shopMoney {\n        amount\n      }\n    }\n    parentTransaction @include(if: $includeParentTransaction) {\n      id\n    }\n    paymentDetails @include(if: $includePaymentDetails) {\n      ... on BasePaymentDetails {\n        paymentMethodName\n      }\n      ... on CardPaymentDetails {\n        avsResultCode\n        bin\n        company\n        cvvResultCode\n        expirationMonth\n        expirationYear\n        name\n        number\n        wallet\n      }\n    }\n    # user @include(if: $includeUser) {\n    #   id\n    # }\n  }\n\n\n  query getOrderTransactions(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $searchQuery: String\n    $includeAmount: Boolean!\n    $includeIcon: Boolean!\n    $includeParentTransaction: Boolean!\n    $includePaymentDetails: Boolean!\n    $includeReceiptJson: Boolean!\n    $includeTotalUnsettled: Boolean!\n    $includeTransactionCurrency: Boolean!\n  ) {\n    orders(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        id\n        name\n        transactions(first: 5) {\n          ...OrderTransactionFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetOrderTransactionsQuery, variables: GetOrderTransactionsQueryVariables},
  "\n  query QueryProductTypes {\n    shop {\n      name\n      productTypes(first: 250) {\n        edges {\n          node\n        }\n      }\n    }\n  }\n": {return: QueryProductTypesQuery, variables: QueryProductTypesQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment ProductFields on Product {\n    id\n    handle\n    createdAt\n    title\n    productType\n    publishedAt\n    status\n    tags\n    templateSuffix\n    updatedAt\n    vendor\n    isGiftCard\n    descriptionHtml\n    onlineStoreUrl\n\n    # Optional fields and connections\n    options(first: $maxOptions) @include(if: $includeOptions) {\n      name\n    }\n    featuredImage @include(if: $includeFeaturedImage) {\n      url\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n  }\n\n\n  query getProductsWithMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $maxOptions: Int\n    $searchQuery: String\n    $includeOptions: Boolean!\n    $includeFeaturedImage: Boolean!\n    $includeMetafields: Boolean!\n  ) {\n    products(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...ProductFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetProductsWithMetafieldsQuery, variables: GetProductsWithMetafieldsQueryVariables},
  "\n  query GetOnlineStorePublication {\n    appByHandle(handle: \"online_store\") {\n      id\n      handle\n      title\n      installation {\n        publication {\n          id\n        }\n      }\n    }\n  }\n": {return: GetOnlineStorePublicationQuery, variables: GetOnlineStorePublicationQueryVariables},
}

interface GeneratedMutationTypes {
  "\n  \n  fragment FileFields on File {\n    __typename\n    id\n    updatedAt\n    alt @include(if: $includeAlt)\n    createdAt @include(if: $includeCreatedAt)\n    updatedAt @include(if: $includeUpdatedAt)\n    thumbnail: preview @include(if: $includeThumbnail) {\n      image {\n        url\n      }\n    }\n\n    ... on GenericFile {\n      mimeType @include(if: $includeMimeType)\n      originalFileSize @include(if: $includeFileSize)\n      url\n    }\n\n    ... on MediaImage {\n      image {\n        url\n        width @include(if: $includeWidth)\n        height @include(if: $includeHeight)\n      }\n      mimeType @include(if: $includeMimeType)\n      originalSource @include(if: $includeFileSize) {\n        fileSize\n      }\n    }\n\n    ... on Video {\n      filename\n      duration @include(if: $includeDuration)\n      originalSource {\n        fileSize @include(if: $includeFileSize)\n        height @include(if: $includeHeight)\n        width @include(if: $includeWidth)\n        mimeType @include(if: $includeMimeType)\n        url @include(if: $includeUrl)\n      }\n    }\n  }\n\n\n  mutation fileUpdate(\n    $files: [FileUpdateInput!]!\n    $includeAlt: Boolean!\n    $includeCreatedAt: Boolean!\n    $includeDuration: Boolean!\n    $includeFileSize: Boolean!\n    $includeHeight: Boolean!\n    $includeMimeType: Boolean!\n    $includeThumbnail: Boolean!\n    $includeUpdatedAt: Boolean!\n    $includeUrl: Boolean!\n    $includeWidth: Boolean!\n  ) {\n    fileUpdate(files: $files) {\n      files {\n        ...FileFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FileUpdateMutation, variables: FileUpdateMutationVariables},
  "\n  mutation fileDelete($fileIds: [ID!]!) {\n    fileDelete(fileIds: $fileIds) {\n      deletedFileIds\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: FileDeleteMutation, variables: FileDeleteMutationVariables},
  "\n  \n  fragment InventoryItemFields on InventoryItem {\n    harmonizedSystemCode\n    createdAt\n    id\n    inventoryHistoryUrl\n    provinceCodeOfOrigin\n    requiresShipping\n    sku\n    tracked\n    trackedEditable {\n      locked\n      reason\n    }\n    updatedAt\n    unitCost {\n      amount\n      currencyCode\n    }\n    countryCodeOfOrigin\n    locationsCount\n    variant {\n      id\n    }\n  }\n\n\n  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemUpdateInput!) {\n    inventoryItemUpdate(id: $id, input: $input) {\n      inventoryItem {\n        ...InventoryItemFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: InventoryItemUpdateMutation, variables: InventoryItemUpdateMutationVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  mutation locationEdit(\n    $id: ID!\n    $input: LocationEditInput!\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n  ) {\n    locationEdit(id: $id, input: $input) {\n      location {\n        ...Location\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: LocationEditMutation, variables: LocationEditMutationVariables},
  "\n  mutation LocationActivate($locationId: ID!) {\n    locationActivate(locationId: $locationId) {\n      location {\n        name\n        isActive\n      }\n      locationActivateUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n": {return: LocationActivateMutation, variables: LocationActivateMutationVariables},
  "\n  mutation LocationDeactivate($locationId: ID!, $destinationLocationId: ID) {\n    locationDeactivate(locationId: $locationId, destinationLocationId: $destinationLocationId) {\n      location {\n        name\n        isActive\n      }\n      locationDeactivateUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n": {return: LocationDeactivateMutation, variables: LocationDeactivateMutationVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {\n    metafieldsSet(metafields: $inputs) {\n      metafields {\n        ...MetafieldFields\n        definition {\n          id\n        }\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: SetMetafieldsMutation, variables: SetMetafieldsMutationVariables},
  "\n  mutation metafieldDelete($input: MetafieldDeleteInput!) {\n    metafieldDelete(input: $input) {\n      deletedId\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: MetafieldDeleteMutation, variables: MetafieldDeleteMutationVariables},
  "\n  mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {\n    metaobjectCreate(metaobject: $metaobject) {\n      metaobject {\n        id\n      }\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: CreateMetaobjectMutation, variables: CreateMetaobjectMutationVariables},
  "\n  mutation DeleteMetaobject($id: ID!) {\n    metaobjectDelete(id: $id) {\n      deletedId\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: DeleteMetaobjectMutation, variables: DeleteMetaobjectMutationVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment ProductFields on Product {\n    id\n    handle\n    createdAt\n    title\n    productType\n    publishedAt\n    status\n    tags\n    templateSuffix\n    updatedAt\n    vendor\n    isGiftCard\n    descriptionHtml\n    onlineStoreUrl\n\n    # Optional fields and connections\n    options(first: $maxOptions) @include(if: $includeOptions) {\n      name\n    }\n    featuredImage @include(if: $includeFeaturedImage) {\n      url\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n  }\n\n\n  mutation UpdateProduct(\n    $countMetafields: Int\n    $includeFeaturedImage: Boolean!\n    $includeMetafields: Boolean!\n    $includeOptions: Boolean!\n    $maxOptions: Int\n    $metafieldKeys: [String!]\n    $metafieldsSetsInput: [MetafieldsSetInput!]!\n    $productInput: ProductInput!\n  ) {\n    metafieldsSet(metafields: $metafieldsSetsInput) {\n      metafields {\n        key\n        namespace\n        value\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n    productUpdate(input: $productInput) {\n      product {\n        ...ProductFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: UpdateProductMutation, variables: UpdateProductMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
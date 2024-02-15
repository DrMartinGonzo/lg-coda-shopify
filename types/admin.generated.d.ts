/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import * as AdminTypes from './admin.types.ts';

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

export type IsSmartCollectionQueryVariables = AdminTypes.Exact<{
  collectionGid: AdminTypes.Scalars['ID']['input'];
}>;


export type IsSmartCollectionQuery = { collection?: AdminTypes.Maybe<{ isSmartCollection?: AdminTypes.Maybe<Pick<AdminTypes.CollectionRuleSet, 'appliedDisjunctively'>> }> };

export type GetCollectionsMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetCollectionsMetafieldsQuery = { collections: { nodes: Array<(
      Pick<AdminTypes.Collection, 'id'>
      & { metafields: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type UpdateCollectionMutationVariables = AdminTypes.Exact<{
  input: AdminTypes.CollectionInput;
}>;


export type UpdateCollectionMutation = { collectionUpdate?: AdminTypes.Maybe<{ collection?: AdminTypes.Maybe<Pick<AdminTypes.Collection, 'handle' | 'descriptionHtml' | 'templateSuffix' | 'title'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type GetOnlineStorePublicationQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type GetOnlineStorePublicationQuery = { appByHandle?: AdminTypes.Maybe<(
    Pick<AdminTypes.App, 'id' | 'handle' | 'title'>
    & { installation?: AdminTypes.Maybe<{ publication?: AdminTypes.Maybe<Pick<AdminTypes.Publication, 'id'>> }> }
  )> };

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

export type GetCustomersMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetCustomersMetafieldsQuery = { customers: { nodes: Array<(
      Pick<AdminTypes.Customer, 'id'>
      & { metafields: { nodes: Array<(
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

export type CheckThrottleStatusQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type CheckThrottleStatusQuery = { shop: Pick<AdminTypes.Shop, 'id'> };

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

export type MetafieldFieldsFragment = (
  { __typename: 'Metafield' }
  & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
);

export type MetafieldDefinitionFragment = (
  Pick<AdminTypes.MetafieldDefinition, 'key' | 'id' | 'namespace' | 'name' | 'description'>
  & { type: Pick<AdminTypes.MetafieldDefinitionType, 'name'>, validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
);

export type GetMetafieldDefinitionsQueryVariables = AdminTypes.Exact<{
  ownerType: AdminTypes.MetafieldOwnerType;
  maxMetafieldsPerResource: AdminTypes.Scalars['Int']['input'];
}>;


export type GetMetafieldDefinitionsQuery = { metafieldDefinitions: { nodes: Array<(
      Pick<AdminTypes.MetafieldDefinition, 'key' | 'id' | 'namespace' | 'name' | 'description'>
      & { type: Pick<AdminTypes.MetafieldDefinitionType, 'name'>, validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> } };

export type GetShopMetafieldsQueryVariables = AdminTypes.Exact<{
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields: AdminTypes.Scalars['Int']['input'];
}>;


export type GetShopMetafieldsQuery = { shop: (
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

export type GetMetaObjectFieldDefinitionsFromMetaobjectDefinitionQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetMetaObjectFieldDefinitionsFromMetaobjectDefinitionQuery = { metaobjectDefinition?: AdminTypes.Maybe<{ fieldDefinitions: Array<(
      Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
      & { type: (
        Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
        & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
      ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> }> };

export type GetMetaObjectFieldDefinitionsQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetMetaObjectFieldDefinitionsQuery = { metaobject?: AdminTypes.Maybe<{ definition: { fieldDefinitions: Array<(
        Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
        & { type: (
          Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
          & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
        ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
      )> } }> };

export type GetMetaobjectDefinitionByTypeQueryVariables = AdminTypes.Exact<{
  type: AdminTypes.Scalars['String']['input'];
  includeCapabilities: AdminTypes.Scalars['Boolean']['input'];
  includeFieldDefinitions: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetMetaobjectDefinitionByTypeQuery = { metaobjectDefinitionByType?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetaobjectDefinition, 'id' | 'name' | 'displayNameKey' | 'type'>
    & { capabilities?: { publishable: Pick<AdminTypes.MetaobjectCapabilitiesPublishable, 'enabled'> }, fieldDefinitions?: Array<(
      Pick<AdminTypes.MetaobjectFieldDefinition, 'key' | 'description' | 'name' | 'required'>
      & { type: (
        Pick<AdminTypes.MetafieldDefinitionType, 'category' | 'name' | 'supportsDefinitionMigrations'>
        & { supportedValidations: Array<Pick<AdminTypes.MetafieldDefinitionSupportedValidation, 'name' | 'type'>> }
      ), validations: Array<Pick<AdminTypes.MetafieldDefinitionValidation, 'name' | 'type' | 'value'>> }
    )> }
  )> };

export type GetMetaobjectDefinitionQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  includeCapabilities: AdminTypes.Scalars['Boolean']['input'];
  includeFieldDefinitions: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetMetaobjectDefinitionQuery = { metaobjectDefinition?: AdminTypes.Maybe<(
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
  batchSize: AdminTypes.Scalars['Int']['input'];
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

export type UpdateMetaobjectMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
  metaobject: AdminTypes.MetaobjectUpdateInput;
}>;


export type UpdateMetaobjectMutation = { metaobjectUpdate?: AdminTypes.Maybe<{ metaobject?: AdminTypes.Maybe<Pick<AdminTypes.Metaobject, 'id'>>, userErrors: Array<Pick<AdminTypes.MetaobjectUserError, 'field' | 'message' | 'code'>> }> };

export type DeleteMetaobjectMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type DeleteMetaobjectMutation = { metaobjectDelete?: AdminTypes.Maybe<(
    Pick<AdminTypes.MetaobjectDeletePayload, 'deletedId'>
    & { userErrors: Array<Pick<AdminTypes.MetaobjectUserError, 'field' | 'message' | 'code'>> }
  )> };

export type OrderTransactionFieldsFragment = (
  AdminTypes.MakeOptional<Pick<AdminTypes.OrderTransaction, 'id' | 'kind' | 'status' | 'gateway' | 'createdAt' | 'authorizationCode' | 'receiptJson' | 'settlementCurrency' | 'settlementCurrencyRate' | 'errorCode' | 'processedAt' | 'test' | 'paymentId'>, 'receiptJson'>
  & { paymentIcon?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, amountSet: { shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }, totalUnsettledSet?: AdminTypes.Maybe<{ shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }>, parentTransaction?: AdminTypes.Maybe<Pick<AdminTypes.OrderTransaction, 'id'>>, paymentDetails?: AdminTypes.Maybe<Pick<AdminTypes.CardPaymentDetails, 'avsResultCode' | 'bin' | 'company' | 'cvvResultCode' | 'expirationMonth' | 'expirationYear' | 'name' | 'number' | 'wallet'>> }
);

export type GetOrderTransactionsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  includeParentTransaction: AdminTypes.Scalars['Boolean']['input'];
  includePaymentDetails: AdminTypes.Scalars['Boolean']['input'];
  includeReceiptJson: AdminTypes.Scalars['Boolean']['input'];
}>;


export type GetOrderTransactionsQuery = { orders: { nodes: Array<(
      Pick<AdminTypes.Order, 'id' | 'name'>
      & { transactions: Array<(
        AdminTypes.MakeOptional<Pick<AdminTypes.OrderTransaction, 'id' | 'kind' | 'status' | 'gateway' | 'createdAt' | 'authorizationCode' | 'receiptJson' | 'settlementCurrency' | 'settlementCurrencyRate' | 'errorCode' | 'processedAt' | 'test' | 'paymentId'>, 'receiptJson'>
        & { paymentIcon?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, amountSet: { shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }, totalUnsettledSet?: AdminTypes.Maybe<{ shopMoney: Pick<AdminTypes.MoneyV2, 'amount'> }>, parentTransaction?: AdminTypes.Maybe<Pick<AdminTypes.OrderTransaction, 'id'>>, paymentDetails?: AdminTypes.Maybe<Pick<AdminTypes.CardPaymentDetails, 'avsResultCode' | 'bin' | 'company' | 'cvvResultCode' | 'expirationMonth' | 'expirationYear' | 'name' | 'number' | 'wallet'>> }
      )> }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type GetOrdersMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetOrdersMetafieldsQuery = { orders: { nodes: Array<(
      Pick<AdminTypes.Order, 'id'>
      & { metafields: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type GetProductVariantsMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetProductVariantsMetafieldsQuery = { productVariants: { nodes: Array<(
      Pick<AdminTypes.ProductVariant, 'id'>
      & { metafields: { nodes: Array<(
          { __typename: 'Metafield' }
          & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
        )> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'endCursor'> } };

export type ProductFieldsFragment = (
  Pick<AdminTypes.Product, 'id' | 'handle' | 'createdAt' | 'title' | 'productType' | 'publishedAt' | 'status' | 'tags' | 'templateSuffix' | 'updatedAt' | 'vendor' | 'isGiftCard' | 'descriptionHtml' | 'onlineStoreUrl'>
  & { options?: Array<Pick<AdminTypes.ProductOption, 'name'>>, featuredImage?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url'>>, metafields?: { nodes: Array<(
      { __typename: 'Metafield' }
      & Pick<AdminTypes.Metafield, 'id' | 'namespace' | 'key' | 'type' | 'value' | 'ownerType' | 'createdAt' | 'updatedAt'>
    )> } }
);

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

export type GetProductsMetafieldsQueryVariables = AdminTypes.Exact<{
  maxEntriesPerRun: AdminTypes.Scalars['Int']['input'];
  cursor?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  metafieldKeys?: AdminTypes.InputMaybe<Array<AdminTypes.Scalars['String']['input']> | AdminTypes.Scalars['String']['input']>;
  countMetafields?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  searchQuery?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetProductsMetafieldsQuery = { products: { nodes: Array<(
      Pick<AdminTypes.Product, 'id'>
      & { metafields: { nodes: Array<(
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

interface GeneratedQueryTypes {
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment CollectionFields on Collection {\n    handle\n    id\n    descriptionHtml\n    updatedAt\n    templateSuffix\n    title\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n\n    # Optional fields and connections\n    image @include(if: $includeImage) {\n      url\n    }\n    sortOrder @include(if: $includeSortOrder)\n    ruleSet @include(if: $includeRuleSet) {\n      appliedDisjunctively\n      rules {\n        column\n        condition\n        relation\n      }\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetCollections(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n    $includeImage: Boolean!\n    $includeMetafields: Boolean!\n    $includeSortOrder: Boolean!\n    $includeRuleSet: Boolean!\n  ) {\n    collections(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...CollectionFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCollectionsQuery, variables: GetCollectionsQueryVariables},
  "\n  query IsSmartCollection($collectionGid: ID!) {\n    collection(id: $collectionGid) {\n      # will be null for non smart collections\n      isSmartCollection: ruleSet {\n        appliedDisjunctively\n      }\n    }\n  }\n": {return: IsSmartCollectionQuery, variables: IsSmartCollectionQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query getCollectionsMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n  ) {\n    collections(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {\n      nodes {\n        id\n\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCollectionsMetafieldsQuery, variables: GetCollectionsMetafieldsQueryVariables},
  "\n  query GetOnlineStorePublication {\n    appByHandle(handle: \"online_store\") {\n      id\n      handle\n      title\n      installation {\n        publication {\n          id\n        }\n      }\n    }\n  }\n": {return: GetOnlineStorePublicationQuery, variables: GetOnlineStorePublicationQueryVariables},
  "\n  \n  \n  fragment CustomerAddressFields on MailingAddress {\n    address1\n    address2\n    city\n    company\n    coordinatesValidated\n    country\n    countryCodeV2\n    firstName\n    formattedArea\n    id\n    lastName\n    latitude\n    longitude\n    name\n    phone\n    province\n    provinceCode\n    timeZone\n    zip\n    formatted(withName: true, withCompany: true)\n  }\n\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment CustomerFields on Customer {\n    id\n    createdAt\n    displayName\n    email\n    firstName\n    lastName\n    lifetimeDuration\n    locale\n    multipassIdentifier\n    note\n    numberOfOrders\n    phone\n    productSubscriberStatus\n    state\n    tags\n    taxExempt\n    taxExemptions\n    unsubscribeUrl\n    updatedAt\n    validEmailAddress\n    verifiedEmail\n    addresses(first: 3) {\n      ...CustomerAddressFields\n    }\n    defaultAddress {\n      ...CustomerAddressFields\n    }\n    amountSpent {\n      amount\n      currencyCode\n    }\n    canDelete\n    # TODO: breaks graphql-codegen\n    # events(first: 2) {\n    #   nodes {\n    #     ... on CommentEvent {\n    #       id\n    #       message\n    #     }\n    #   }\n    # }\n    emailMarketingConsent {\n      consentUpdatedAt\n      marketingOptInLevel\n      marketingState\n    }\n    smsMarketingConsent {\n      consentCollectedFrom\n      consentUpdatedAt\n      marketingOptInLevel\n      marketingState\n    }\n    statistics {\n      predictedSpendTier\n    }\n\n    # Optional fields and connections\n    # options(first: $maxOptions) @include(if: $includeOptions) {\n    #   name\n    # }\n    # featuredImage @include(if: $includeFeaturedImage) {\n    #   url\n    # }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query getCustomersWithMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n    $includeMetafields: Boolean!\n  ) {\n    customers(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...CustomerFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCustomersWithMetafieldsQuery, variables: GetCustomersWithMetafieldsQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query getCustomersMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n  ) {\n    customers(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {\n      nodes {\n        id\n\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetCustomersMetafieldsQuery, variables: GetCustomersMetafieldsQueryVariables},
  "\n  \n  fragment FileFields on File {\n    __typename\n    id\n    updatedAt\n    alt @include(if: $includeAlt)\n    createdAt @include(if: $includeCreatedAt)\n    updatedAt @include(if: $includeUpdatedAt)\n    thumbnail: preview @include(if: $includeThumbnail) {\n      image {\n        url\n      }\n    }\n\n    ... on GenericFile {\n      mimeType @include(if: $includeMimeType)\n      originalFileSize @include(if: $includeFileSize)\n      url\n    }\n\n    ... on MediaImage {\n      image {\n        url\n        width @include(if: $includeWidth)\n        height @include(if: $includeHeight)\n      }\n      mimeType @include(if: $includeMimeType)\n      originalSource @include(if: $includeFileSize) {\n        fileSize\n      }\n    }\n\n    ... on Video {\n      filename\n      duration @include(if: $includeDuration)\n      originalSource {\n        fileSize @include(if: $includeFileSize)\n        height @include(if: $includeHeight)\n        width @include(if: $includeWidth)\n        mimeType @include(if: $includeMimeType)\n        url @include(if: $includeUrl)\n      }\n    }\n  }\n\n\n  query GetFiles(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $searchQuery: String\n    $includeAlt: Boolean!\n    $includeCreatedAt: Boolean!\n    $includeDuration: Boolean!\n    $includeFileSize: Boolean!\n    $includeHeight: Boolean!\n    $includeMimeType: Boolean!\n    $includeThumbnail: Boolean!\n    $includeUpdatedAt: Boolean!\n    $includeUrl: Boolean!\n    $includeWidth: Boolean!\n  ) {\n    files(first: $maxEntriesPerRun, after: $cursor, reverse: true, sortKey: CREATED_AT, query: $searchQuery) {\n      nodes {\n        ...FileFields\n      }\n\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetFilesQuery, variables: GetFilesQueryVariables},
  "\n  query CheckThrottleStatus {\n    shop {\n      id\n    }\n  }\n": {return: CheckThrottleStatusQuery, variables: CheckThrottleStatusQueryVariables},
  "\n  \n  fragment InventoryItemFields on InventoryItem {\n    harmonizedSystemCode\n    createdAt\n    id\n    inventoryHistoryUrl\n    provinceCodeOfOrigin\n    requiresShipping\n    sku\n    tracked\n    trackedEditable {\n      locked\n      reason\n    }\n    updatedAt\n    unitCost {\n      amount\n      currencyCode\n    }\n    countryCodeOfOrigin\n    locationsCount\n    variant {\n      id\n    }\n  }\n\n\n  query GetInventoryItems($maxEntriesPerRun: Int!, $cursor: String, $searchQuery: String) {\n    inventoryItems(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...InventoryItemFields\n      }\n\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetInventoryItemsQuery, variables: GetInventoryItemsQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetLocations(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n    $searchQuery: String\n  ) {\n    locations(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID, includeInactive: true) {\n      nodes {\n        ...Location\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetLocationsQuery, variables: GetLocationsQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  query GetSingleLocation(\n    $id: ID!\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n  ) {\n    location(id: $id) {\n      ...Location\n    }\n  }\n": {return: GetSingleLocationQuery, variables: GetSingleLocationQueryVariables},
  "\n  \n  fragment MetafieldDefinition on MetafieldDefinition {\n    key\n    id\n    namespace\n    name\n    description\n    type {\n      name\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  query GetMetafieldDefinitions($ownerType: MetafieldOwnerType!, $maxMetafieldsPerResource: Int!) {\n    metafieldDefinitions(ownerType: $ownerType, first: $maxMetafieldsPerResource) {\n      nodes {\n        ...MetafieldDefinition\n      }\n    }\n  }\n": {return: GetMetafieldDefinitionsQuery, variables: GetMetafieldDefinitionsQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query GetShopMetafields($metafieldKeys: [String!], $countMetafields: Int!) {\n    shop {\n      id\n      metafields(keys: $metafieldKeys, first: $countMetafields) {\n        nodes {\n          ...MetafieldFields\n          definition {\n            id\n          }\n        }\n      }\n    }\n  }\n": {return: GetShopMetafieldsQuery, variables: GetShopMetafieldsQueryVariables},
  "\n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  query GetMetaObjectFieldDefinitionsFromMetaobjectDefinition($id: ID!) {\n    metaobjectDefinition(id: $id) {\n      fieldDefinitions {\n        ...MetaobjectFieldDefinition\n      }\n    }\n  }\n": {return: GetMetaObjectFieldDefinitionsFromMetaobjectDefinitionQuery, variables: GetMetaObjectFieldDefinitionsFromMetaobjectDefinitionQueryVariables},
  "\n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  query GetMetaObjectFieldDefinitions($id: ID!) {\n    metaobject(id: $id) {\n      definition {\n        fieldDefinitions {\n          ...MetaobjectFieldDefinition\n        }\n      }\n    }\n  }\n": {return: GetMetaObjectFieldDefinitionsQuery, variables: GetMetaObjectFieldDefinitionsQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetMetaobjectDefinitionByType(\n    $type: String!\n    $includeCapabilities: Boolean!\n    $includeFieldDefinitions: Boolean!\n  ) {\n    metaobjectDefinitionByType(type: $type) {\n      ...MetaobjectDefinition\n    }\n  }\n": {return: GetMetaobjectDefinitionByTypeQuery, variables: GetMetaobjectDefinitionByTypeQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetMetaobjectDefinition($id: ID!, $includeCapabilities: Boolean!, $includeFieldDefinitions: Boolean!) {\n    metaobjectDefinition(id: $id) {\n      ...MetaobjectDefinition\n    }\n  }\n": {return: GetMetaobjectDefinitionQuery, variables: GetMetaobjectDefinitionQueryVariables},
  "\n  \n  \n  fragment MetaobjectFieldDefinition on MetaobjectFieldDefinition {\n    key\n    description\n    name\n    required\n    type {\n      category\n      name\n      supportedValidations {\n        name\n        type\n      }\n      supportsDefinitionMigrations\n    }\n    validations {\n      name\n      type\n      value\n    }\n  }\n\n\n  fragment MetaobjectDefinition on MetaobjectDefinition {\n    id\n    name\n    displayNameKey\n    type\n    capabilities @include(if: $includeCapabilities) {\n      publishable {\n        enabled\n      }\n    }\n    fieldDefinitions @include(if: $includeFieldDefinitions) {\n      ...MetaobjectFieldDefinition\n    }\n  }\n\n\n  query GetMetaobjectDefinitions(\n    $batchSize: Int!\n    $cursor: String\n    $includeCapabilities: Boolean!\n    $includeFieldDefinitions: Boolean!\n  ) {\n    metaobjectDefinitions(first: $batchSize, after: $cursor) {\n      nodes {\n        ...MetaobjectDefinition\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetMetaobjectDefinitionsQuery, variables: GetMetaobjectDefinitionsQueryVariables},
  "\n  \n  fragment OrderTransactionFields on OrderTransaction {\n    id\n    kind\n    status\n    gateway\n    createdAt\n    authorizationCode\n    receiptJson @include(if: $includeReceiptJson)\n    settlementCurrency\n    settlementCurrencyRate\n    errorCode\n    processedAt\n    test\n    paymentId\n    paymentIcon {\n      url\n    }\n    amountSet {\n      shopMoney {\n        amount\n      }\n    }\n    totalUnsettledSet {\n      shopMoney {\n        amount\n      }\n    }\n    parentTransaction @include(if: $includeParentTransaction) {\n      id\n    }\n    paymentDetails @include(if: $includePaymentDetails) {\n      ... on CardPaymentDetails {\n        avsResultCode\n        bin\n        company\n        cvvResultCode\n        expirationMonth\n        expirationYear\n        name\n        number\n        wallet\n      }\n      # ... on ShopPayInstallmentsPaymentDetails {\n      #   paymentMethodName\n      # }\n    }\n  }\n\n\n  query getOrderTransactions(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $searchQuery: String\n    $includeParentTransaction: Boolean!\n    $includePaymentDetails: Boolean!\n    $includeReceiptJson: Boolean!\n  ) {\n    orders(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        id\n        name\n        transactions(first: 5) {\n          ...OrderTransactionFields\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetOrderTransactionsQuery, variables: GetOrderTransactionsQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query getOrdersMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n  ) {\n    orders(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {\n      nodes {\n        id\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetOrdersMetafieldsQuery, variables: GetOrdersMetafieldsQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query getProductVariantsMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n  ) {\n    productVariants(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {\n      nodes {\n        id\n\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetProductVariantsMetafieldsQuery, variables: GetProductVariantsMetafieldsQueryVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment ProductFields on Product {\n    id\n    handle\n    createdAt\n    title\n    productType\n    publishedAt\n    status\n    tags\n    templateSuffix\n    updatedAt\n    vendor\n    isGiftCard\n    descriptionHtml\n    onlineStoreUrl\n\n    # Optional fields and connections\n    options(first: $maxOptions) @include(if: $includeOptions) {\n      name\n    }\n    featuredImage @include(if: $includeFeaturedImage) {\n      url\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n  }\n\n\n  query getProductsWithMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $maxOptions: Int\n    $searchQuery: String\n    $includeOptions: Boolean!\n    $includeFeaturedImage: Boolean!\n    $includeMetafields: Boolean!\n  ) {\n    products(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery) {\n      nodes {\n        ...ProductFields\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetProductsWithMetafieldsQuery, variables: GetProductsWithMetafieldsQueryVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  query getProductsMetafields(\n    $maxEntriesPerRun: Int!\n    $cursor: String\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $searchQuery: String\n  ) {\n    products(first: $maxEntriesPerRun, after: $cursor, query: $searchQuery, sortKey: ID) {\n      nodes {\n        id\n        metafields(keys: $metafieldKeys, first: $countMetafields) {\n          nodes {\n            ...MetafieldFields\n          }\n        }\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n      }\n    }\n  }\n": {return: GetProductsMetafieldsQuery, variables: GetProductsMetafieldsQueryVariables},
}

interface GeneratedMutationTypes {
  "\n  mutation UpdateCollection($input: CollectionInput!) {\n    collectionUpdate(input: $input) {\n      collection {\n        handle\n        descriptionHtml\n        templateSuffix\n        title\n      }\n\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: UpdateCollectionMutation, variables: UpdateCollectionMutationVariables},
  "\n  \n  fragment FileFields on File {\n    __typename\n    id\n    updatedAt\n    alt @include(if: $includeAlt)\n    createdAt @include(if: $includeCreatedAt)\n    updatedAt @include(if: $includeUpdatedAt)\n    thumbnail: preview @include(if: $includeThumbnail) {\n      image {\n        url\n      }\n    }\n\n    ... on GenericFile {\n      mimeType @include(if: $includeMimeType)\n      originalFileSize @include(if: $includeFileSize)\n      url\n    }\n\n    ... on MediaImage {\n      image {\n        url\n        width @include(if: $includeWidth)\n        height @include(if: $includeHeight)\n      }\n      mimeType @include(if: $includeMimeType)\n      originalSource @include(if: $includeFileSize) {\n        fileSize\n      }\n    }\n\n    ... on Video {\n      filename\n      duration @include(if: $includeDuration)\n      originalSource {\n        fileSize @include(if: $includeFileSize)\n        height @include(if: $includeHeight)\n        width @include(if: $includeWidth)\n        mimeType @include(if: $includeMimeType)\n        url @include(if: $includeUrl)\n      }\n    }\n  }\n\n\n  mutation fileUpdate(\n    $files: [FileUpdateInput!]!\n    $includeAlt: Boolean!\n    $includeCreatedAt: Boolean!\n    $includeDuration: Boolean!\n    $includeFileSize: Boolean!\n    $includeHeight: Boolean!\n    $includeMimeType: Boolean!\n    $includeThumbnail: Boolean!\n    $includeUpdatedAt: Boolean!\n    $includeUrl: Boolean!\n    $includeWidth: Boolean!\n  ) {\n    fileUpdate(files: $files) {\n      files {\n        ...FileFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: FileUpdateMutation, variables: FileUpdateMutationVariables},
  "\n  mutation fileDelete($fileIds: [ID!]!) {\n    fileDelete(fileIds: $fileIds) {\n      deletedFileIds\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: FileDeleteMutation, variables: FileDeleteMutationVariables},
  "\n  \n  fragment InventoryItemFields on InventoryItem {\n    harmonizedSystemCode\n    createdAt\n    id\n    inventoryHistoryUrl\n    provinceCodeOfOrigin\n    requiresShipping\n    sku\n    tracked\n    trackedEditable {\n      locked\n      reason\n    }\n    updatedAt\n    unitCost {\n      amount\n      currencyCode\n    }\n    countryCodeOfOrigin\n    locationsCount\n    variant {\n      id\n    }\n  }\n\n\n  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemUpdateInput!) {\n    inventoryItemUpdate(id: $id, input: $input) {\n      inventoryItem {\n        ...InventoryItemFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: InventoryItemUpdateMutation, variables: InventoryItemUpdateMutationVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment Location on Location {\n    id\n    name\n    isActive\n    fulfillsOnlineOrders\n    hasActiveInventory\n    shipsInventory\n    address {\n      address1\n      address2\n      city\n      country\n      countryCode\n      phone\n      zip\n      province\n      provinceCode\n    }\n    fulfillmentService @include(if: $includeFulfillmentService) {\n      handle\n      serviceName\n    }\n    localPickupSettingsV2 @include(if: $includeLocalPickupSettings) {\n      instructions\n      pickupTime\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n  }\n\n\n  mutation locationEdit(\n    $id: ID!\n    $input: LocationEditInput!\n    $metafieldKeys: [String!]\n    $countMetafields: Int\n    $includeMetafields: Boolean!\n    $includeFulfillmentService: Boolean!\n    $includeLocalPickupSettings: Boolean!\n  ) {\n    locationEdit(id: $id, input: $input) {\n      location {\n        ...Location\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: LocationEditMutation, variables: LocationEditMutationVariables},
  "\n  mutation LocationActivate($locationId: ID!) {\n    locationActivate(locationId: $locationId) {\n      location {\n        name\n        isActive\n      }\n      locationActivateUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n": {return: LocationActivateMutation, variables: LocationActivateMutationVariables},
  "\n  mutation LocationDeactivate($locationId: ID!, $destinationLocationId: ID) {\n    locationDeactivate(locationId: $locationId, destinationLocationId: $destinationLocationId) {\n      location {\n        name\n        isActive\n      }\n      locationDeactivateUserErrors {\n        code\n        field\n        message\n      }\n    }\n  }\n": {return: LocationDeactivateMutation, variables: LocationDeactivateMutationVariables},
  "\n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  mutation SetMetafields($inputs: [MetafieldsSetInput!]!) {\n    metafieldsSet(metafields: $inputs) {\n      metafields {\n        ...MetafieldFields\n        definition {\n          id\n        }\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: SetMetafieldsMutation, variables: SetMetafieldsMutationVariables},
  "\n  mutation metafieldDelete($input: MetafieldDeleteInput!) {\n    metafieldDelete(input: $input) {\n      deletedId\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: MetafieldDeleteMutation, variables: MetafieldDeleteMutationVariables},
  "\n  mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {\n    metaobjectCreate(metaobject: $metaobject) {\n      metaobject {\n        id\n      }\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: CreateMetaobjectMutation, variables: CreateMetaobjectMutationVariables},
  "\n  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {\n    metaobjectUpdate(id: $id, metaobject: $metaobject) {\n      metaobject {\n        id\n      }\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: UpdateMetaobjectMutation, variables: UpdateMetaobjectMutationVariables},
  "\n  mutation DeleteMetaobject($id: ID!) {\n    metaobjectDelete(id: $id) {\n      deletedId\n\n      userErrors {\n        field\n        message\n        code\n      }\n    }\n  }\n": {return: DeleteMetaobjectMutation, variables: DeleteMetaobjectMutationVariables},
  "\n  \n  \n  fragment MetafieldFields on Metafield {\n    id\n    namespace\n    key\n    type\n    value\n    ownerType\n    createdAt\n    updatedAt\n    __typename\n  }\n\n\n  fragment ProductFields on Product {\n    id\n    handle\n    createdAt\n    title\n    productType\n    publishedAt\n    status\n    tags\n    templateSuffix\n    updatedAt\n    vendor\n    isGiftCard\n    descriptionHtml\n    onlineStoreUrl\n\n    # Optional fields and connections\n    options(first: $maxOptions) @include(if: $includeOptions) {\n      name\n    }\n    featuredImage @include(if: $includeFeaturedImage) {\n      url\n    }\n    metafields(keys: $metafieldKeys, first: $countMetafields) @include(if: $includeMetafields) {\n      nodes {\n        ...MetafieldFields\n      }\n    }\n\n    # availableForSale\n    # publishedOnPublication(publicationId: \"gid://shopify/Publication/42911268979\")\n    # seo {\n    #   description\n    #   title\n    # }\n    # trackingParameters\n    # media(first: 10) {\n    #   nodes {\n    #     mediaContentType\n    #   }\n    # }\n  }\n\n\n  mutation UpdateProduct(\n    $countMetafields: Int\n    $includeFeaturedImage: Boolean!\n    $includeMetafields: Boolean!\n    $includeOptions: Boolean!\n    $maxOptions: Int\n    $metafieldKeys: [String!]\n    $metafieldsSetsInput: [MetafieldsSetInput!]!\n    $productInput: ProductInput!\n  ) {\n    metafieldsSet(metafields: $metafieldsSetsInput) {\n      metafields {\n        key\n        namespace\n        value\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n    productUpdate(input: $productInput) {\n      product {\n        ...ProductFields\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: UpdateProductMutation, variables: UpdateProductMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}

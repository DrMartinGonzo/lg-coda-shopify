// #region Imports
import * as coda from '@codahq/packs-sdk';
import { ResultOf } from '../../../utils/graphql';

import { DEFAULT_CURRENCY_CODE } from '../../../config/config';
import { idToGraphQlGid } from '../../../helpers-graphql';
import { CodaMetafieldKeyValueSet } from '../../../helpers-setup';
import {
  MetafieldSyncTableSchema,
  metafieldSyncTableHelperEditColumns,
} from '../../../schemas/syncTable/MetafieldSchema';
import { CurrencyCode, MetafieldsSetInput } from '../../../types/admin.types';
import { extractValueAndUnitFromMeasurementString, isNullOrEmpty, isString } from '../../../utils/helpers';
import { GraphQlResourceName } from '../../ShopifyResource.types';
import { metafieldDefinitionFragment } from '../../metafieldDefinitions/metafieldDefinitions-graphql';
import {
  AllMetafieldTypeValue,
  Fields,
  METAFIELD_LEGACY_TYPES,
  METAFIELD_TYPES,
  MetafieldTypeValue,
} from '../Metafield.types';
import { MetafieldRestInput } from '../metafieldResource';
import { splitMetaFieldFullKey } from './metafields-utils-keys';

// #endregion

/**
 * Formate un objet MetafieldRestInput pour Rest Admin API ou un objet
 * MetafieldsSetInput pour GraphQL Admin API (si l'argument ownerGid est fourni)
 * à partir d'un paramètre Coda utilisant une formule `MetafieldKeyValueSet(…)`
 */
// prettier-ignore
export function formatMetafieldInput(metafieldSet: CodaMetafieldKeyValueSet): MetafieldRestInput;
// prettier-ignore
export function formatMetafieldInput(metafieldSet: CodaMetafieldKeyValueSet, ownerGid: string): MetafieldsSetInput;
export function formatMetafieldInput(metafieldSet: CodaMetafieldKeyValueSet, ownerGid?: string) {
  const { metaKey, metaNamespace } = splitMetaFieldFullKey(metafieldSet.key);
  let input: MetafieldRestInput | MetafieldsSetInput;
  if (metafieldSet.value !== null) {
    input = {
      namespace: metaNamespace,
      key: metaKey,
      type: metafieldSet.type,
      value: isString(metafieldSet.value) ? metafieldSet.value : JSON.stringify(metafieldSet.value),
    } as MetafieldRestInput;

    if (ownerGid !== undefined) {
      input = {
        ...input,
        ownerId: ownerGid,
      } as MetafieldsSetInput;
    }
  }
  return input;
}

/**
 * Format a Rating cell value for GraphQL Api
 */
function formatRatingFieldForApi(
  value: number,
  validations: ResultOf<typeof metafieldDefinitionFragment>['validations']
): Fields.Rating {
  if (!validations) {
    throw new Error('Validations are required to format a rating field');
  }
  return {
    scale_min: parseFloat(validations.find((v) => v.name === 'scale_min').value),
    scale_max: parseFloat(validations.find((v) => v.name === 'scale_max').value),
    value: value,
  };
}

/**
 * Format a Money cell value for GraphQL Api
 */
function formatMoneyFieldForApi(amount: number, currency_code: CurrencyCode): Fields.Money {
  return { amount, currency_code: currency_code ?? DEFAULT_CURRENCY_CODE };
}
/**
 * Format a Measurement cell value for GraphQL Api
 * @param measurementString the string entered by user in format "{value}{unit}" with eventual spaces between
 * @param metafieldType the type of metafield
 */
function formatMeasurementFieldForApi(
  measurementString: string,
  metafieldType: MetafieldTypeValue
): Fields.Measurement {
  const measurementType = metafieldType.replace('list.', '');
  const { value, unit, unitFull } = extractValueAndUnitFromMeasurementString(measurementString, measurementType);
  return {
    value,
    unit: unitFull,
  };
}

/**
 * This function is the same for a metaobject field and a metafield
 * @param value the Coda column cell value
 * @param type the type of field
 * @param validations possible validations from the field definition
 * @param codaSchema
 */
export function formatMetafieldValueForApi(
  value: any,
  type: AllMetafieldTypeValue,
  validations?: ResultOf<typeof metafieldDefinitionFragment>['validations'],
  currencyCode?: CurrencyCode
): string | null {
  if (isNullOrEmpty(value)) {
    return null;
  }

  switch (type) {
    case METAFIELD_TYPES.single_line_text_field:
    case METAFIELD_TYPES.multi_line_text_field:
    case METAFIELD_TYPES.url:
    case METAFIELD_TYPES.color:
    case METAFIELD_TYPES.date:
    case METAFIELD_TYPES.date_time:
    case METAFIELD_TYPES.json:
    case METAFIELD_LEGACY_TYPES.string:
    case METAFIELD_LEGACY_TYPES.json_string:
      return value;

    case METAFIELD_TYPES.boolean:
    case METAFIELD_LEGACY_TYPES.integer:
    case METAFIELD_TYPES.number_integer:
    case METAFIELD_TYPES.number_decimal:
    case METAFIELD_TYPES.list_single_line_text_field:
    case METAFIELD_TYPES.list_url:
    case METAFIELD_TYPES.list_color:
    case METAFIELD_TYPES.list_number_integer:
    case METAFIELD_TYPES.list_number_decimal:
    case METAFIELD_TYPES.list_date:
    case METAFIELD_TYPES.list_date_time:
      return JSON.stringify(value);

    // NOT SUPPORTED
    case METAFIELD_TYPES.rich_text_field:
      break;

    // RATING
    case METAFIELD_TYPES.rating:
      return JSON.stringify(formatRatingFieldForApi(value, validations));
    case METAFIELD_TYPES.list_rating:
      return JSON.stringify(value.map((v) => formatRatingFieldForApi(v, validations)));

    // MONEY
    case METAFIELD_TYPES.money:
      return JSON.stringify(formatMoneyFieldForApi(value, currencyCode));

    // REFERENCE
    case METAFIELD_TYPES.page_reference:
      return idToGraphQlGid(GraphQlResourceName.OnlineStorePage, value?.id);
    case METAFIELD_TYPES.list_page_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.OnlineStorePage, v?.id)));

    case METAFIELD_TYPES.file_reference:
      return value?.id;
    case METAFIELD_TYPES.list_file_reference:
      return JSON.stringify(value.map((v) => v?.id));

    case METAFIELD_TYPES.metaobject_reference:
      return idToGraphQlGid(GraphQlResourceName.Metaobject, value?.id);
    case METAFIELD_TYPES.list_metaobject_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Metaobject, v?.id)));

    // We only support raw value for mixed references
    case METAFIELD_TYPES.mixed_reference:
      return value;
    case METAFIELD_TYPES.list_mixed_reference:
      // The value could have been converted to a real string by coda
      return JSON.stringify(Array.isArray(value) ? value : value.split(',').map((v: string) => v.trim()));

    case METAFIELD_TYPES.collection_reference:
      return idToGraphQlGid(GraphQlResourceName.Collection, value?.id);
    case METAFIELD_TYPES.list_collection_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Collection, v?.id)));

    case METAFIELD_TYPES.product_reference:
      return idToGraphQlGid(GraphQlResourceName.Product, value?.id);
    case METAFIELD_TYPES.list_product_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.Product, v?.id)));

    case METAFIELD_TYPES.variant_reference:
      return idToGraphQlGid(GraphQlResourceName.ProductVariant, value?.id);
    case METAFIELD_TYPES.list_variant_reference:
      return JSON.stringify(value.map((v) => idToGraphQlGid(GraphQlResourceName.ProductVariant, v?.id)));

    // MEASUREMENT
    case METAFIELD_TYPES.weight:
    case METAFIELD_TYPES.dimension:
    case METAFIELD_TYPES.volume:
      return JSON.stringify(formatMeasurementFieldForApi(value, type));
    case METAFIELD_TYPES.list_weight:
    case METAFIELD_TYPES.list_dimension:
    case METAFIELD_TYPES.list_volume:
      return JSON.stringify(value.map((v) => JSON.stringify(formatMeasurementFieldForApi(v, type))));

    default:
      break;
  }

  throw new Error(`Unknown metafield type: ${type}`);
}

/**
 * We use rawValue as default, but if any helper edit column is set and has
 * matching type, we use its value
 */
export function formatMetafieldSyncTableValueForApi(
  update: coda.SyncUpdate<string, string, typeof MetafieldSyncTableSchema>
) {
  const { updatedFields } = update;
  const { type } = update.previousValue;

  let value: string | null = update.newValue.rawValue as string;
  for (let i = 0; i < metafieldSyncTableHelperEditColumns.length; i++) {
    const item = metafieldSyncTableHelperEditColumns[i];
    if (updatedFields.includes(item.key)) {
      if (type === item.type) {
        /**
         *? Si jamais on implémente une colonne pour les currencies,
         *? il faudra veiller a bien passer le currencyCode a {@link formatMetafieldValueForApi}
         */
        value = formatMetafieldValueForApi(update.newValue[item.key], type);
      } else {
        const goodColumn = metafieldSyncTableHelperEditColumns.find((item) => item.type === type);
        let errorMsg = `Metafield type mismatch. You tried to update using an helper column that doesn't match the metafield type.`;
        if (goodColumn) {
          errorMsg += ` The correct column for type '${type}' is: '${goodColumn.key}'.`;
        } else {
          errorMsg += ` You can only update this metafield by directly editing the 'Raw Value' column.`;
        }
        throw new coda.UserVisibleError(errorMsg);
      }
    }
  }

  return value;
}

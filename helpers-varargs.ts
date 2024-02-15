import * as coda from '@codahq/packs-sdk';
import isUrl from 'is-url-superb';

import { DEFAULT_PRODUCT_OPTION_NAME } from './constants';
import {
  getMetaFieldFullKey,
  maybeHasMetaFieldKeys,
  preprendPrefixToMetaFieldKey,
} from './metafields/metafields-functions';
import { fetchMetafieldDefinitionsGraphQl } from './metafields/metafields-functions';
import { Metafield, MetafieldOwnerType } from './types/admin.types';
import { MetafieldDefinitionFragment } from './types/admin.generated';
import { maybeParseJson } from './helpers';

export type UpdateCreateProp = {
  display: string;
  key: string;
  type: string;
};

export function getMetafieldsCreateUpdateProps(metafieldDefinitions: MetafieldDefinitionFragment[]) {
  const metafieldProps = metafieldDefinitions.map(
    (metafieldDefinition): UpdateCreateProp => ({
      display: metafieldDefinition.name,
      key: getMetaFieldFullKey(metafieldDefinition),
      type: 'metafield',
    })
  );
  return metafieldProps;
  // const metafieldPropsKeys = metafieldProps.map((prop) => prop.key);
}

export function getVarargsCreateUpdateKeys(varargs: string[]) {
  return varargs.filter((_, i) => i % 2 === 0);
}
export function getVarargsCreateUpdateValues(varargs: string[]) {
  return varargs.filter((_, i) => i % 2 !== 0);
}

export function parseVarargsCreateUpdatePropsValues(
  varargs: string[],
  standardProps: UpdateCreateProp[],
  metafieldProps: UpdateCreateProp[] = []
) {
  const newValues = {};
  while (varargs.length > 0) {
    let key: string, value: string, parsedValue: any;
    [key, value, ...varargs] = varargs;

    const matchStandardProps = standardProps.find((prop) => prop.key === key);
    const matchMetafieldProps = metafieldProps.find((prop) => prop.key === key);

    if (matchStandardProps) {
      const type = matchStandardProps.type;
      // Standard values
      if (type === 'string') {
        parsedValue = value;
      } else if (type === 'boolean') {
        parsedValue = value === 'true';
      } else if (type === 'number') {
        parsedValue = parseFloat(value);
      }
      // Special cases
      else if (type === 'productImageUrls') {
        // TODO: need to validate these are indeed IMAGE URLs
        parsedValue = value.split(',').map((url) => {
          const trimmedUrl = url.trim();
          if (!isUrl(trimmedUrl)) {
            throw new coda.UserVisibleError(`Invalid URL: ${trimmedUrl}`);
          }
          return { src: url.trim() };
        });
      } else if (type === 'productCreateOptions') {
        parsedValue = value.split(',').map((option) => {
          return { name: option.trim(), values: [DEFAULT_PRODUCT_OPTION_NAME] };
        });
      } else {
        throw new coda.UserVisibleError(`Unknown property type: ${type}`);
      }
      newValues[key] = parsedValue;
      continue;
    } else if (matchMetafieldProps) {
      // Il faut parser la valeur car on envoie que des strings, impossible d'envoyer direct un object, une array d'objets
      const prefixedMetafieldFromKey = preprendPrefixToMetaFieldKey(key);
      newValues[prefixedMetafieldFromKey] = maybeParseJson(value);

      continue;
    }

    throw new coda.UserVisibleError(`Unknown property key: ${key}`);
  }

  return newValues;
}

export async function getVarargsMetafieldDefinitionsAndUpdateCreateProps(
  varargs: string[],
  metafieldOwnerType: MetafieldOwnerType,
  context: coda.ExecutionContext
) {
  let metafieldDefinitions: MetafieldDefinitionFragment[] = [];
  let metafieldUpdateCreateProps: UpdateCreateProp[] = [];

  const maybeHasMetaFields = maybeHasMetaFieldKeys(getVarargsCreateUpdateKeys(varargs));
  if (maybeHasMetaFields) {
    metafieldDefinitions = await fetchMetafieldDefinitionsGraphQl({ ownerType: metafieldOwnerType }, context);
    metafieldUpdateCreateProps = getMetafieldsCreateUpdateProps(metafieldDefinitions);
  }

  return { metafieldDefinitions, metafieldUpdateCreateProps };
}

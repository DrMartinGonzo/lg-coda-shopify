import * as coda from '@codahq/packs-sdk';
import { writeFileSync } from 'fs';

import { PACK_IDENTITIES } from '../constants';
import { ArticleSyncTableSchema } from '../schemas/syncTable/ArticleSchema';
import { BlogSyncTableSchema } from '../schemas/syncTable/BlogSchema';
import { CollectSyncTableSchema } from '../schemas/syncTable/CollectSchema';
import { CollectionSyncTableSchema } from '../schemas/syncTable/CollectionSchema';
import { CustomerSyncTableSchema } from '../schemas/syncTable/CustomerSchema';
import { DraftOrderSyncTableSchema } from '../schemas/syncTable/DraftOrderSchema';
import { FileSyncTableSchema } from '../schemas/syncTable/FileSchema';
import { InventoryItemSyncTableSchema } from '../schemas/syncTable/InventoryItemSchema';
import { InventoryLevelSyncTableSchema } from '../schemas/syncTable/InventoryLevelSchema';
import { LocationSyncTableSchema } from '../schemas/syncTable/LocationSchema';
import { MetaObjectSyncTableBaseSchema } from '../schemas/syncTable/MetaObjectSchema';
import { MetafieldDefinitionSyncTableSchema } from '../schemas/syncTable/MetafieldDefinitionSchema';
import { MetafieldSyncTableSchema } from '../schemas/syncTable/MetafieldSchema';
import { OrderLineItemSyncTableSchema } from '../schemas/syncTable/OrderLineItemSchema';
import { OrderSyncTableSchema } from '../schemas/syncTable/OrderSchema';
import { OrderTransactionSyncTableSchema } from '../schemas/syncTable/OrderTransactionSchema';
import { PageSyncTableSchema } from '../schemas/syncTable/PageSchema';
import { ProductSyncTableSchemaRest } from '../schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from '../schemas/syncTable/ProductVariantSchema';
import { RedirectSyncTableSchema } from '../schemas/syncTable/RedirectSchema';
import { ShopSyncTableSchema } from '../schemas/syncTable/ShopSchema';
import { arrayUnique } from '../utils/helpers';

function codaTypeToTypeScript(type: string, codaType: string, wrapArray = false) {
  let ret = 'undefined';

  if (type === coda.ValueType.String) {
    ret = 'string';
  }

  switch (type) {
    case coda.ValueType.Number:
      ret = 'number';
      break;

    case coda.ValueType.String:
      if (codaType !== undefined) {
        switch (codaType) {
          case coda.ValueHintType.Date:
          case coda.ValueHintType.DateTime:
            ret = 'string | number | Date';
            break;
          case coda.ValueHintType.Time:
            ret = 'string | number | Date';
            break;
          default:
            ret = 'string';
            break;
        }
      } else {
        ret = 'string';
      }
      break;

    case coda.ValueType.Object:
      ret = 'object';
      break;

    case coda.ValueType.Boolean:
      ret = 'boolean';
      break;

    default:
      break;
  }
  return ret + (wrapArray ? '[]' : '');
}

const indentSpace = '  ';
const indent = (indentation: number) => indentSpace.repeat(indentation);

function formatProperty(key: string, property, indentation = 1, wrapArray = false) {
  let curtIndent = indentation;
  const effectiveKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
  const type = property.type;
  const codaType = property['codaType'];
  const required = property.required ?? false;

  if (type === coda.ValueType.Object) {
    // Objects
    curtIndent += 1;
    const effectiveKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    const codaType = property['codaType'];
    const required = property.required ?? false;
    const objectLines = [];

    objectLines.push(`${indent(curtIndent - 1)}${effectiveKey}${required ? '' : '?'}: {`);

    if (codaType && codaType === coda.ValueHintType.Reference) {
      const { displayProperty, idProperty } = property;
      objectLines.push(formatProperty(idProperty, property.properties[idProperty], curtIndent));
      if (displayProperty !== idProperty) {
        objectLines.push(formatProperty(displayProperty, property.properties[displayProperty], curtIndent));
      }
    } else {
      Object.keys(property.properties).forEach((key) => {
        objectLines.push(formatProperty(key, property.properties[key], curtIndent));
      });
    }
    objectLines.push(`${indent(curtIndent - 1)}}${wrapArray ? '[]' : ''};`);
    return objectLines.join('\n');
  }
  // Arrays
  else if (type === coda.ValueType.Array) {
    return formatProperty(key, property.items, curtIndent, true);
  }
  // Everything else
  else {
    return `${indent(curtIndent)}${effectiveKey}${required ? '' : '?'}: ${codaTypeToTypeScript(
      type,
      codaType,
      wrapArray
    )};`;
  }
}

const usedDisplayProperties = [];
function generateCodaRowInterface(schema: ReturnType<typeof coda.makeObjectSchema>, identity: string) {
  // const idEffectivePropertyKey = getObjectSchemaEffectiveKey(schema, schema.idProperty);
  const interfaceName = `${identity}Row`;
  const lines = [];
  lines.push(`/**
 * Coda Row Interface for ${identity}s Sync Table
 */`);

  usedDisplayProperties.push(schema.displayProperty);

  lines.push(`export interface ${interfaceName} extends BaseRow {`);
  Object.keys(schema.properties).forEach((key) => {
    lines.push(formatProperty(key, schema.properties[key], 1));
  });
  lines.push(`}`);

  // lines.push(`export type ${interfaceName}NoId = {`);
  // lines.push(`  [K in keyof ${interfaceName} as Exclude<K, '${idEffectivePropertyKey}'>]: ${interfaceName}[K];`);
  // lines.push(`};`);
  return lines.join('\n');
}

const definitions = [
  [ArticleSyncTableSchema, PACK_IDENTITIES.Article],
  [BlogSyncTableSchema, PACK_IDENTITIES.Blog],
  [CollectSyncTableSchema, PACK_IDENTITIES.Collect],
  [CollectionSyncTableSchema, PACK_IDENTITIES.Collection],
  [DraftOrderSyncTableSchema, PACK_IDENTITIES.DraftOrder],
  [CustomerSyncTableSchema, PACK_IDENTITIES.Customer],
  [FileSyncTableSchema, PACK_IDENTITIES.File],
  [InventoryItemSyncTableSchema, PACK_IDENTITIES.InventoryItem],
  [InventoryLevelSyncTableSchema, PACK_IDENTITIES.InventoryLevel],
  [LocationSyncTableSchema, PACK_IDENTITIES.Location],
  [MetafieldSyncTableSchema, PACK_IDENTITIES.Metafield],
  [MetafieldDefinitionSyncTableSchema, PACK_IDENTITIES.MetafieldDefinition],
  [MetaObjectSyncTableBaseSchema, PACK_IDENTITIES.Metaobject],
  [OrderSyncTableSchema, PACK_IDENTITIES.Order],
  [OrderLineItemSyncTableSchema, PACK_IDENTITIES.OrderLineItem],
  [OrderTransactionSyncTableSchema, PACK_IDENTITIES.OrderTransaction],
  [PageSyncTableSchema, PACK_IDENTITIES.Page],
  [ProductSyncTableSchemaRest, PACK_IDENTITIES.Product],
  [ProductVariantSyncTableSchema, PACK_IDENTITIES.ProductVariant],
  [RedirectSyncTableSchema, PACK_IDENTITIES.Redirect],
  [ShopSyncTableSchema, PACK_IDENTITIES.Shop],
];

const blocks = definitions.map((def) => {
  const [schema, identity] = def as [ReturnType<typeof coda.makeObjectSchema>, string];
  return generateCodaRowInterface(schema, identity);
});

writeFileSync(
  './schemas/CodaRows.types.ts',

  `/**
 * This file is autogenerated from SyncTable schemas present in the pack.
 * You should't need to manually edit.
 *
 * Identities: ${definitions
   .map((def) => def[1])
   .sort()
   .join(', ')}
 * Last generated: ${new Date().toISOString()}
 *
 */

type UsedDisplayProperties = ${arrayUnique(usedDisplayProperties)
    .map((prop) => `'${prop}'`)
    .join(' | ')};

export type FormatRowReferenceFn<T, displayPropT extends string = never> = (
  id: T,
  displayProp?: string
) => {
  /** The row idProperty. */
  id: T;
} & {
  /** For the row displayProperty. Could be name, title… anything */
  [k in displayPropT]: string;
};

export interface BaseRow extends Record<string, any> {
  id: number | string;
}

export type RowWithMetafields<RowT extends BaseRow> = RowT & {
  [key: string]: any;
};

${blocks.join('\n\n') + '\n'}`
);

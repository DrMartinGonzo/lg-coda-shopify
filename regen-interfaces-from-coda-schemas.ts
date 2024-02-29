const fs = require('fs');
import * as coda from '@codahq/packs-sdk';

import {
  IDENTITY_ARTICLE,
  IDENTITY_BLOG,
  IDENTITY_COLLECT,
  IDENTITY_COLLECTION,
  IDENTITY_CUSTOMER,
  IDENTITY_DRAFT_ORDER,
  IDENTITY_FILE,
  IDENTITY_INVENTORYITEM,
  IDENTITY_INVENTORYLEVEL,
  IDENTITY_LOCATION,
  IDENTITY_METAFIELD,
  IDENTITY_METAFIELD_DEFINITION,
  IDENTITY_METAOBJECT,
  IDENTITY_ORDER,
  IDENTITY_ORDER_LINE_ITEM,
  IDENTITY_ORDER_TRANSACTION,
  IDENTITY_PAGE,
  IDENTITY_PRODUCT,
  IDENTITY_PRODUCT_VARIANT,
  IDENTITY_REDIRECT,
  IDENTITY_SHOP,
} from './constants';
import { FileSyncTableSchema } from './schemas/syncTable/FileSchema';
import { OrderSyncTableSchema } from './schemas/syncTable/OrderSchema';
import { ProductSyncTableSchemaRest } from './schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from './schemas/syncTable/ProductVariantSchema';
import { ArticleSyncTableSchema } from './schemas/syncTable/ArticleSchema';
import { BlogSyncTableSchema } from './schemas/syncTable/BlogSchema';
import { CollectSyncTableSchema } from './schemas/syncTable/CollectSchema';
import { CustomerSyncTableSchema } from './schemas/syncTable/CustomerSchema';
import { LocationSyncTableSchema } from './schemas/syncTable/LocationSchema';
import { MetafieldSyncTableSchema } from './schemas/syncTable/MetafieldSchema';
import { MetafieldDefinitionSyncTableSchema } from './schemas/syncTable/MetafieldDefinitionSchema';
import { MetaObjectSyncTableBaseSchema } from './schemas/syncTable/MetaObjectSchema';
import { DraftOrderSyncTableSchema } from './schemas/syncTable/DraftOrderSchema';
import { OrderLineItemSyncTableSchema } from './schemas/syncTable/OrderLineItemSchema';
import { OrderTransactionSyncTableSchema } from './schemas/syncTable/OrderTransactionSchema';
import { PageSyncTableSchema } from './schemas/syncTable/PageSchema';
import { InventoryItemSyncTableSchema } from './schemas/syncTable/InventoryItemSchema';
import { InventoryLevelSyncTableSchema } from './schemas/syncTable/InventoryLevelSchema';
import { RedirectSyncTableSchema } from './schemas/syncTable/RedirectSchema';
import { ShopSyncTableSchema } from './schemas/syncTable/ShopSchema';

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
            ret = 'Date';
            break;
          case coda.ValueHintType.Time:
            ret = 'Date';
            break;
        }
      }
      ret = 'string';
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
function formatProperty(key: string, property, indent = 1, wrapArray = false) {
  let currentIndentation = indent;
  const effectiveKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
  const type = property.type;
  const codaType = property['codaType'];
  const required = property.required ?? false;

  if (type === coda.ValueType.Object) {
    // Objects
    currentIndentation += 1;
    const effectiveKey = property.hasOwnProperty('fromKey') ? property.fromKey : key;
    const codaType = property['codaType'];
    const required = property.required ?? false;
    const objectLines = [];

    objectLines.push(`${indentSpace.repeat(currentIndentation - 1)}${effectiveKey}${required ? '' : '?'}: {`);

    if (codaType && codaType === coda.ValueHintType.Reference) {
      const { displayProperty, idProperty } = property;
      objectLines.push(formatProperty(idProperty, property.properties[idProperty], currentIndentation));
      if (displayProperty !== idProperty) {
        objectLines.push(formatProperty(displayProperty, property.properties[displayProperty], currentIndentation));
      }
    } else {
      Object.keys(property.properties).forEach((key) => {
        objectLines.push(formatProperty(key, property.properties[key], currentIndentation));
      });
    }
    objectLines.push(`${indentSpace.repeat(currentIndentation - 1)}}${wrapArray ? '[]' : ''};`);
    return objectLines.join('\n');
  }
  // Arrays
  else if (type === coda.ValueType.Array) {
    return formatProperty(key, property.items, currentIndentation, true);
  }
  // Everything else
  else {
    return `${indentSpace.repeat(currentIndentation)}${effectiveKey}${required ? '' : '?'}: ${codaTypeToTypeScript(
      type,
      codaType,
      wrapArray
    )};`;
  }
}

function generateCodaRowInterface(schema: ReturnType<typeof coda.makeObjectSchema>, identity: string) {
  const lines = [];
  lines.push(`/**
 * Coda Row Interface for ${identity}s Sync Table
 */`);
  lines.push(`export interface ${identity}Row extends Record<string, any> {`);

  Object.keys(schema.properties).forEach((key) => {
    lines.push(formatProperty(key, schema.properties[key], 1));
  });

  lines.push(`}`);
  return lines.join('\n');
}

const definitions = [
  [ArticleSyncTableSchema, IDENTITY_ARTICLE],
  [BlogSyncTableSchema, IDENTITY_BLOG],
  [CollectSyncTableSchema, IDENTITY_COLLECT],
  [CollectSyncTableSchema, IDENTITY_COLLECTION],
  [DraftOrderSyncTableSchema, IDENTITY_DRAFT_ORDER],
  [CustomerSyncTableSchema, IDENTITY_CUSTOMER],
  [FileSyncTableSchema, IDENTITY_FILE],
  [InventoryItemSyncTableSchema, IDENTITY_INVENTORYITEM],
  [InventoryLevelSyncTableSchema, IDENTITY_INVENTORYLEVEL],
  [LocationSyncTableSchema, IDENTITY_LOCATION],
  [MetafieldSyncTableSchema, IDENTITY_METAFIELD],
  [MetafieldDefinitionSyncTableSchema, IDENTITY_METAFIELD_DEFINITION],
  [MetaObjectSyncTableBaseSchema, IDENTITY_METAOBJECT],
  [OrderSyncTableSchema, IDENTITY_ORDER],
  [OrderLineItemSyncTableSchema, IDENTITY_ORDER_LINE_ITEM],
  [OrderTransactionSyncTableSchema, IDENTITY_ORDER_TRANSACTION],
  [PageSyncTableSchema, IDENTITY_PAGE],
  [ProductSyncTableSchemaRest, IDENTITY_PRODUCT],
  [ProductVariantSyncTableSchema, IDENTITY_PRODUCT_VARIANT],
  [RedirectSyncTableSchema, IDENTITY_REDIRECT],
  [ShopSyncTableSchema, IDENTITY_SHOP],
];

const blocks = definitions.map((def) => {
  const [schema, identity] = def as [ReturnType<typeof coda.makeObjectSchema>, string];
  return generateCodaRowInterface(schema, identity);
});

fs.writeFileSync(
  './types/CodaRows.ts',

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

${blocks.join('\n\n') + '\n'}`
);

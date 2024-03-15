const fs = require('fs');
import * as coda from '@codahq/packs-sdk';

import { FileSyncTableSchema } from './schemas/syncTable/FileSchema';
import { OrderSyncTableSchema } from './schemas/syncTable/OrderSchema';
import { ProductSyncTableSchemaRest } from './schemas/syncTable/ProductSchemaRest';
import { ProductVariantSyncTableSchema } from './schemas/syncTable/ProductVariantSchema';
import { ArticleSyncTableSchema } from './schemas/syncTable/ArticleSchema';
import { BlogSyncTableSchema } from './schemas/syncTable/BlogSchema';
import { CollectSyncTableSchema } from './schemas/syncTable/CollectSchema';
import { CollectionSyncTableSchema } from './schemas/syncTable/CollectionSchema';
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
import { Identity } from './constants';

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

function generateCodaRowInterface(schema: ReturnType<typeof coda.makeObjectSchema>, identity: string) {
  // const idEffectivePropertyKey = getObjectSchemaEffectiveKey(schema, schema.idProperty);
  const interfaceName = `${identity}Row`;
  const lines = [];
  lines.push(`/**
 * Coda Row Interface for ${identity}s Sync Table
 */`);
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
  [ArticleSyncTableSchema, Identity.Article],
  [BlogSyncTableSchema, Identity.Blog],
  [CollectSyncTableSchema, Identity.Collect],
  [CollectionSyncTableSchema, Identity.Collection],
  [DraftOrderSyncTableSchema, Identity.DraftOrder],
  [CustomerSyncTableSchema, Identity.Customer],
  [FileSyncTableSchema, Identity.File],
  [InventoryItemSyncTableSchema, Identity.InventoryItem],
  [InventoryLevelSyncTableSchema, Identity.InventoryLevel],
  [LocationSyncTableSchema, Identity.Location],
  [MetafieldSyncTableSchema, Identity.Metafield],
  [MetafieldDefinitionSyncTableSchema, Identity.MetafieldDefinition],
  [MetaObjectSyncTableBaseSchema, Identity.Metaobject],
  [OrderSyncTableSchema, Identity.Order],
  [OrderLineItemSyncTableSchema, Identity.OrderLineItem],
  [OrderTransactionSyncTableSchema, Identity.OrderTransaction],
  [PageSyncTableSchema, Identity.Page],
  [ProductSyncTableSchemaRest, Identity.Product],
  [ProductVariantSyncTableSchema, Identity.ProductVariant],
  [RedirectSyncTableSchema, Identity.Redirect],
  [ShopSyncTableSchema, Identity.Shop],
];

const blocks = definitions.map((def) => {
  const [schema, identity] = def as [ReturnType<typeof coda.makeObjectSchema>, string];
  return generateCodaRowInterface(schema, identity);
});

fs.writeFileSync(
  './types/CodaRows.d.ts',

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

export interface BaseRow extends Record<string, any> {
  id: number | string;
}

${blocks.join('\n\n') + '\n'}`
);

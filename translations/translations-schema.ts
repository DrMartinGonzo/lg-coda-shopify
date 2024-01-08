import * as coda from '@codahq/packs-sdk';

/**====================================================================================================================
 *    Exported schemas
 *===================================================================================================================== */
/*
{
    "data": {
        "translatableResource": {
            "resourceId": "gid://shopify/Metafield/20360199962739",
            "translations": [],
            "translatableContent": [
                {
                    "key": "value",
                    "value": "pure_origin",
                    "digest": "1cce52558e6d67b91105ef9622ae5b89789e5c79b85f1cc17447beb91ac65c14",
                    "locale": "fr"
                }
            ]
        }
    },
    "extensions": {
        "cost": {
            "requestedQueryCost": 3,
            "actualQueryCost": 3,
            "throttleStatus": {
                "maximumAvailable": 1000.0,
                "currentlyAvailable": 997,
                "restoreRate": 50.0
            }
        }
    }
}
*/

const TranslationSchema = coda.makeObjectSchema({
  properties: {
    key: { type: coda.ValueType.String, fixedId: 'key' },
    value: { type: coda.ValueType.String, fixedId: 'value' },
    digest: { type: coda.ValueType.String, fixedId: 'digest' },
    locale: { type: coda.ValueType.String, fixedId: 'locale' },
  },
  displayProperty: 'value',
});

export const TranslatableResourceSchema = coda.makeObjectSchema({
  properties: {
    translatableResourceId: { type: coda.ValueType.String, fromKey: 'resourceId', fixedId: 'translatableResourceId' },
    translations: { type: coda.ValueType.Array, items: TranslationSchema, fixedId: 'translations' },
    translatableContent: { type: coda.ValueType.Array, items: TranslationSchema, fixedId: 'translatableContent' },
  },
  idProperty: 'translatableResourceId',
  featuredProperties: ['translations', 'translatableContent'],
});

import * as coda from '@codahq/packs-sdk';

export const CompanySchema = coda.makeObjectSchema({
  properties: {
    company_id: {
      type: coda.ValueType.Number,
      fromKey: 'id',
      fixedId: 'company_id',
      useThousandsSeparator: false,
      description: 'The browser screen height in pixels, if available.',
    },
    location_id: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen width in pixels, if available.',
    },
  },
  displayProperty: 'company_id',
});

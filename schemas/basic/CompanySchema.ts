import * as coda from '@codahq/packs-sdk';
import * as PROPS from '../../coda/utils/coda-properties';

export const CompanySchema = coda.makeObjectSchema({
  properties: {
    id: PROPS.makeRequiredIdNumberProp('company'),
    location_id: PROPS.ID_NUMBER,
  },
  displayProperty: 'id',
});

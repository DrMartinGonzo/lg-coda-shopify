import * as coda from '@codahq/packs-sdk';

export const ClientDetailsSchema = coda.makeObjectSchema({
  properties: {
    accept_language: {
      type: coda.ValueType.String,
      description: 'The languages and locales that the browser understands.',
    },
    browser_height: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen height in pixels, if available.',
    },
    browser_ip: { type: coda.ValueType.String, description: 'The browser IP address.' },
    browser_width: {
      type: coda.ValueType.Number,
      useThousandsSeparator: false,
      description: 'The browser screen width in pixels, if available.',
    },
    session_hash: { type: coda.ValueType.String, description: 'A hash of the session.' },
    user_agent: {
      type: coda.ValueType.String,
      description: 'Details of the browsing client, including software and operating versions.',
    },
  },
  displayProperty: 'user_agent',
});

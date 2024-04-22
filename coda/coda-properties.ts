import * as coda from '@codahq/packs-sdk';

// #region Basic Properties
/** ———————————— STRINGS ——————————— */
export const STRING: coda.SimpleStringSchema = {
  type: coda.ValueType.String,
};
export const HTML: coda.SimpleStringSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Html,
};
export const MARKDOWN: coda.SimpleStringSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Markdown,
};
export const DATETIME_STRING: coda.StringDateTimeSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.DateTime,
};
export const DATE_STRING: coda.StringDateSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Date,
};
export const TIME_STRING: coda.StringTimeSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Time,
};
export const DURATION_STRING: coda.DurationSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Duration,
};
export const LINK: coda.LinkSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Url,
};
export const EMAIL: coda.EmailSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.Email,
};
export const IMAGE_REF: coda.ImageSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.ImageReference,
};
export const SELECT_LIST: coda.StringWithOptionsSchema = {
  type: coda.ValueType.String,
  codaType: coda.ValueHintType.SelectList,
};

/** ———————————— NUMBER ——————————— */
export const NUMBER: coda.NumericSchema = {
  type: coda.ValueType.Number,
};
export const ID_NUMBER: coda.NumericSchema = {
  type: coda.ValueType.Number,
  useThousandsSeparator: false,
};
export const CURRENCY: coda.CurrencySchema = {
  type: coda.ValueType.Number,
  codaType: coda.ValueHintType.Currency,
};
export const PERCENT: coda.NumericSchema = {
  type: coda.ValueType.Number,
  codaType: coda.ValueHintType.Percent,
};
/** ———————————— BOOLEAN ——————————— */
export const BOOLEAN: coda.BooleanSchema = {
  type: coda.ValueType.Boolean,
};
export const BOOLEAN_TOGGLE: coda.BooleanSchema = {
  type: coda.ValueType.Boolean,
  codaType: coda.ValueHintType.Toggle,
};
// #endregion

/**
 * A collection of helper functions for common Shopify properties.
 * Helps reduce boilerplate code and ensure consistency.
 */
// #region Helpers functions
export function makeRequiredIdNumberProp(name = 'item', fromKey = 'id', fixedId = 'id') {
  return {
    ...ID_NUMBER,
    fromKey,
    fixedId,
    required: true,
    description: `A unique numeric identifier for the ${name}.`,
  } satisfies coda.NumericSchema & coda.ObjectSchemaProperty;
}

export function makeGraphQlGidProp(name = 'item', fromKey = 'admin_graphql_api_id', fixedId = 'graphql_gid') {
  return {
    ...STRING,
    fromKey,
    fixedId,
    description: `The GraphQL GID of the ${name}.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}

export function makeAdminUrlProp(name = 'item', fromKey = 'admin_url', fixedId = 'admin_url') {
  return {
    ...LINK,
    fromKey,
    fixedId,
    description: `A link to the ${name} in the Shopify admin.`,
  } satisfies coda.LinkSchema & coda.ObjectSchemaProperty;
}

export function makeStoreUrlProp(name = 'item', fromKey = 'storeUrl', fixedId = 'storeUrl') {
  return {
    ...LINK,
    fromKey,
    fixedId,
    description: `A link to the ${name} in the online shop.`,
  } satisfies coda.LinkSchema & coda.ObjectSchemaProperty;
}

function makeDateAndTimeProp(name = 'item', fromKey = 'created_at', fixedId = 'created_at', action: string) {
  return {
    ...DATETIME_STRING,
    fromKey,
    fixedId,
    description: `The date and time when the ${name} ${action}.`,
  } satisfies coda.StringDateTimeSchema & coda.ObjectSchemaProperty;
}
export function makeCreatedAtProp(name = 'item', fromKey = 'created_at', fixedId = 'created_at') {
  return makeDateAndTimeProp(name, fromKey, fixedId, 'was created');
}
export function makePublishedAtProp(name = 'item', fromKey = 'published_at', fixedId = 'published_at') {
  return makeDateAndTimeProp(name, fromKey, fixedId, 'was published');
}
export function makeUpdatedAtProp(name = 'item', fromKey = 'updated_at', fixedId = 'updated_at') {
  return makeDateAndTimeProp(name, fromKey, fixedId, 'was last updated');
}

export function makePublishedProp(name = 'item', fromKey = 'published', fixedId = 'published') {
  return {
    ...BOOLEAN,
    fromKey,
    fixedId,
    description: `Whether the ${name} is visible.`,
  } satisfies coda.BooleanSchema & coda.ObjectSchemaProperty;
}

export function makeTitleProp(name = 'item', fromKey = 'title', fixedId = 'title') {
  return {
    ...STRING,
    fromKey,
    fixedId,
    description: `The title of the ${name}.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}

export function makeTagsProp(name = 'item', maxTags = 250, maxChar = 255, fromKey = 'tags', fixedId = 'tags') {
  return {
    ...STRING,
    fromKey,
    fixedId,
    description: `A comma-separated list of tags attached to the ${name}.\nUp to ${maxTags} tags. Each tag can have up to ${maxChar} characters.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}

export function makeTemplateSuffixProp(name = 'item', fromKey = 'template_suffix', fixedId = 'template_suffix') {
  return {
    ...SELECT_LIST,
    fromKey,
    fixedId,
    requireForUpdates: false,
    options: coda.OptionsType.Dynamic,
    description: `The suffix of the Liquid template used for the ${name}. If this property is null, then the ${name} uses the default template.`,
  } satisfies coda.StringWithOptionsSchema & coda.ObjectSchemaProperty;
}

export function makeHandleProp(name = 'item', fromKey = 'handle', fixedId = 'handle') {
  return {
    ...STRING,
    fromKey,
    fixedId,
    description: `A human-friendly unique string for the ${name} that's automatically generated from the ${name}'s title. The handle is used in the ${name}'s URL.\nIf you update the handle, the old handle won't be redirected to the new one automatically.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}

export function makeBodyHtmlProp(name = 'item', contentName = 'content', fromKey = 'body_html', fixedId = 'body_html') {
  return {
    ...HTML,
    fromKey,
    fixedId,
    description: `The ${contentName} of the ${name}, complete with HTML markup.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}

export function makeBodyProp(name = 'item', contentName = 'content', fromKey = 'body', fixedId = 'body') {
  return {
    ...STRING,
    fromKey,
    fixedId,
    description: `Text-only ${contentName} of the ${name}, stripped of any HTML tags and formatting that were included.`,
  } satisfies coda.SimpleStringSchema & coda.ObjectSchemaProperty;
}
// #endregion

// #region Shared Properties

// #endregion

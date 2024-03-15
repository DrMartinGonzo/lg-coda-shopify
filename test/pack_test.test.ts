import * as coda from '@codahq/packs-sdk';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { pack } from '../pack';

import { MockExecutionContext, executeSyncFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { newJsonFetchResponse } from '@codahq/packs-sdk/dist/development';
import { newMockExecutionContext } from '@codahq/packs-sdk/dist/development';

import { expect, test, describe } from 'vitest';
import { expectedRows } from './expectedRows';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: 'https://coda-pack-test.myshopify.com',
// });

describe('Product', () => {
  test('Fetch', async () => {
    const expected = expectedRows.product;
    const result = await executeFormulaFromPackDef(pack, 'Product', [expected.id], undefined, undefined, {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    });

    expect(result.AdminUrl).toBe(expected.admin_url);
    expect(result.BodyHtml).toBe(expected.body_html);
    expect(result.CreatedAt).toBe(expected.created_at);
    expect(result.FeaturedImage).toBe(expected.featuredImage);
    expect(result.GraphqlGid).toBe(expected.admin_graphql_api_id);
    expect(result.Handle).toBe(expected.handle);
    expect(result.Id).toBe(expected.id);
    expect(result.Images).toStrictEqual(expected.images);
    expect(result.Options).toBe(expected.options);
    expect(result.ProductType).toBe(expected.product_type);
    expect(result.PublishedAt).toBe(expected.published_at);
    expect(result.PublishedScope).toBe(expected.published_scope);
    expect(result.Status).toBe(expected.status);
    expect(result.StoreUrl).toBe(expected.storeUrl);
    expect(result.Tags).toBe(expected.tags);
    expect(result.TemplateSuffix).toBe(expected.template_suffix);
    expect(result.Title).toBe(expected.title);
    expect(result.Vendor).toBe(expected.vendor);
    // no need
    // expect(result.UpdatedAt).toBe('2024-03-14T08:44:38-04:00');
  });

  test('Sync with Metafields', async () => {
    const expected = [expectedRows.product];
    const result = await executeSyncFormulaFromPackDef(
      pack,
      'Products',
      [
        undefined, // productType
        true, // syncMetafields
        undefined, // createdAtRange
        undefined, // updatedAtRange
        undefined, // publishedAtRange
        undefined, // statusArray
        undefined, // publishedStatus
        undefined, // vendor
        undefined, // handleArray
        [expected[0].id], // idArray
      ],
      undefined,
      undefined,
      {
        useRealFetcher: true,
        manifestPath: require.resolve('../pack.ts'),
      }
    );

    expect(result[0].admin_url).toBe(expected[0].admin_url);
    expect(result[0].body_html).toBe(expected[0].body_html);
    expect(result[0].created_at).toBe(expected[0].created_at);
    expect(result[0].featuredImage).toBe(expected[0].featuredImage);
    expect(result[0].admin_graphql_api_id).toBe(expected[0].admin_graphql_api_id);
    expect(result[0].handle).toBe(expected[0].handle);
    expect(result[0].id).toBe(expected[0].id);
    expect(result[0].images).toStrictEqual(expected[0].images);
    expect(result[0].options).toBe(expected[0].options);
    expect(result[0].product_type).toBe(expected[0].product_type);
    expect(result[0].published_at).toBe(expected[0].published_at);
    expect(result[0].published_scope).toBe(expected[0].published_scope);
    expect(result[0].status).toBe(expected[0].status);
    expect(result[0].storeUrl).toBe(expected[0].storeUrl);
    expect(result[0].tags).toBe(expected[0].tags);
    expect(result[0].template_suffix).toBe(expected[0].template_suffix);
    expect(result[0].title).toBe(expected[0].title);
    expect(result[0].vendor).toBe(expected[0].vendor);

    expect(result[0]['lgs_meta__custom.boolean']).toBe(expected[0]['lgs_meta__custom.boolean']);
    expect(result[0]['lgs_meta__custom.date_time']).toBe(expected[0]['lgs_meta__custom.date_time']);
    expect(result[0]['lgs_meta__global.description_tag']).toBe(expected[0]['lgs_meta__global.description_tag']);
    expect(result[0]['lgs_meta__global.title_tag']).toBe(expected[0]['lgs_meta__global.title_tag']);
    // no need
    // expect(result.UpdatedAt).toBe('2024-03-14T08:44:38-04:00');
  });
});

describe('Customer', () => {
  test('Fetch', async () => {
    const expected = expectedRows.customer;
    const result = await executeFormulaFromPackDef(pack, 'Customer', [expected.id], undefined, undefined, {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    });

    // TODO: write a generic function for this
    const defaultAddress = {};
    Object.keys(expected.default_address).forEach((key) => {
      const normalizedKey = normalizeSchemaKey(key);
      defaultAddress[normalizedKey] = expected.default_address[key];
    });

    const addresses = [];
    expected.addresses.forEach((address) => {
      const normalizedAddress = {};
      Object.keys(address).forEach((key) => {
        const normalizedKey = normalizeSchemaKey(key);
        normalizedAddress[normalizedKey] = address[key];
      });
      addresses.push(normalizedAddress);
    });

    expect(result.AcceptsEmailMarketing).toBe(expected.accepts_email_marketing);
    expect(result.AcceptsSmsMarketing).toBe(expected.accepts_sms_marketing);
    expect(result.Addresses).toStrictEqual(addresses);
    expect(result.AdminUrl).toBe(expected.admin_url);
    expect(result.CreatedAt).toBe(expected.created_at);
    expect(result.DefaultAddress).toEqual(defaultAddress);
    expect(result.Display).toBe(expected.display);
    expect(result.Email).toBe(expected.email);
    expect(result.FirstName).toBe(expected.first_name);
    expect(result.GraphqlGid).toBe(expected.admin_graphql_api_id);
    expect(result.Id).toBe(expected.id);
    expect(result.LastName).toBe(expected.last_name);
    expect(result.LastOrderId).toBe(expected.last_order_id);
    expect(result.LastOrderName).toBe(expected.last_order_name);
    expect(result.MultipassIdentifier).toBe(expected.multipass_identifier);
    expect(result.Note).toBe(expected.note);
    expect(result.OrdersCount).toBe(expected.orders_count);
    expect(result.Phone).toBe(expected.phone);
    expect(result.State).toBe(expected.state);
    expect(result.Tags).toBe(expected.tags);
    expect(result.Tags).toBe(expected.tags);
    expect(result.TaxExempt).toBe(expected.tax_exempt);
    expect(result.TaxExemptions).toStrictEqual(expected.tax_exemptions);
    expect(result.TotalSpent).toBe(expected.total_spent);
    expect(result.VerifiedEmail).toBe(expected.verified_email);
    // expect(result.UpdatedAt).toBe(expected.updated_at);
  });

  // TODO
  test.todo('Sync');
});

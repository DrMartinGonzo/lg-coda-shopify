import * as coda from '@codahq/packs-sdk';
import { pack } from '../pack';

import { MockExecutionContext } from '@codahq/packs-sdk/dist/development';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { newJsonFetchResponse } from '@codahq/packs-sdk/dist/development';
import { newMockExecutionContext } from '@codahq/packs-sdk/dist/development';

import { expect, test, describe } from 'vitest';
import { Product } from '../types/Resources/Product';
import { normalizeSchemaKey } from '@codahq/packs-sdk/dist/schema';
import { Customer } from '../types/Resources/Customer';

// let context: MockExecutionContext;
// context = newMockExecutionContext({
//   endpoint: 'https://coda-pack-test.myshopify.com',
// });

describe('Product', () => {
  test('Fetch', async () => {
    const productId = 8406091333888;
    const result = await executeFormulaFromPackDef(pack, 'Product', [productId], undefined, undefined, {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    });

    const expected: Product.Row = {
      admin_graphql_api_id: `gid://shopify/Product/${productId}`,
      admin_url: `https://coda-pack-test.myshopify.com/admin/products/${productId}`,
      body_html:
        'The adidas BP Classic Cap features a pre-curved brim to keep your face shaded, while a hook-and-loop adjustable closure provides a comfortable fit. With a 3-Stripes design and reflective accents. The perfect piece to top off any outfit.',
      created_at: '2024-02-20T13:22:14-05:00' as unknown as Date,
      featuredImage:
        'https://cdn.shopify.com/s/files/1/0690/5400/5504/products/8072c8b5718306d4be25aac21836ce16.jpg?v=1708453334',
      handle: 'vitest-product',
      id: productId,
      images: [
        'https://cdn.shopify.com/s/files/1/0690/5400/5504/products/8072c8b5718306d4be25aac21836ce16.jpg?v=1708453334',
        'https://cdn.shopify.com/s/files/1/0690/5400/5504/products/32b3863554f4686d825d9da18a24cfc6.jpg?v=1709216059',
        'https://cdn.shopify.com/s/files/1/0690/5400/5504/products/044f848776141f1024eae6c610a28d12.jpg?v=1708453334',
      ],
      options: 'Size, Color',
      product_type: 'ACCESSORIES',
      published_at: '2024-03-14T08:44:36-04:00' as unknown as Date,
      published_scope: 'global',
      status: 'active',
      storeUrl: `https://coda-pack-test.myshopify.com/products/vitest-product`,
      tags: 'adidas, backpack, egnition-sample-data',
      template_suffix: null,
      title: 'Vitest Product',
      updatedAt: '2024-03-14T08:44:38-04:00',
      vendor: 'ADIDAS',
      // updated_at
    };

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
    expect(result.Title).toBe('Vitest Product');
    expect(result.Vendor).toBe('ADIDAS');
    // no need
    // expect(result.UpdatedAt).toBe('2024-03-14T08:44:38-04:00');
  });

  // TODO
  test.todo('Sync');
});

describe('Customer', () => {
  test('Fetch', async () => {
    const customerId = 7199674794240;
    const result = await executeFormulaFromPackDef(pack, 'Customer', [customerId], undefined, undefined, {
      useRealFetcher: true,
      manifestPath: require.resolve('../pack.ts'),
    });

    const expected: Customer.Row = {
      accepts_email_marketing: false,
      accepts_sms_marketing: false,
      addresses: [
        {
          address1: 'Ap #147-5705 Nonummy Street',
          address2: null,
          city: 'Maubeuge',
          company: null,
          country_code: 'ER',
          country_name: 'Eritrea',
          country: 'Eritrea',
          default: true,
          display: 'Edward Hahn, Ap #147-5705 Nonummy Street, Maubeuge, Eritrea',
          first_name: 'Edward',
          id: 8711929757952,
          last_name: 'Hahn',
          name: 'Edward Hahn',
          phone: '+2911122150',
          province_code: null,
          province: null,
          zip: '7759',
        },
      ],
      admin_graphql_api_id: `gid://shopify/Customer/${customerId}`,
      admin_url: 'https://coda-pack-test.myshopify.com/admin/customers/7199674794240',
      created_at: '2024-02-20T13:23:32-05:00' as unknown as Date,
      default_address: {
        address1: 'Ap #147-5705 Nonummy Street',
        address2: null,
        city: 'Maubeuge',
        company: null,
        country_code: 'ER',
        country_name: 'Eritrea',
        country: 'Eritrea',
        default: true,
        display: 'Edward Hahn, Ap #147-5705 Nonummy Street, Maubeuge, Eritrea',
        first_name: 'Edward',
        id: 8711929757952,
        last_name: 'Hahn',
        name: 'Edward Hahn',
        phone: '+2911122150',
        province_code: null,
        province: null,
        zip: '7759',
      },
      display: 'Vitest Customer',
      email: 'egnition_sample_29@egnition.com',
      first_name: 'Vitest',
      id: customerId,
      last_name: 'Customer',
      last_order_id: null,
      last_order_name: null,
      multipass_identifier: null,
      note: null,
      orders_count: 0,
      phone: '+2911126279',
      state: 'disabled',
      tags: 'egnition-sample-data, referral',
      tax_exempt: false,
      tax_exemptions: [],
      total_spent: 0,
      verified_email: true,
      // updated_at
    };

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

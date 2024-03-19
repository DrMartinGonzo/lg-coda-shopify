import * as coda from '@codahq/packs-sdk';
import striptags from 'striptags';
import { SimpleRest } from '../../Fetchers/SimpleRest';
import { DEFAULT_PRODUCT_OPTION_NAME, OPTIONS_PRODUCT_STATUS_REST, OPTIONS_PUBLISHED_STATUS } from '../../constants';
import type { CodaMetafieldKeyValueSet } from '../../helpers-setup';
import { formatMetafieldRestInputFromKeyValueSet } from '../metafields/metafields-functions';
import { Product, productResource } from './productResource';

export class ProductRestFetcher extends SimpleRest<Product> {
  constructor(context: coda.ExecutionContext) {
    super(productResource, context);
  }

  validateParams = (
    params:
      | Product['rest']['params']['sync']
      | Product['rest']['params']['create']
      | Product['rest']['params']['update']
  ) => {
    if (params.status) {
      const validStatuses = OPTIONS_PRODUCT_STATUS_REST.map((status) => status.value);
      (Array.isArray(params.status) ? params.status : [params.status]).forEach((status) => {
        if (!validStatuses.includes(status)) throw new coda.UserVisibleError('Unknown product status: ' + status);
      });
    }
    if ('title' in params && params.title === '') {
      throw new coda.UserVisibleError("Product title can't be blank");
    }
    if ('published_status' in params) {
      const validPublishedStatuses = OPTIONS_PUBLISHED_STATUS.map((status) => status.value);
      (Array.isArray(params.published_status) ? params.published_status : [params.published_status]).forEach(
        (published_status) => {
          if (!validPublishedStatuses.includes(published_status))
            throw new coda.UserVisibleError('Unknown published_status: ' + published_status);
        }
      );
    }
    return true;
  };

  formatRowToApi = (
    row: Partial<Product['codaRow']>,
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Product['rest']['params']['update'] | Product['rest']['params']['create'] | undefined => {
    let restParams: Product['rest']['params']['update'] | Product['rest']['params']['create'] = {};
    let restCreateParams: Product['rest']['params']['create'] = {};

    if (row.body_html !== undefined) restParams.body_html = row.body_html;
    if (row.handle !== undefined) restParams.handle = row.handle;
    if (row.product_type !== undefined) restParams.product_type = row.product_type;
    if (row.tags !== undefined) restParams.tags = row.tags;
    if (row.template_suffix !== undefined) restParams.template_suffix = row.template_suffix;
    if (row.title !== undefined) restParams.title = row.title;
    if (row.vendor !== undefined) restParams.vendor = row.vendor;
    if (row.status !== undefined) restParams.status = row.status;

    // Create only paramters
    const metafieldRestInputs = metafieldKeyValueSets.length
      ? metafieldKeyValueSets.map(formatMetafieldRestInputFromKeyValueSet).filter(Boolean)
      : [];
    if (metafieldRestInputs.length) {
      restCreateParams.metafields = metafieldRestInputs;
    }
    if (row.options !== undefined) {
      restCreateParams.options = row.options
        .split(',')
        .map((str) => str.trim())
        .map((option) => ({ name: option, values: [DEFAULT_PRODUCT_OPTION_NAME] }));

      // We need to add a default variant to the product if some options are defined
      if (restCreateParams.options.length) {
        restCreateParams.variants = [
          {
            option1: DEFAULT_PRODUCT_OPTION_NAME,
            option2: DEFAULT_PRODUCT_OPTION_NAME,
            option3: DEFAULT_PRODUCT_OPTION_NAME,
          },
        ];
      }
    }
    if (row.images !== undefined) {
      restCreateParams.images = row.images.map((url) => ({ src: url }));
    }

    const mergedParams = { ...restParams, ...restCreateParams };

    // Means we have nothing to update/create
    if (Object.keys(mergedParams).length === 0) return undefined;
    return mergedParams;
  };

  formatApiToRow = (product): Product['codaRow'] => {
    let obj: Product['codaRow'] = {
      ...product,
      admin_url: `${this.context.endpoint}/admin/products/${product.id}`,
      body: striptags(product.body_html),
      status: product.status,
      storeUrl: product.status === 'active' ? `${this.context.endpoint}/products/${product.handle}` : '',
    };

    if (product.options && Array.isArray(product.options)) {
      obj.options = product.options.map((option) => option.name).join(', ');
    }
    if (product.images && Array.isArray(product.images)) {
      obj.featuredImage = product.images.find((image) => image.position === 1)?.src;
      obj.images = product.images.map((image) => image.src);
    }

    return obj;
  };

  updateWithMetafields = async (
    row: { original?: Product['codaRow']; updated: Product['codaRow'] },
    metafieldKeyValueSets: CodaMetafieldKeyValueSet[] = []
  ): Promise<Product['codaRow']> => this._updateWithMetafieldsGraphQl(row, metafieldKeyValueSets);
}

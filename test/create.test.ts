// #region Imports

import * as coda from '@codahq/packs-sdk';
import { executeFormulaFromPackDef } from '@codahq/packs-sdk/dist/development';
import { pack } from '../pack';

import { describe, expect, test } from 'vitest';
import { Action_CreateArticle } from '../coda/setup/articles-setup';
import { Action_CreateBlog } from '../coda/setup/blogs-setup';
import { Action_CreateCollection } from '../coda/setup/collections-setup';
import { Action_CreatePage } from '../coda/setup/pages-setup';
import { METAFIELD_TYPES } from '../constants/metafields-constants';
import { PACK_TEST_ENDPOINT } from '../constants/pack-constants';
import { getMetaFieldFullKey } from '../models/utils/metafields-utils';
import { MetafieldOwnerType } from '../types/admin.types';
import { formatOptionNameId } from '../utils/helpers';
import * as singleData from './__snapshots__/api/single';
import {
  defaultIntegrationContextOptions,
  defaultIntegrationUpdateExecuteOptions,
  deleteRestResource,
  formatMetafieldInput,
  formatMetafieldSingleLineTextInput,
} from './utils/test-utils';

// #endregion

type CreateArticleParams = coda.ParamValues<(typeof Action_CreateArticle)['parameters']>;
type CreateCollectionParams = coda.ParamValues<(typeof Action_CreateCollection)['parameters']>;
type CreatePageParams = coda.ParamValues<(typeof Action_CreatePage)['parameters']>;
type CreateBlogParams = coda.ParamValues<(typeof Action_CreateBlog)['parameters']>;

describe('INTEGRATION: Create, Fetch and Delete Actions', () => {
  test('Article', async () => {
    const author = 'author';
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const summaryHtml = '<p>summaryHtml</p>';
    const tagsArray = ['test', 'create', 'fetch', 'delete'];
    const title = 'a title';

    const newArticleId = await executeFormulaFromPackDef(
      pack,
      'CreateArticle',
      [
        formatOptionNameId(singleData.blog.title, singleData.blog.id), // blog
        title,
        author,
        bodyHtml,
        summaryHtml,
        handle,
        undefined, // imageUrl
        undefined, // imageAlt
        published,
        undefined, // publishedAt
        tagsArray, // tagsArray
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateArticleParams,
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Article',
      [newArticleId],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    expect.soft(fetchResult.admin_url).toEqual(`${PACK_TEST_ENDPOINT}/admin/articles/${newArticleId}`);
    expect.soft(fetchResult.admin_graphql_api_id).toEqual(`gid://shopify/OnlineStoreArticle/${newArticleId}`);
    expect.soft(fetchResult.body_html).toEqual(bodyHtml);
    expect.soft(fetchResult.title).toEqual(title);
    expect.soft(fetchResult.author).toEqual(author);
    expect.soft(fetchResult.handle).toEqual(handle);
    expect.soft(fetchResult.published).toEqual(published);
    expect.soft(fetchResult.summary_html).toEqual(summaryHtml);
    expect.soft(fetchResult.tags).toEqual(tagsArray.sort().join(', '));

    const deleteResult = await deleteRestResource('DeleteArticle', newArticleId);
    expect(deleteResult).toEqual(true);
  });

  test('Blog', async () => {
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const title = 'a title';

    const newBlogId = await executeFormulaFromPackDef(
      pack,
      'CreateBlog',
      [
        title,
        handle,
        undefined, // commentable
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateBlogParams,
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Blog',
      [newBlogId],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    console.log('fetchResult', fetchResult);
    expect.soft(fetchResult.admin_url).toEqual(`${PACK_TEST_ENDPOINT}/admin/blogs/${newBlogId}`);
    expect.soft(fetchResult.admin_graphql_api_id).toEqual(`gid://shopify/OnlineStoreBlog/${newBlogId}`);
    expect.soft(fetchResult.handle).toEqual(handle);
    expect.soft(fetchResult.tags).toEqual(null);
    expect.soft(fetchResult.template_suffix).toEqual(null);
    expect.soft(fetchResult.title).toEqual(title);

    const deleteResult = await deleteRestResource('DeleteBlog', newBlogId);
    expect(deleteResult).toEqual(true);
  });

  test('Collection', async () => {
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const title = 'a title';
    const templateSuffix = null;

    const newCollectionId = await executeFormulaFromPackDef(
      pack,
      'CreateCollection',
      [
        title,
        bodyHtml,
        handle,
        undefined, // imageUrl
        undefined, // imageAlt
        published,
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreateCollectionParams,
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Collection',
      [newCollectionId],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    expect.soft(fetchResult.body_html).toEqual(bodyHtml);
    expect.soft(fetchResult.title).toEqual(title);
    expect.soft(fetchResult.handle).toEqual(handle);
    expect.soft(fetchResult.published).toEqual(published);
    expect.soft(fetchResult.template_suffix).toEqual(templateSuffix);
    expect.soft(fetchResult.published_scope).toEqual('web');
    expect.soft(fetchResult.admin_url).toEqual(`${PACK_TEST_ENDPOINT}/admin/collections/${newCollectionId}`);

    const deleteResult = await deleteRestResource('DeleteCollection', newCollectionId);
    expect(deleteResult).toEqual(true);
  });

  test('Page', async () => {
    const author = 'author';
    const bodyHtml = '<p>bodyHtml</p>';
    const handle = 'create-fetch-delete-test';
    const metafieldInput = await formatMetafieldInput(
      'global.title_tag',
      await formatMetafieldSingleLineTextInput('pouet !')
    );
    const published = true;
    const title = 'a title';

    const newPageId = await executeFormulaFromPackDef(
      pack,
      'CreatePage',
      [
        title,
        author,
        bodyHtml,
        handle,
        published,
        undefined, // publishedAt
        undefined, // templateSuffix
        [metafieldInput], // metafields
      ] as CreatePageParams,
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    const fetchResult = await executeFormulaFromPackDef(
      pack,
      'Page',
      [newPageId],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );

    expect.soft(fetchResult.admin_url).toEqual(`${PACK_TEST_ENDPOINT}/admin/pages/${newPageId}`);
    expect.soft(fetchResult.admin_graphql_api_id).toEqual(`gid://shopify/OnlineStorePage/${newPageId}`);
    expect.soft(fetchResult.body_html).toEqual(bodyHtml);
    expect.soft(fetchResult.title).toEqual(title);
    expect.soft(fetchResult.author).toEqual(author);
    expect.soft(fetchResult.handle).toEqual(handle);
    expect.soft(fetchResult.published).toEqual(published);
    expect.soft(fetchResult.template_suffix).toEqual(null);
    expect.soft(fetchResult.shop_url).toEqual(`${PACK_TEST_ENDPOINT}/pages/${handle}`);

    const deleteResult = await deleteRestResource('DeletePage', newPageId);
    expect(deleteResult).toEqual(true);
  });

  test('Shop Metafield', async () => {
    const namespace = 'custom';
    const key = 'test_metafield';

    const result = await executeFormulaFromPackDef(
      pack,
      'SetMetafield',
      [
        MetafieldOwnerType.Shop, // ownerType
        await formatMetafieldInput(
          getMetaFieldFullKey({ namespace, key }),
          await formatMetafieldSingleLineTextInput('pouet !')
        ), // metafieldValue
        // 589145866496, // ownerID
      ],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );
    expect.soft(result.label).toEqual(getMetaFieldFullKey({ namespace, key }));
    expect.soft(result.namespace).toEqual(namespace);
    expect.soft(result.key).toEqual(key);
    expect.soft(result.type).toEqual(METAFIELD_TYPES.single_line_text_field);
    expect.soft(result.rawValue).toEqual('pouet !');
    expect.soft(result.owner_type).toEqual(MetafieldOwnerType.Shop);

    const removeResult = await executeFormulaFromPackDef(
      pack,
      'SetMetafield',
      [
        MetafieldOwnerType.Shop, // ownerType
        await formatMetafieldInput(
          getMetaFieldFullKey({ namespace, key }),
          await formatMetafieldSingleLineTextInput('')
        ), // metafieldValue
        // 589145866496, // ownerID
      ],
      undefined,
      defaultIntegrationUpdateExecuteOptions,
      defaultIntegrationContextOptions
    );
    expect.soft(removeResult.rawValue).toEqual(null);
  });
});

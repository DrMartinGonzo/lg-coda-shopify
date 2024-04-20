// #region Imports
import * as coda from '@codahq/packs-sdk';

import { Body } from '@shopify/shopify-api/rest/types';
import { Identity } from '../../constants';
import { isDefinedEmpty } from '../../utils/helpers';

// #endregion

// #region Types
export interface GetSchemaArgs {
  context: coda.ExecutionContext;
  codaSyncParams?: coda.ParamValues<coda.ParamDefs>;
  normalized?: boolean;
}

export interface FindAllResponseBase<T> {
  data: T[];
  headers: coda.FetchResponse['headers'];
  pageInfo?: any;
}
// #endregion

export abstract class AbstractResource {
  public static readonly displayName: Identity;
  public apiData: any;

  protected static readonly primaryKey: string = 'id';
  protected static readonly readOnlyAttributes: string[] = [];

  protected context: coda.ExecutionContext;

  protected static createInstance<T extends AbstractResource = AbstractResource>(
    context: coda.ExecutionContext,
    data: Body,
    prevInstance?: T
  ): T {
    const instance: T = prevInstance ? prevInstance : new (this as any)({ context });

    if (data) {
      instance.setData(data);
    }

    return instance;
  }

  /**
   * Soit la valeur est undefined et elle ne sera pas présente dans apiData,
   * donc dans les updates, soit elle a une valeur mais considérée comme "vide"
   * est on la force en `null`
   * @param data Les données à nettoyer
   */
  protected static removeUndefinedData(data: any) {
    for (let key in data) {
      if (data[key] === undefined) {
        delete data[key];
        /**
         * Apparemment Coda renvoit une string et pas un nombre lors d'une update, du coup cetaines valeurs peuvent être égales à '' !
         * Dans ce cas on les force comme null
         */
        // TODO: isDefinedEmpty n'est pas adapté ici quand c'est une array… Par exemple, refunds dans Order doit rester à '[]'. Pour l'instant on n'applique pas aux arrays
      } else if (!Array.isArray(data[key]) && isDefinedEmpty(data[key])) {
        data[key] = null;
      } else if (typeof data[key] === 'object') {
        this.removeUndefinedData(data[key]);
      }
    }
    return data;
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor({ context, fromData }: { context: coda.ExecutionContext; fromData?: Body | null }) {
    this.context = context;

    if (fromData) {
      this.setData(fromData);
    }
  }

  protected setData(data: Body): void {
    this.apiData = this.resource().removeUndefinedData(data);
  }

  /**
   * Returns the current class's constructor as a type BaseT, which defaults to the class itself.
   * This allows accessing the constructor type of the current class.
   */
  protected resource<BaseT extends typeof AbstractResource = typeof AbstractResource>(): BaseT {
    return this.constructor as BaseT;
  }
}

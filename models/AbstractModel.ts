// #region Imports
import * as coda from '@codahq/packs-sdk';
import deepmerge from 'deepmerge';

import { Identity } from '../constants/pack-constants';
import { MUST_EXTEND, NOT_IMPLEMENTED } from '../constants/strings-constants';
import { BaseRow } from '../schemas/CodaRows.types';
import { isDefinedEmpty } from '../utils/helpers';

// #endregion

// #region Types
interface AbstractModelConstructorArgs {
  context: coda.ExecutionContext;
  fromData?: any | null;
}

export interface BaseModelData {}

export interface ModelWithDeletedFlag {
  /** un flag special pour savoir si un metafield a deja été supprimé, utile
   * dans le cas du'une sync table de metafields, où l'on peut supprimer un
   * metafield mais où celui-ci reste visible jusqu'a la prochaine synchronisation.
   * Ça va nous servir à formatter le label avec [deleted] à la fin */
  isDeletedFlag: boolean;
}
// #endregion

export abstract class AbstractModel {
  public data: any;
  protected readonly primaryKey: string;
  protected context: coda.ExecutionContext;
  public static readonly displayName: Identity;

  // protected static readonly readOnlyAttributes: string[] = [];

  public static createInstance<T>(this: new (...args: any[]) => T, context: coda.ExecutionContext, fromData: any) {
    return new this({ context, fromData });
  }

  public static createInstanceFromRow(context: coda.ExecutionContext, row: BaseRow): InstanceType<typeof this> {
    throw new Error(MUST_EXTEND);
  }

  /**====================================================================================================================
   *    Instance Methods
   *===================================================================================================================== */
  constructor({ context, fromData }: AbstractModelConstructorArgs) {
    this.context = context;
    this.primaryKey = 'id';

    if (fromData) this.setData(fromData);
  }

  /**
   * Returns the current class's constructor.
   * This allows accessing the constructor type of the current class.
   */
  public asStatic<T extends typeof AbstractModel = typeof AbstractModel>(): T {
    return this.constructor as T;
  }

  // #region data methods
  protected setData(data: any): void {
    const cleanData = this.cleanRawData(data);
    this.validateData(data);
    this.data = cleanData;
  }

  /**
   * On récupère les données sans les instances qu'elles peuvent contenir
   */
  protected getApiData<T>(): T {
    function process(prop: any) {
      if (prop instanceof AbstractModel) {
        return prop.getApiData();
      }
      if (Array.isArray(prop)) {
        return prop.map(process);
      }
      return prop;
    }

    const ret = {};
    for (let key in this.data) {
      const prop = this.data[key];
      ret[key] = process(prop);
    }
    return ret as T;
  }

  /**
   * Nettoyage des donnée brutes.
   *
   * Soit la valeur est undefined et elle ne sera pas présente dans apiData,
   * donc dans les updates, soit elle a une valeur mais considérée comme "vide"
   * est on la force en `null`
   */
  protected cleanRawData(data: any): any {
    // Ce sont surtout les instances de Metafields qui sont concernées par ça pour l'instant
    if (data instanceof AbstractModel) return data;

    if (typeof data !== 'object') {
      if (isDefinedEmpty(data)) {
        return null;
      } else {
        return data;
      }
    } else {
      const ret = {};
      for (let key in data) {
        if (data[key] !== undefined) {
          if (Array.isArray(data[key])) {
            ret[key] = data[key].map((d) => this.cleanRawData(d));
          } else if (typeof data[key] === 'object' && data[key] !== null) {
            const cleanedObject = this.cleanRawData(data[key]);
            if (Object.keys(cleanedObject).length) {
              ret[key] = cleanedObject;
            }
          }
          //
          /**
           * Apparemment Coda renvoie une string et pas un nombre lors d'une update,
           * du coup certaines valeurs peuvent être égales à ''. Dans ce cas on les force comme null
           */
          else if (isDefinedEmpty(data[key])) {
            ret[key] = null;
          } else {
            ret[key] = data[key];
          }
        }
      }
      return ret;
    }
  }

  protected validateData(data: any) {}

  protected static combineMerge(target: any[], source: any[], options: deepmerge.ArrayMergeOptions) {
    const destination = target.slice();

    source.forEach((item, index) => {
      /**
       * AbstractResource instances always replace possibly existing instances
       */
      if (item instanceof AbstractModel) {
        destination.push(item);
      } else {
        if (typeof destination[index] === 'undefined') {
          destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
        } else if (options.isMergeableObject(item)) {
          destination[index] = deepmerge(target[index], item, options);
        } else if (target.indexOf(item) === -1) {
          destination.push(item);
        }
      }
    });
    return destination;
  }

  /**
   * Refresh data of the instance. New data takes precedence
   */
  public async refreshData(): Promise<void> {
    const updatedData = await this.getFullFreshData();
    if (updatedData) {
      this.setData(this.mergeFreshData(updatedData));
    }
  }
  /**
   * Refresh data of the instance. Existing data takes precedence
   */
  public async addMissingData(): Promise<void> {
    const updatedData = await this.getFullFreshData();
    if (updatedData) {
      this.setData(this.mergeMissingData(updatedData));
    }
  }

  /**
   * Merge updated data with existing data, updated data takes precedence
   */
  private mergeFreshData<T extends AbstractModel['data']>(freshData: T) {
    return deepmerge<T, T>(this.data, freshData ?? {}, {
      arrayMerge: AbstractModel.combineMerge,
    });
  }
  /**
   * Merge updated data with existing data, existing data takes precedence
   */
  private mergeMissingData<T extends AbstractModel['data']>(missingData: T) {
    return deepmerge<T, T>(missingData ?? {}, this.data, {
      arrayMerge: AbstractModel.combineMerge,
    });
  }

  /**
   * Return the latest data for the current instance. Should be implemented by subclasses
   */
  protected async getFullFreshData(): Promise<any | undefined> {
    throw new Error(MUST_EXTEND);
  }
  // #endregion

  public abstract save(): Promise<void>;

  public abstract toCodaRow(...args: any[]): BaseRow;
}

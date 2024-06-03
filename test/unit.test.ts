// #region Imports

import { newMockExecutionContext } from '@codahq/packs-sdk/dist/development';
import { expect, test } from 'vitest';
import { RequiredSyncTableMissingVisibleError } from '../Errors/Errors';
import { VariantGraphQl } from '../Resources/GraphQl/VariantGraphQl';

// #endregion

/**
 * On trigger une mise à jour de variant sur weight et option2,
 * mais il manque weight_unit et option1
 */
test('Update missing data on row update', async () => {
  const context = newMockExecutionContext();
  const missingWeightUnit = 'KILOGRAMS';
  const initialOption1 = 'option1';
  const initialOption2 = 'option2';
  const updatedOption2 = 'option2 NEW';

  const prevRow = {
    id: 44810810786048,
    weight: 222,
    option2: initialOption2,
  };
  const newRow = {
    id: 44810810786048,
    weight: 9,
    option2: updatedOption2,
  };

  // @ts-expect-error
  const instance: VariantGraphQl = await VariantGraphQl.createInstanceForUpdate(prevRow, newRow, context);
  console.log('instance', instance);

  try {
    // @ts-expect-error
    VariantGraphQl.validateUpdateJob(prevRow, newRow);
  } catch (error) {
    if (error instanceof RequiredSyncTableMissingVisibleError) {
      /** Simulate augmenting with fresh data and check again if it passes validation */
      // @ts-expect-error
      instance.setData(
        // @ts-expect-error
        instance.mergeMissingData({
          selectedOptions: [
            {
              value: initialOption1,
            },
            { value: initialOption2 },
          ],
          inventoryItem: {
            measurement: {
              weight: {
                unit: missingWeightUnit,
              },
            },
          },
        } as VariantGraphQl['apiData'])
      );

      // @ts-expect-error
      VariantGraphQl.validateUpdateJob(prevRow, instance.formatToRow());

      expect(instance.apiData.inventoryItem.measurement.weight.unit, 'Should have updated weight unit').toBe(
        missingWeightUnit
      );
      expect(instance.apiData.selectedOptions[0].value, 'Should have updated option1').toBe('option1');
      expect(instance.apiData.selectedOptions[1].value, 'Should have kept option2 from newRow').toBe('option2 NEW');
    } else {
      throw error;
    }
  }
});

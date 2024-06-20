// #region Imports

import * as coda from '@codahq/packs-sdk';
import { MetafieldMeasurementType } from '../../constants/metafields-constants';
import { LengthUnit, WeightUnit } from '../../types/admin.types';

// #endregion
export const weightUnitsToLabelMap: {
  [key in WeightUnit]: string;
} = {
  GRAMS: 'g',
  KILOGRAMS: 'kg',
  OUNCES: 'oz',
  POUNDS: 'lb',
};
export const dimensionUnitsToLabelMap: {
  [key in LengthUnit]: string;
} = {
  CENTIMETERS: 'cm',
  FEET: 'pi',
  INCHES: 'po',
  METERS: 'm',
  MILLIMETERS: 'mm',
  YARDS: 'yd',
};
export const volumeUnitsToLabelMap = {
  MILLILITERS: 'ml',
  CENTILITERS: 'cl',
  LITERS: 'l',
  CUBIC_METERS: 'm³',
  FLUID_OUNCES: 'oz liq.',
  PINTS: 'pt',
  QUARTS: 'qt',
  GALLONS: 'gal',
  IMPERIAL_FLUID_OUNCES: 'oz liq. imp.',
  IMPERIAL_PINTS: 'pt imp.',
  IMPERIAL_QUARTS: 'qt imp.',
  IMPERIAL_GALLONS: 'gal imp.',
};
export function getUnitToLabelMapByMeasurementType(measurementType: MetafieldMeasurementType) {
  switch (measurementType) {
    case 'weight':
      return weightUnitsToLabelMap;
    case 'dimension':
      return dimensionUnitsToLabelMap;
    case 'volume':
      return volumeUnitsToLabelMap;
    default:
      throw new coda.UserVisibleError(`Invalid measurement type: ${measurementType}`);
  }
}

export function measurementUnitToLabel(unit: string) {
  const allUnitsMap = { ...weightUnitsToLabelMap, ...dimensionUnitsToLabelMap, ...volumeUnitsToLabelMap };
  if (unit in allUnitsMap) return allUnitsMap[unit];
  console.error(`Unknown unit: ${unit}`);
  return '';
}

export function extractValueAndUnitFromMeasurementString(
  measurementString: string,
  measurementType: MetafieldMeasurementType
): {
  value: number;
  unit: WeightUnit | LengthUnit | string;
  label: string;
} {
  const unitsMap = getUnitToLabelMapByMeasurementType(measurementType);
  const possibleUnits = Object.values(unitsMap);
  const measurementRegex = /^(\d+(\.\d+)?)\s*([a-zA-Z²³µ]*)$/;

  const match = measurementString.match(measurementRegex);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[3];

    if (possibleUnits.includes(unit)) {
      const label = Object.keys(unitsMap)[possibleUnits.indexOf(unit)];
      return { value, unit, label };
    } else {
      throw new coda.UserVisibleError(`Invalid unit: ${unit}`);
    }
  } else {
    throw new coda.UserVisibleError(`Invalid measurement string: ${measurementString}`);
  }
}

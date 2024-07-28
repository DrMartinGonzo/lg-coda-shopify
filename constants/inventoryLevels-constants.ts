// #region Imports

// #endregion

export const DEFAULT_REFERENCE_DOC_URI = 'id://CodaChange';
export const DEFAULT_LEDGER_DOC_URI = DEFAULT_REFERENCE_DOC_URI;

export const POSSIBLE_QUANTITY_NAMES = [
  'available',
  'committed',
  'damaged',
  'incoming',
  'on_hand',
  'quality_control',
  'reserved',
  'safety_stock',
];

export const POSSIBLE_MOVE_REASONS = [
  'correction',
  'cycle_count_available',
  'damaged',
  'movement_created',
  'movement_updated',
  'movement_received',
  'movement_canceled',
  'other',
  'promotion',
  'quality_control',
  'received',
  'reservation_created',
  'reservation_deleted',
  'reservation_updated',
  'restock',
  'safety_stock',
  'shrinkage',
];

export const POSSIBLE_MOVE_QUANTITY_NAMES: QuantityNameType[] = [
  'available',
  'damaged',
  'incoming',
  'quality_control',
  'reserved',
  'safety_stock',
];
export const POSSIBLE_SET_QUANTITY_NAMES: QuantityNameType[] = ['available', 'on_hand'];
export const POSSIBLE_ADJUST_QUANTITY_NAMES: QuantityNameType[] = [
  'available',
  'damaged',
  'quality_control',
  'reserved',
  'safety_stock',
];

export type QuantityNameType = (typeof POSSIBLE_QUANTITY_NAMES)[number];
export type MoveReasonType = (typeof POSSIBLE_MOVE_REASONS)[number];

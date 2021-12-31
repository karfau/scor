export type ToValue<T> = (item: T) => number;

/**
 * All possible options for `scor`.
 * @see scor
 */
export interface AllOptions<T> {
  /**
   * Lower bound of the range.
   */
  min: number;
  /**
   * Upper bound of the range.
   */
  max: number;
  /**
   * Method to resolve a numeric value from an item.
   */
  toValue: ToValue<T>;
  /**
   * The weight of the score when it is used to create a total score
   * from multiple scores.
   * Scores that do not configure it equally share the same remaining weight.
   * Values are percentages in the range from 0 (0%) to 1 (100%),
   * negative values will throw an error.
   */
  weight?: number;
}

/**
 * All options are optional when passed to `scor`,
 * but some functions will throw an `Error` when used before options are defined.
 * @see AllOptions
 * @see scor
 * @see Scor
 */
export type OptionsArg<T> = Readonly<Partial<AllOptions<T>>>;

export const INVALID_RANGE = "Invalid range";
export const MISSING_TO_VALUE = "Missing toValue";

export const forValueNotAllowed = (): never => {
  throw new RangeError(INVALID_RANGE);
};
export const getZero = () => 0;

/**
 * A typeguard that only returns `true` for `number`s excluding `NaN`, `-Infinity` or `Infinity`.
 */
export const isNumeric = (x: number | null | undefined): x is number =>
  typeof x === "number" && -Infinity < x && x < Infinity;

/**
 * API to convert values or items into a score.
 * @see scor
 */
export interface Scor<T> extends Readonly<Partial<AllOptions<T>>> {
  /**
   * Returns the score for `item`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {RangeError} If the range is not set to a numeric value on both sides.
   * @throws {TypeError} If the `toValue` is not configured.
   *
   * @see isNumeric
   */
  forItem(item: T): never | number;
  /**
   * Returns the score for `value`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {RangeError} If the range is not limited on both sides.
   */
  forValue(value: number): never | number;
}

/**
 * Creates a `Scor` that can take a range (min and max values) to calculate a score for a value.
 * A score is always between 0 and 1, even if the provided value is outside the range.
 * @throws {RangeError} When setting either end of the range to a value that is not numeric.
 * @throws {RangeError} When setting the weight to a value that is not numeric or is negative.
 *
 * @see isNumeric
 */
export const scor = <T>(
  { min, max, toValue, weight }: OptionsArg<T> = {},
): never | Scor<T> => {
  if (min !== undefined && !isNumeric(min)) {
    throw new RangeError(`${INVALID_RANGE}: Expected min to be numeric`);
  }
  if (max !== undefined && !isNumeric(max)) {
    throw new RangeError(`${INVALID_RANGE}: Expected max to be numeric`);
  }
  if (weight !== undefined && (!isNumeric(weight) || weight < 0)) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected weight to be numeric and >= 0`,
    );
  }
  const common = { min, max, toValue, weight };
  if (min === undefined || max === undefined) {
    return Object.freeze({
      ...common,
      forItem: forValueNotAllowed,
      forValue: forValueNotAllowed,
    });
  }
  if (min > max) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected min(${min}) < max(${max})`,
    );
  }
  if (min === max) {
    return Object.freeze({
      ...common,
      forItem: getZero,
      forValue: getZero,
    });
  }
  const maxFromZero = max - min;

  const forValue = (value: number) => {
    if (value <= min || !isNumeric(value)) return 0;
    if (value >= max) return 1;
    return (value - min) / maxFromZero;
  };
  return Object.freeze({
    ...common,
    forItem: toValue ? (item: T) => forValue(toValue(item)) : () => {
      throw new TypeError(MISSING_TO_VALUE);
    },
    forValue,
  });
};

/**
 * Determine a range from `items`, by using `toValue` on each item.
 *
 * @param toValue Method to map an item to a numeric value
 * @param items The list of items to map using `toValue`
 *
 * @throws {TypeError} if `toValue` is not a function
 * @throws {RangeError} if there are no numeric values
 * @throws {unknown} whatever `toValue` throws
 *
 * @see isNumeric
 */
export const getItemRange = <T>(
  toValue: ToValue<T>,
  items: T[],
): [min: number, max: number] => {
  const values = items.map(toValue).filter(isNumeric);
  if (values.length === 0) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected at least one numeric value.`,
    );
  }
  return [Math.min(...values), Math.max(...values)];
};

/**
 * Creates a `Scor` with the range that is currently present in `items`
 * (by using `getItemRange`).
 * @param toValue will be passed to `getItemRange` and `scor`
 * @param items the data to analyse to determine the range
 *
 * @see getItemRange
 * @see scor;
 */
export const scorForItems = <T>(toValue: ToValue<T>, items: T[]): Scor<T> => {
  const [min, max] = getItemRange(toValue, items);
  return scor({ min, max, toValue });
};

/**
 * Creates a `Scor` with an updated `min`.
 * @throws {RangeError} If `min` is not numeric.
 * @see isNumeric
 */
export const setMin = <T>({ max, toValue, weight }: Scor<T>, min: number) =>
  scor({ min, max, toValue, weight });

/**
 * Creates a `Scor` with an updated `max`.
 * @throws {RangeError} If `max` is not numeric.
 * @see isNumeric
 */
export const setMax = <T>({ min, toValue, weight }: Scor<T>, max: number) =>
  scor({ min, max, toValue, weight });

/**
 * Creates a `Scor` with an updated range.
 * @throws {RangeError} If one of the arguments is not numeric.
 * @see isNumeric
 */
export const setRange = <T>(
  { toValue, weight }: Scor<T>,
  min: number,
  max: number,
) => scor({ min, max, toValue, weight });

/**
 * Creates a `Scor` with an updated `toValue`.
 */
export const setToValue = <T>(
  { min, max, weight }: Scor<T>,
  toValue: ToValue<T>,
) => scor({ min, max, toValue, weight });

/**
 * Creates a `Scor` with an updated `weight`.
 * @throws {RangeError} If `weight` is not numeric or negative.
 *         `undefined` is allowed to restore equal distribution.
 *
 * @see isNumeric
 * @see AllOptions.weight
 */
export const setWeight = <T>(
  { min, max, toValue }: Scor<T>,
  weight: number | undefined,
) => scor({ min, max, toValue, weight });

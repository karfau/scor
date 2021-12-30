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
   * Method to resolve the numeric value from an item.
   */
  toValue: ToValue<T>;
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
 * API to convert values or items into a score.
 * @see scor
 */
export interface Scor<T> extends Readonly<Partial<AllOptions<T>>> {
  /**
   * Returns the score for `item`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {RangeError} If the range is not limited on both sides.
   * @throws {Error} If the `toValue` is not configured.
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
 * Creates a `Scor` with an updated `min`.
 * @throws If `min` is `NaN`.
 */
export const setMin = <T>({ max, toValue }: Scor<T>, min: number) =>
  scor({ min, max, toValue });

/**
 * Creates a `Scor` with an updated `max`.
 * @throws If `max` is `NaN`.
 */
export const setMax = <T>({ min, toValue }: Scor<T>, max: number) =>
  scor({ min, max, toValue });

/**
 * Creates a `Scor` with an updated range.
 * @throws If one of the arguments is `NaN`.
 */
export const setRange = <T>({ toValue }: Scor<T>, min: number, max: number) =>
  scor({ min, max, toValue });

/**
 * Determine a range from `items`, by using `toValue` on each item.
 *
 * @param toValue Method to map an item to a value
 * @param items The list of items to map using `toValue`
 *
 * @throws {TypeError} if `toValue` is not a function
 * @throws {RangeError} if there are no values or only `NaN`(/`undefined`/`null`)
 * @throws {unknown} whatever `toValue` throws
 */
export const getItemRange = <T>(toValue: ToValue<T>, items: T[]) => {
  const values = items.map(toValue).filter((n) => n !== null && !isNaN(n));
  if (values.length === 0) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected at least one numeric value.`,
    );
  }
  return [Math.min(...values), Math.max(...values)];
};

/**
 * Creates a `Scor` with an updated `toValue`.
 */
export const setToValue = <T>({ min, max }: Scor<T>, toValue: ToValue<T>) =>
  scor({ min, max, toValue });

/**
 * Creates a `Scor` that can take a range (min and max values) to calculate a score for a value.
 * A score is always between 0 and 1, even if the provided value is outside the range.
 * Trying to set either end of the range to `NaN` with throw an error.
 */
export const scor = <T>(
  { min, max, toValue }: OptionsArg<T> = {},
): never | Scor<T> => {
  if (min !== undefined && isNaN(min)) {
    throw new RangeError(`${INVALID_RANGE}: Expected min to not be NaN`);
  }
  if (max !== undefined && isNaN(max)) {
    throw new RangeError(`${INVALID_RANGE}: Expected max to not be NaN`);
  }
  const common = { min, max, toValue };
  if (min === undefined || max === undefined) {
    return Object.freeze({
      ...common,
      forItem: forValueNotAllowed,
      forValue: forValueNotAllowed,
      setMin,
      setMax,
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
      setMin,
      setMax,
    });
  }
  const maxFromZero = max - min;

  const forValue = (value: number) => {
    if (value <= min || isNaN(value)) return 0;
    if (value >= max) return 1;
    return (value - min) / maxFromZero;
  };
  return Object.freeze({
    ...common,
    forItem: toValue ? (item: T) => forValue(toValue(item)) : () => {
      throw new TypeError(MISSING_TO_VALUE);
    },
    forValue,
    setMin,
    setMax,
  });
};

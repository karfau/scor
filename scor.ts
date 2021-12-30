export type GetValue<T> = (item: T) => number;

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
  toValue: GetValue<T>;
}

/**
 * All options are optional when passed to `scor`,
 * but some functions will throw an `Error` when used before options are defined.
 * @see AllOptions
 * @see scor
 * @see Scor
 */
export type OptionsArg<T> = Readonly<Partial<AllOptions<T>>>;

export const INVALID_RANGE = "invalid range";

const forValueNotAllowed = (): never => {
  throw new Error(INVALID_RANGE);
};

/**
 * API to convert values or items into a score.
 * @see scor
 */
export interface Scor<T> extends Readonly<Partial<AllOptions<T>>> {
  /**
   * Returns the score for `item`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {Error} If the range is not limited on both sides.
   * @throws {Error} If the `toValue` is not configured.
   */
  readonly forItem: (item: T) => never | number;
  /**
   * Returns the score for `value`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {Error} If the range is not limited on both sides.
   */
  readonly forValue: (value: number) => never | number;
}

/**
 * Create a Scor that can take a range (min and max values) to calculate a score for a value.
 * A score is always between 0 and 1, even if the provided value is outside the range.
 * Trying to set either end of the range to `NaN` with throw an error.
 */
export const scor = <T>(
  { min, max, toValue }: OptionsArg<T> = {},
): never | Scor<T> => {
  if (min !== undefined && isNaN(min)) throw new Error(INVALID_RANGE);
  if (max !== undefined && isNaN(max)) throw new Error(INVALID_RANGE);
  const explicit = { min, max, toValue };
  if (min === undefined || max === undefined) {
    return {
      ...explicit,
      forItem: forValueNotAllowed,
      forValue: forValueNotAllowed,
    };
  }
  if (min > max) throw new Error(INVALID_RANGE);
  if (min === max) {
    return {
      ...explicit,
      forItem: () => 0,
      forValue: () => 0,
    };
  }
  const maxFromZero = max - min;

  const forValue = (value: number) => {
    if (value <= min || isNaN(value)) return 0;
    if (value >= max) return 1;
    return (value - min) / maxFromZero;
  };
  return {
    ...explicit,
    forItem: toValue ? (item: T) => forValue(toValue(item)) : () => {
      throw new Error("missing toValue");
    },
    forValue,
  };
};

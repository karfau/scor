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
  forItem(item: T): never | number;
  /**
   * Returns the score for `value`.
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {Error} If the range is not limited on both sides.
   */
  forValue(value: number): never | number;
}

/**
 * Create a Scor with an updated `min`.
 * @throws If `min` is `NaN`.
 */
export const setMin = <T>({ max, toValue }: Scor<T>, min: number) =>
  scor({ min, max, toValue });

/**
 * Create a Scor with an updated `max`.
 * @throws If `max` is `NaN`.
 */
export const setMax = <T>({ min, toValue }: Scor<T>, max: number) =>
  scor({ min, max, toValue });

/**
 * Create a Scor with an updated range.
 * @throws If one of the arguments is `NaN`.
 */
export const setRange = <T>({ toValue }: Scor<T>, min: number, max: number) =>
  scor({
    min,
    max,
    toValue,
  });

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
  if (min > max) throw new Error(INVALID_RANGE);
  if (min === max) {
    return Object.freeze({
      ...common,
      forItem: () => 0,
      forValue: () => 0,
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
      throw new Error("missing toValue");
    },
    forValue,
    setMin,
    setMax,
  });
};

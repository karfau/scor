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
 * A typeguard that only returns `true` for `number`s excluding `NaN`, `-Infinity` and `Infinity`.
 */
export const isNumeric = (x: number | null | undefined): x is number =>
  typeof x === "number" && -Infinity < x && x < Infinity;

/**
 * API to convert values or items into a score.
 * @see scor
 */
export interface Scor<T> extends Readonly<Partial<AllOptions<T>>> {
  /**
   * Returns the numeric score for `item`,
   * which is always between >= 0 and &lt;= 1 .
   * If the range has no length (`min == max`) the value is always 0.
   *
   * @throws {RangeError} If the range is not set to a numeric value on both sides.
   * @throws {TypeError} If `toValue` is not configured.
   *
   * @see isNumeric
   */
  forItem(item: T): never | number;
  /**
   * Returns the numeric score for `value`,
   * which is always between >= 0 and &lt;= 1 .
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
  { min, max, toValue }: OptionsArg<T> = {},
): never | Scor<T> => {
  if (min !== undefined && !isNumeric(min)) {
    throw new RangeError(`${INVALID_RANGE}: Expected min to be numeric`);
  }
  if (max !== undefined && !isNumeric(max)) {
    throw new RangeError(`${INVALID_RANGE}: Expected max to be numeric`);
  }
  const common = { min, max, toValue };
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
export const setMin = <T>({ max, toValue }: Scor<T>, min: number) =>
  scor({ min, max, toValue });

/**
 * Creates a `Scor` with an updated `max`.
 * @throws {RangeError} If `max` is not numeric.
 * @see isNumeric
 */
export const setMax = <T>({ min, toValue }: Scor<T>, max: number) =>
  scor({ min, max, toValue });

/**
 * Creates a `Scor` with an updated range.
 * @throws {RangeError} If one of the arguments is not numeric.
 * @see isNumeric
 */
export const setRange = <T>(
  { toValue }: Scor<T>,
  min: number,
  max: number,
) => scor({ min, max, toValue });

/**
 * Creates a `Scor` with an updated `toValue`.
 */
export const setToValue = <T>(
  { min, max }: Scor<T>,
  toValue: ToValue<T>,
) => scor({ min, max, toValue });

/**
 * A reducer to sum all numeric values of a list.
 *
 * @param sum The value calculated so far
 * @param value The value to add
 *
 * @throws {RangeError} if `sum` is not numeric
 *
 * @see isNumeric
 */
export const toNumericSum = (sum: number, value: number | null | undefined) => {
  if (!isNumeric(sum)) {
    throw new RangeError(
      `${INVALID_RANGE}: expected sum to be numeric, but was ${sum}.`,
    );
  }
  if (!isNumeric(value)) return sum;
  return sum + value;
};

export type Weight = number;
export type OptionalWeight = Weight | undefined;

/**
 * Maps a list of weights, so that all are set to a numeric value:
 * - so that all undefined weights share the same weight
 * - if the sum of all weights doesn't add up to 1,
 *   it is distributed to all undefined ones
 *
 * @throws {RangeError} If `weight` defined but not `>= 0` and `< -Infinity`.
 */
export function distributeWeights(
  scores: OptionalWeight[],
): Weight[];
/**
 * Maps a dict of weights, so that all are set to a numeric value:
 * - so that all undefined weights share the same weight
 * - if the sum of all weights doesn't add up to 1,
 *   it is distributed to all undefined ones
 *
 * @throws {RangeError} If `weight` defined but not `>= 0` and `< -Infinity`.
 */
export function distributeWeights<K extends string = string>(
  weights: Record<K, OptionalWeight>,
): Record<K, Weight>;
/**
 * Maps multiple weights (list or dict) so that all are set to a numeric value:
 * - so that all undefined weights share the same weight
 * - if the sum of all weights doesn't add up to 1,
 *   it is distributed to all undefined ones
 *
 * @returns {Weight[] | Record<K, Weight>} `Weight[]` or `Record<K, Weight>`
 *          depending on the type of `weights`
 *
 * @throws {RangeError} If `weight` defined but not `>= 0` and `< -Infinity`.
 */
export function distributeWeights<K extends string = string>(
  weightListOrDict: OptionalWeight[] | Record<K, OptionalWeight>,
) {
  const weights = Object.values(weightListOrDict);
  if (weights.some((w) => w !== undefined && (!isNumeric(w) || w < 0))) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected all (defined) weights to be numeric and >= 0`,
    );
  }

  const withoutWeight = weights.length - weights.filter(isNumeric).length;
  if (!withoutWeight) return weightListOrDict;
  const remaining = 1 - weights.reduce(toNumericSum, 0);
  const toNumericWeight = (weight: OptionalWeight) =>
    isNumeric(weight) ? weight : remaining > 0 ? remaining / withoutWeight : 0;
  return Array.isArray(weightListOrDict)
    ? weightListOrDict.map(toNumericWeight)
    : Object.fromEntries(
      (Object.entries(weightListOrDict) as [K, number][]).map(([key, s]) => [
        key,
        toNumericWeight(s),
      ]),
    );
}

/**
 * Creates a function that calculates the total arithmetic mean for an item,
 * so it can be used as an argument for `Array.map`, `sortBy` ...
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 *
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 */
export function createToMean<T>(scores: Scor<T>[]): never | ToValue<T>;
/**
 * Creates a function that calculates the total arithmetic mean for an item,
 * so it can be used as an argument for `Array.map`, `sortBy` ...
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 *
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 */
export function createToMean<T>(
  scores: Record<string, Scor<T>>,
): never | ToValue<T>;
/**
 * Creates a function that calculates the total arithmetic mean for an item,
 * so it can be used as an argument for `Array.map`, `sortBy` ...
 *
 * The input can either be an `Array<Scor>` or a `Record<string, Scor>.
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 *
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 */
export function createToMean<T>(
  listOrRecord: Scor<T>[] | Record<string, Scor<T>>,
): never | ToValue<T> {
  const scores = Array.isArray(listOrRecord)
    ? listOrRecord
    : Object.values(listOrRecord);
  if (scores.length === 0) {
    throw new TypeError("Expected at least one element.");
  }
  if (
    scores.findIndex((s) =>
      s.toValue === undefined || !isNumeric(s.min) || !isNumeric(s.max)
    ) > -1
  ) {
    throw new TypeError(
      "Expected all scores to have `toValue`, numeric `min` and `max`.",
    );
  }
  if (scores.length === 1) {
    return scores[0].forItem;
  }
  return (item: T) =>
    scores.reduce(
      (sum, score) => sum + score.forItem(item),
      0,
    ) / scores.length;
}

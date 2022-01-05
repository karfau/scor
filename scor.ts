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
 * Reducer to calculate the numeric sum of all defined weights
 * and count all undefined weights.
 *
 * @throws {RangeError} If any weight is defined but not `>= 0` and `< -Infinity`.
 *
 * @private
 */
const sumAndCountWeights = (
  [numericSum, undefinedWeights]: [number, number],
  weight: OptionalWeight,
): [numericSum: number, undefinedWeights: number] => {
  if (weight !== undefined && (!isNumeric(weight) || weight < 0)) {
    throw new RangeError(
      `${INVALID_RANGE}: Expected all (defined) weights to be numeric and >= 0`,
    );
  }
  return isNumeric(weight)
    ? [numericSum + weight, undefinedWeights]
    : [numericSum, undefinedWeights + 1];
};

/**
 * A type guard that checks if all weights are defined
 * and if all values are in the expected range.
 * Throws an error for values in unexpected ranges.
 * Returns `false` if there are `undefined` weights, which need distribution.
 *
 * @throws {TypeError} If weights has a length of 0.
 * @throws {RangeError} If any weight is defined but not `>= 0` and `< -Infinity`.
 * @throws {RangeError} If all weights are defined but the sum is 0.
 *
 * @see distributeWeights
 */
export function assertWeights(
  weights: OptionalWeight[],
): weights is Weight[] {
  if (weights.length === 0) {
    throw new TypeError("Expected at least one weight.");
  }
  const [numericSum, undefinedWeights] = weights.reduce(sumAndCountWeights, [
    0,
    0,
  ]);
  if (undefinedWeights === 0) {
    if (numericSum === 0) {
      throw new RangeError(
        `${INVALID_RANGE}: expected sum to be > 0 when all weights are defined.`,
      );
    }
    return true;
  }
  return false;
}

/**
 * Maps a list of weights, so that all are set to a numeric value:
 * - so that all undefined weights share the same weight
 * - if the sum of all weights doesn't add up to 1,
 *   it is distributed to all undefined ones
 *
 * @throws {RangeError} If any weight is defined but not `>= 0` and `< -Infinity`.
 * @throws {RangeError} If all weights are defined but the sum is 0.
 * @throws {TypeError} If there is no weight (undefined is fine).
 *
 * @see assertWeights
 */
export function distributeWeights(
  weights: OptionalWeight[],
): Weight[];
/**
 * Maps a dict of weights, so that all are set to a numeric value:
 * - so that all undefined weights share the same weight
 * - if the sum of all weights doesn't add up to 1,
 *   it is distributed to all undefined ones
 *
 * @throws {RangeError} If any weight is defined but not `>= 0` and `< -Infinity`.
 * @throws {RangeError} If all weights are defined but the sum is 0.
 * @throws {TypeError} If there is no weight (undefined is fine).
 *
 * @see assertWeights
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
 * @throws {RangeError} If any weight is defined but not `>= 0` and `< -Infinity`.
 * @throws {RangeError} If all weights are defined but the sum is 0.
 * @throws {TypeError} If there is no weight (undefined is fine).
 *
 * @see assertWeights
 */
export function distributeWeights<K extends string = string>(
  weightListOrDict: OptionalWeight[] | Record<K, OptionalWeight>,
) {
  const weights = Object.values(weightListOrDict);
  if (assertWeights(weights)) {
    return weightListOrDict;
  }
  // todo: is there a nice way to reuse the values from inside `assertWeights`?
  const [numericSum, undefinedWeights] = weights.reduce(sumAndCountWeights, [
    0,
    0,
  ]);
  const remaining = 1 - numericSum;
  const perUndefinedWeight = remaining > 0 ? remaining / undefinedWeights : 0;
  const toNumericWeight = (weight: OptionalWeight) =>
    isNumeric(weight) ? weight : perUndefinedWeight;
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
 * When `weights` is provided, the created method returns the weighted arithmetic mean.
 * All `weights` have to be fully defined, to spread remaining weights use `distributeWeights`.
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 * @throws {TypeError} if `weights` is provided but the length doesn't match `scores`
 * @throws {RangeError} if `weights` is provided but not all values are numeric
 * @throws {RangeError} if `weights` is provided but the sum of all weights is 0
 *
 * @see distributeWeights
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 * @see https://en.wikipedia.org/wiki/Weighted_arithmetic_mean
 */
export function createToMean<T>(
  scores: Scor<T>[],
  weights?: Weight[],
): never | ToValue<T>;
/**
 * Creates a function that calculates the total arithmetic mean for an item,
 * so it can be used as an argument for `Array.map`, `sortBy` ...
 *
 * When `weights` is provided, the created method returns the weighted arithmetic mean.
 * All `weights` have to be fully defined, to spread remaining weights use `distributeWeights`.
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 * @throws {TypeError} if `weights` is provided but the length doesn't match `scores`
 * @throws {RangeError} if `weights` is provided but not all values are numeric
 * @throws {RangeError} if `weights` is provided but the sum of all weights is 0
 *
 * @see distributeWeights
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 * @see https://en.wikipedia.org/wiki/Weighted_arithmetic_mean
 */
export function createToMean<T, K extends string>(
  scores: Record<K, Scor<T>>,
  weights?: Record<K, Weight>,
): never | ToValue<T>;
/**
 * Creates a function that calculates the total arithmetic mean for an item,
 * so it can be used as an argument for `Array.map`, `sortBy` ...
 *
 * When `weights` is provided, the created method returns the weighted arithmetic mean.
 * All `weights` have to be fully defined, to spread remaining weights use `distributeWeights`.
 *
 * The first argument can either be an `Array<Scor>` or a `Record<string, Scor>`.
 * The second argument needs to align with the first one.
 *
 * @throws {TypeError} if `scores` has no elements
 * @throws {TypeError} if any element in `scores` has no `toValue`,
 * @throws {TypeError} if any element in `scores` has no numeric `min` or `max`
 * @throws {TypeError} if `weights` is provided but the length doesn't match `scores`
 * @throws {RangeError} if `weights` is provided but not all values are numeric
 * @throws {RangeError} if `weights` is provided but the sum of all weights is 0
 *
 * @see distributeWeights
 * @see https://en.wikipedia.org/wiki/Arithmetic_mean
 * @see https://en.wikipedia.org/wiki/Weighted_arithmetic_mean
 */
export function createToMean<T, K extends string>(
  listOrRecord: Scor<T>[] | Record<K, Scor<T>>,
  weights?: Weight[] | Record<K, Weight>,
): never | ToValue<T> {
  const scores: Scor<T>[] = Array.isArray(listOrRecord)
    ? listOrRecord
    : Object.values(listOrRecord);
  const weightsList: Weight[] = weights
    ? (Array.isArray(weights)
      ? weights
      : Object.keys(listOrRecord).map((key) => {
        if (Object.prototype.hasOwnProperty.call(weights, key) === false) {
          throw new TypeError(
            `Expected same keys scores and weights, but missing key '${key}'.`,
          );
        }
        return weights[key as unknown as K];
      }))
    : [];
  if (scores.length === 0) {
    throw new TypeError("Expected at least one element in scores.");
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

  if (weights) {
    if (weightsList.length !== scores.length) {
      throw new TypeError("Expected scores and weights to have same length.");
    }

    if (!assertWeights(weightsList)) {
      throw new RangeError(`Expected all weights to be numeric.`);
    }
  }
  if (scores.length === 1) {
    return scores[0].forItem;
  }
  const divisor = weights ? weightsList.reduce(toNumericSum, 0) : scores.length;
  const weighted: (value: number, index: number) => number = weights
    ? (value, index) => {
      return value * weightsList[index];
    }
    : (value) => value;
  return (item: T) =>
    scores.reduce(
      (sum, score, i) => sum + weighted(score.forItem(item), i),
      0,
    ) / divisor;
}

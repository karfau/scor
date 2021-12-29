export interface AllOptions {
  min: number;
  max: number;
}
export type OptionsArg = Readonly<Partial<AllOptions>>;

export const INVALID_RANGE = "invalid range";

const forValueNotAllowed = (): never => {
  throw new Error(INVALID_RANGE);
};
export interface Scor {
  readonly explicit: Readonly<Partial<AllOptions>>;
  readonly forValue: (value: number) => never | number;
}

/**
 * Create a Scor that can take a range (min and max values) to calculate a score for a value.
 * A score is always between 0 and 1, even if the provided value is outside the range.
 * Trying to set either end of the range to `NaN` with throw an error.
 * If the range is not limited on both sides calling `forValue` will throw an error.
 * If the range has no length (`min == max`) the value is always 0.
 */
export const scor = ({ min, max }: OptionsArg = {}): never | Scor => {
  if (min !== undefined && isNaN(min)) throw new Error(INVALID_RANGE);
  if (max !== undefined && isNaN(max)) throw new Error(INVALID_RANGE);
  if (min === undefined || max === undefined) {
    return {
      explicit: { min, max },
      forValue: forValueNotAllowed,
    };
  }
  if (min > max) throw new Error(INVALID_RANGE);
  if (min === max) {
    return {
      explicit: { min, max },
      forValue: () => 0,
    };
  }
  const maxFromZero = max - min;

  return {
    explicit: { min, max },
    forValue: (value: number) => {
      if (value <= min || isNaN(value)) return 0;
      if (value >= max) return 1;
      return (value - min) / maxFromZero;
    },
  };
};

import {
  assert,
  assertEquals,
  assertObjectMatch,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.119.0/testing/asserts.ts";
import sinon from "https://cdn.skypack.dev/sinon@v12.0.1?dts";
import {
  AllOptions,
  createToMean,
  distributeWeights,
  getItemRange,
  getZero,
  INVALID_RANGE,
  isNumeric,
  MISSING_TO_VALUE,
  Scor,
  scor,
  scorForItems,
  setMax,
  setMin,
  setRange,
  setToValue,
  setWeight,
  toNumericSum,
  ToValue,
} from "./scor.ts";
import test = Deno.test;

const NOT_NUMERIC_NULL = [NaN, null, -Infinity, Infinity];
const NOT_NUMERIC_NULL_UNDEF = [...NOT_NUMERIC_NULL, undefined];

const assertReadonlyProperties = <Item>(
  score: Scor<Item>,
  toValue: (item: Item) => number,
  min?: number,
  max?: number,
  weight?: number,
) => {
  // the following makes sure the fields are readonly
  // removing the comments would make the test fail
  // (some IDEs still mark the lines containing the assignment red)
  assertThrows(() => {
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'toValue' because it is a read-only
    // property.
    return score.toValue = getZero;
  }, TypeError);
  assertStrictEquals(score.toValue, toValue);
  assertThrows(() => {
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'min' because it is a read-only property.
    score.min++;
  }, TypeError);
  assertStrictEquals(score.min, min);
  assertThrows(() => {
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'max' because it is a read-only property.
    score.max++;
  }, TypeError);
  assertStrictEquals(score.max, max);
  assertThrows(() => {
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'max' because it is a read-only property.
    score.weight++;
  }, TypeError);
  assertStrictEquals(score.weight, weight);
};
test("scor stores all explicit options", async (t) => {
  type Item = { p: number };
  const toValue: ToValue<Item> = (item) => item.p;
  const MIN = 1;
  const MAX = 5;
  const WEIGHT = 0.5;
  const options: AllOptions<Item> = {
    min: MIN,
    max: MAX,
    toValue,
    weight: WEIGHT,
  };
  const score = scor(options);
  assertObjectMatch(
    score,
    options as unknown as Record<string, unknown>,
  );
  await t.step("modifying the options doesn't modify the Scor", () => {
    options.min--;
    assertStrictEquals(score.min, MIN);

    options.min++;
    assertStrictEquals(score.max, MAX);

    options.toValue = getZero;
    assertStrictEquals(score.toValue, toValue);

    options.weight!++;
    assertStrictEquals(score.weight, WEIGHT);
  });
  await t.step("modifying the the Scor throws", () => {
    assertReadonlyProperties(score, toValue, MIN, MAX, WEIGHT);
  });
});

test("not setting `min` or `max` option", async (t) => {
  await t.step("when both are not set `forValue` throws", () => {
    const score = scor({}); // not providing a range upfront is valid
    assertThrows(() => score.forValue(0), RangeError, INVALID_RANGE); // but it doesn't allow
    // `forValue`
  });
  await t.step("stores `toValue`", () => {
    const toValue = (item: unknown[]) => item.length;
    const score = scor({ toValue });
    assertStrictEquals(score.toValue, toValue);
    assertReadonlyProperties(score, toValue);
  });
  await t.step("when both are not set `forValue` throws", () => {
    const score = scor({ min: 7 }); // only providing `min` is valid
    assertThrows(() => score.forValue(0), RangeError, INVALID_RANGE); // but it doesn't allow
    // `forValue`
  });
  await t.step("when both are not set `forValue` throws", () => {
    const score = scor({ max: 7 }); // only providing `max` is valid
    assertThrows(() => score.forValue(0), RangeError, INVALID_RANGE); // but it doesn't allow
    // `forValue`
  });
});

test("not setting `toValue`", async (t) => {
  await t.step("with an empty range `forItem` returns 0", () => {
    const score = scor({ min: 0, max: 0 }); // not providing `toValue` upfront is valid
    assertStrictEquals(score.forItem(0), 0); // no need to call toValue, since the score is always 0
  });
  await t.step("with a range `forItem` throws", () => {
    const score = scor({ min: 0, max: 1 }); // not providing `toValue` upfront is valid
    assertThrows(() => score.forItem(0), TypeError, MISSING_TO_VALUE); // but it doesn't allow
    // `forItem`
  });
});

test("min, max options have to be numeric", async (t) => {
  for (const notNumeric of NOT_NUMERIC_NULL) {
    const nn: number = notNumeric as unknown as number;
    await t.step(`${notNumeric}`, () => {
      assertThrows(() => scor({ min: nn }), RangeError, INVALID_RANGE);
      assertThrows(() => scor({ max: nn }), RangeError, INVALID_RANGE);
    });
  }
});

test("setting min > max option fails", () => {
  assertThrows(() => scor({ min: 1, max: 0.999 }), RangeError, INVALID_RANGE);
});

test("setting weight option fails", async (t) => {
  for (const notNumeric of NOT_NUMERIC_NULL) {
    const weight: number = notNumeric as unknown as number;
    await t.step(`for ${notNumeric}`, () => {
      assertThrows(() => scor({ weight }), RangeError, INVALID_RANGE);
    });
  }
  await t.step(`for negative values`, () => {
    assertThrows(() => scor({ weight: -0.1 }), RangeError, INVALID_RANGE);
  });
});

test("setting min == max option", async (t) => {
  await t.step("to 0, `forValue` is always 0", () => {
    assertStrictEquals(scor({ min: 0, max: 0 }).forValue(0), 0);
  });
  await t.step("to positive values, `forValue` is always 0", () => {
    assertStrictEquals(scor({ min: 1, max: 1 }).forValue(1), 0);
  });
  await t.step("to negative values `forValue` is always 0", () => {
    assertStrictEquals(scor({ min: -1, max: -1 }).forValue(-1), 0);
  });
  await t.step("stores `toValue`", () => {
    const toValue = (item: unknown[]) => item.length;
    const score = scor({ min: 0, max: 0, toValue });
    assertStrictEquals(score.toValue, toValue);
    assertReadonlyProperties(score, toValue, 0, 0);
  });
});

test(
  "when the range is between 0 `min` and positive `max`, `forValue` returns the expected value",
  () => {
    const score = scor({ min: 0, max: 100 });
    assertStrictEquals(score.forValue(-1), 0);
    assertStrictEquals(score.forValue(0), 0);
    assertStrictEquals(score.forValue(1), 0.01);
    assertStrictEquals(score.forValue(10), 0.1);
    assertStrictEquals(score.forValue(25), 0.25);
    assertStrictEquals(score.forValue(50), 0.5);
    assertStrictEquals(score.forValue(74.9), 0.7490000000000001);
    assertStrictEquals(score.forValue(99.99), 0.9998999999999999);
    assertStrictEquals(score.forValue(99.999), 0.9999899999999999);
    assertStrictEquals(score.forValue(100), 1);
    assertStrictEquals(score.forValue(101), 1);
    for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
      const nn: number = notNumeric as unknown as number;
      assertStrictEquals(score.forValue(nn), 0);
    }
  },
);

test(
  "when the range is between positive `min` and positive `max`, `forValue` returns the expected value",
  () => {
    const score = scor({ min: 100, max: 200 });
    assertStrictEquals(score.forValue(99), 0);
    assertStrictEquals(score.forValue(100), 0);
    assertStrictEquals(score.forValue(101), 0.01);
    assertStrictEquals(score.forValue(110), 0.1);
    assertStrictEquals(score.forValue(125), 0.25);
    assertStrictEquals(score.forValue(150), 0.5);
    assertStrictEquals(score.forValue(174.9), 0.7490000000000001);
    assertStrictEquals(score.forValue(199.99), 0.9999000000000001);
    assertStrictEquals(score.forValue(199.999), 0.9999899999999999);
    assertStrictEquals(score.forValue(200), 1);
    assertStrictEquals(score.forValue(201), 1);
    for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
      const nn: number = notNumeric as unknown as number;
      assertStrictEquals(score.forValue(nn), 0);
    }
  },
);

test(
  "when the range is between negative `min` and `max` is 0, `forValue` returns the expected value",
  () => {
    const score = scor({ min: -100, max: 0 });
    assertStrictEquals(score.forValue(-101), 0);
    assertStrictEquals(score.forValue(-100), 0);
    assertStrictEquals(score.forValue(-99), 0.01);
    assertStrictEquals(score.forValue(-90), 0.1);
    assertStrictEquals(score.forValue(-75), 0.25);
    assertStrictEquals(score.forValue(-50), 0.5);
    assertStrictEquals(score.forValue(-25.1), 0.7490000000000001);
    assertStrictEquals(score.forValue(-0.01), 0.9998999999999999);
    assertStrictEquals(score.forValue(-0.001), 0.9999899999999999);
    assertStrictEquals(score.forValue(0), 1);
    assertStrictEquals(score.forValue(1), 1);
    for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
      const nn: number = notNumeric as unknown as number;
      assertStrictEquals(score.forValue(nn), 0);
    }
  },
);

test(
  "when the range is between negative `min` and negative `max`, `forValue` returns the expected value",
  () => {
    const score = scor({ min: -200, max: -100 });
    assertStrictEquals(score.forValue(-201), 0);
    assertStrictEquals(score.forValue(-200), 0);
    assertStrictEquals(score.forValue(-199), 0.01);
    assertStrictEquals(score.forValue(-190), 0.1);
    assertStrictEquals(score.forValue(-175), 0.25);
    assertStrictEquals(score.forValue(-150), 0.5);
    assertStrictEquals(score.forValue(-125.1), 0.7490000000000001);
    assertStrictEquals(score.forValue(-100.01), 0.9998999999999999);
    assertStrictEquals(score.forValue(-100.001), 0.9999899999999999);
    assertStrictEquals(score.forValue(-100), 1);
    assertStrictEquals(score.forValue(-99), 1);
    for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
      const nn: number = notNumeric as unknown as number;
      assertStrictEquals(score.forValue(nn), 0);
    }
  },
);

test(
  "when the range is between negative `min` and positive `max`, `forValue` returns the expected value",
  () => {
    const score = scor({ min: -100, max: 100 });
    assertStrictEquals(score.forValue(-101), 0);
    assertStrictEquals(score.forValue(-100), 0);
    assertStrictEquals(score.forValue(-98), 0.01);
    assertStrictEquals(score.forValue(-80), 0.1);
    assertStrictEquals(score.forValue(-50), 0.25);
    assertStrictEquals(score.forValue(0), 0.5);
    assertStrictEquals(score.forValue(49.8), 0.7490000000000001);
    assertStrictEquals(score.forValue(99.8), 0.9990000000000001);
    assertStrictEquals(score.forValue(99.98), 0.9999000000000001);
    assertStrictEquals(score.forValue(100), 1);
    assertStrictEquals(score.forValue(101), 1);
    for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
      const nn: number = notNumeric as unknown as number;
      assertStrictEquals(score.forValue(nn), 0);
    }
  },
);

test("setting `toValue` and a range allows calls to `forItem`", () => {
  const toValue = (item: { p: number }) => item.p;
  const score = scor({ min: 0, max: 100, toValue });
  assertStrictEquals(score.forItem({ p: -1 }), 0);
  assertStrictEquals(score.forItem({ p: 0 }), 0);
  assertStrictEquals(score.forItem({ p: 1 }), 0.01);
  assertStrictEquals(score.forItem({ p: 10 }), 0.1);
  assertStrictEquals(score.forItem({ p: 25 }), 0.25);
  assertStrictEquals(score.forItem({ p: 50 }), 0.5);
  assertStrictEquals(score.forItem({ p: 74.9 }), 0.7490000000000001);
  assertStrictEquals(score.forItem({ p: 99.99 }), 0.9998999999999999);
  assertStrictEquals(score.forItem({ p: 99.999 }), 0.9999899999999999);
  assertStrictEquals(score.forItem({ p: 100 }), 1);
  assertStrictEquals(score.forItem({ p: 101 }), 1);
  for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
    const nn: number = notNumeric as unknown as number;
    assertStrictEquals(score.forValue(nn), 0);
  }
});

test("`setMin` returns `Scor` with updated `min`", () => {
  const first = scor({ min: 0, max: 25, toValue: getZero, weight: 0.1 });

  const second = setMin(first, 5);

  assert(first !== second);
  assertStrictEquals(second.min, 5);
  assertStrictEquals(second.max, 25);
  assertStrictEquals(second.toValue, getZero);
  assertStrictEquals(second.weight, 0.1);
});

test("`setMax` returns `Scor` with updated `min`", () => {
  const first = scor({ min: 0, max: 25, toValue: getZero, weight: 0.2 });

  const second = setMax(first, 5);

  assert(first !== second);
  assertStrictEquals(second.min, 0);
  assertStrictEquals(second.max, 5);
  assertStrictEquals(second.toValue, getZero);
  assertStrictEquals(second.weight, 0.2);
});

test("`setRange` returns `Scor` with updated `min` and `max`", () => {
  const first = scor({ min: 0, max: 25, toValue: getZero, weight: 0.3 });

  const second = setRange(first, 5, 10);

  assert(first !== second);
  assertStrictEquals(second.min, 5);
  assertStrictEquals(second.max, 10);
  assertStrictEquals(second.toValue, getZero);
  assertStrictEquals(second.weight, 0.3);
});

test("`setToValue` returns `Scor` with updated `toValue`", () => {
  const first = scor({ min: 0, max: 25, weight: 0.4 });

  const second = setToValue(first, getZero);

  assert(first !== second);
  assertStrictEquals(second.min, 0);
  assertStrictEquals(second.max, 25);
  assertStrictEquals(second.toValue, getZero);
  assertStrictEquals(second.weight, 0.4);
});

test("`setWeight` ", async (t) => {
  await t.step("returns `Scor` with updated `weight`", () => {
    const first = scor({ min: 17, max: 25, toValue: getZero, weight: 0.9 });

    const second = setWeight(first, 0.6);

    assert(first !== second);
    assertStrictEquals(second.min, 17);
    assertStrictEquals(second.max, 25);
    assertStrictEquals(second.toValue, getZero);
    assertStrictEquals(second.weight, 0.6);
  });
  await t.step("accepts value `undefined`", () => {
    const first = scor({ min: 17, max: 25, toValue: getZero, weight: 0.8 });

    const second = setWeight(first, undefined);

    assertStrictEquals(second.weight, undefined);
  });
});

test("`setWeight` returns `Scor` with updated `weight`", () => {
  const first = scor({ min: 17, max: 25, toValue: getZero, weight: 0.9 });
  const second = setWeight(first, 0.6);
  assert(first !== second);
  assertStrictEquals(second.min, 17);
  assertStrictEquals(second.max, 25);
  assertStrictEquals(second.toValue, getZero);
  assertStrictEquals(second.weight, 0.6);
});

test("`isNumeric`", async (t) => {
  for (const value of NOT_NUMERIC_NULL_UNDEF) {
    await t.step(`returns false for ${value}`, () => {
      assert(isNumeric(value) === false);
    });
  }
  for (const value of [-1, 0, 1]) {
    await t.step(`returns false for ${value}`, () => {
      assert(isNumeric(value) === true);
    });
  }
});

test("`getItemRange`", async (t) => {
  await t.step("throws if `toValue` is undefined", () => {
    const items: unknown[] = [];
    assertThrows(
      () => {
        getItemRange(undefined!, items);
      },
      TypeError,
    );
  });
  await t.step("throws if items is empty", () => {
    const items: unknown[] = [];
    assertThrows(
      () => {
        getItemRange(getZero, items);
      },
      RangeError,
      INVALID_RANGE,
    );
  });
  const asNumber: ToValue<unknown> = (it) => {
    return it as number;
  };
  await t.step("throws if `toValue` doesn't returns any numeric value", () => {
    const items: unknown[] = NOT_NUMERIC_NULL_UNDEF;

    assertThrows(
      () => {
        getItemRange(asNumber, items);
      },
      RangeError,
      INVALID_RANGE,
    );
  });
  await t.step("throws when `toValue` throws", () => {
    const items: unknown[] = [""];
    const CUSTOM_ERROR = "CUSTOM ERROR";
    const throwing = () => {
      throw new Error(CUSTOM_ERROR);
    };
    assertThrows(
      () => {
        getItemRange(throwing, items);
      },
      Error,
      CUSTOM_ERROR,
    );
  });
  const getLength = (item: string) => item.length;
  await t.step("calls `toValue` for each item and returns [min, max]", () => {
    const items = ["a", "bc"];
    const getLengthSpy = sinon.spy(getLength);
    const range = getItemRange(getLengthSpy, items);
    assertEquals(getLengthSpy.callCount, 2);
    assertEquals(range, [1, 2]);
  });
  await t.step("returns [min, max] when there is only one item", () => {
    const items = ["abc"];
    const range = getItemRange(getLength, items);
    assertEquals(range, [3, 3]);
  });
  await t.step("returns correct [min, max] ignoring order of items", () => {
    const items = ["abc", ""];
    const range = getItemRange(getLength, items);
    assertEquals(range, [0, 3]);
  });
  await t.step("returns correct [min, max] for only negative values", () => {
    const items = [-10, -500, -300];
    const range = getItemRange(asNumber, items);
    assertEquals(range, [-500, -10]);
  });
  await t.step(
    "returns correct [min, max] when mixed numeric and not numeric values",
    () => {
      const items = [50, ...NOT_NUMERIC_NULL_UNDEF, 100, 75];
      const range = getItemRange(asNumber, items);
      assertEquals(range, [50, 100]);
    },
  );
});

test("`scorForItems`", () => {
  const items = ["", "123", "very long string :)"];
  const getLength = (item: string) => item.length;
  const getLengthSpy = sinon.spy(getLength);

  const score = scorForItems(getLengthSpy, items);

  assertEquals(getLengthSpy.callCount, items.length);
  assertStrictEquals(score.min, getLength(items[0]));
  assertStrictEquals(score.max, getLength(items[items.length - 1]));
  assertStrictEquals(score.toValue, getLengthSpy);
});

test("`toNumericSum`", async (t) => {
  for (const notNumeric of NOT_NUMERIC_NULL_UNDEF) {
    const nn: number = notNumeric as number;
    await t.step(`throws if the first argument is not numeric (${nn})`, () => {
      assertThrows(() => toNumericSum(nn, 0), RangeError, INVALID_RANGE);
    });
    await t.step(`returns the first argument when the second is ${nn}`, () => {
      assertStrictEquals(toNumericSum(0, nn), 0);
    });
  }
  await t.step(
    "returns the sum of first and second argument if both values are numeric",
    () => {
      assertStrictEquals(toNumericSum(0, 1), 1);
      assertStrictEquals(toNumericSum(2, 3), 5);
      assertStrictEquals(toNumericSum(5, -1), 4);
      assertStrictEquals(toNumericSum(-10, -20), -30);
      assertStrictEquals(toNumericSum(0, -1), -1);
    },
  );
  await t.step("can be used as a reducer", () => {
    assertStrictEquals(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce(toNumericSum, 0),
      45,
    );
  });
});

test("`distributeWeights`", async (t) => {
  const scoreZero = scor({ weight: 0 });
  const scoreQuarter = scor({ weight: 0.25 });
  const scoreHalf = scor({ weight: 0.5 });
  const scoreFull = scor({ weight: 1.0 });
  await t.step("accepts and returns an `Array<Scor<T>>`", async (t) => {
    await t.step(
      "returns the same list and instances if all weights are numeric",
      () => {
        const scores = [scoreQuarter, scoreHalf];

        const actual = distributeWeights(scores);

        assertStrictEquals(actual, scores);
        assertStrictEquals(actual[0], scores[0]);
        assertStrictEquals(actual[1], scores[1]);
      },
    );
    await t.step(
      "returns the same weighted instances if all numeric weights sum up to >= 1",
      () => {
        const scores = [scoreFull, scoreHalf, scor()];

        const actual = distributeWeights(scores);

        assertStrictEquals(actual[0], scores[0]);
        assertStrictEquals(actual[1], scores[1]);
        assertStrictEquals(actual[2].weight, 0);
      },
    );
    await t.step(
      "returns new instance with remaining weight on unweighted",
      () => {
        const scores = [scor(), scoreHalf];

        const [first, second] = distributeWeights(scores);

        assert(first !== scores[0]);
        assertEquals(first.weight, scoreHalf.weight);
        assertStrictEquals(second, scores[1]);
      },
    );
    await t.step(
      "returns new instances with remaining weight evenly distributed on unweighted",
      () => {
        const scores = [scor(), scoreQuarter, scor(), scor()];

        const [first, _, third, fourth] = distributeWeights(scores);

        assertEquals(first.weight, scoreQuarter.weight);
        assertEquals(third.weight, scoreQuarter.weight);
        assertEquals(fourth.weight, scoreQuarter.weight);
      },
    );
    await t.step(
      "returns same instance when weight is 0",
      () => {
        const scores = [scoreZero, scoreQuarter, scor(), scor()];

        const [first, _, third, fourth] = distributeWeights(scores);

        assertEquals(first, scoreZero);
        assertEquals(third.weight, 0.375);
        assertEquals(fourth.weight, 0.375);
      },
    );
  });
  await t.step("accepts and returns a `Record<K, Scor<T>>`", async (t) => {
    await t.step(
      "returns the same list and instances if all weights are numeric",
      () => {
        const scores = { quarter: scoreQuarter, half: scoreHalf };

        const actual = distributeWeights(scores);

        assertStrictEquals(actual, scores);
        assertStrictEquals(actual.quarter, scores.quarter);
        assertStrictEquals(actual.half, scores.half);
      },
    );
    await t.step(
      "returns the same weighted instances if all numeric weights sum up to >= 1",
      () => {
        const scores = { scoreFull, scoreHalf, unspecified: scor() };

        const actual = distributeWeights(scores);

        assertStrictEquals(actual.scoreFull, scores.scoreFull);
        assertStrictEquals(actual.scoreHalf, scores.scoreHalf);
        assertStrictEquals(actual.unspecified.weight, 0);
      },
    );
    await t.step(
      "returns new instance with remaining weight on unweighted",
      () => {
        const scores = { unspecified: scor(), scoreHalf };

        const actual = distributeWeights(scores);

        assert(actual.unspecified !== scores.unspecified);
        assertEquals(actual.unspecified.weight, scoreHalf.weight);
        assertStrictEquals(actual.scoreHalf, scores.scoreHalf);
      },
    );
    await t.step(
      "returns new instances with remaining weight evenly distributed on unweighted",
      () => {
        const scores = {
          first: scor(),
          scoreQuarter,
          third: scor(),
          fourth: scor(),
        };

        const { first, third, fourth } = distributeWeights(scores);

        assertEquals(first.weight, scoreQuarter.weight);
        assertEquals(third.weight, scoreQuarter.weight);
        assertEquals(fourth.weight, scoreQuarter.weight);
      },
    );
    await t.step(
      "returns same instance when weight is 0",
      () => {
        const scores = {
          first: scoreZero,
          scoreQuarter,
          third: scor(),
          fourth: scor(),
        };

        const { first, third, fourth } = distributeWeights(scores);

        assertEquals(first, scoreZero);
        assertEquals(third.weight, 0.375);
        assertEquals(fourth.weight, 0.375);
      },
    );
  });
});

test("`createToMean`", async (t) => {
  await t.step("accepts an `Array<Scor<T>>`", async (t) => {
    await t.step("throws if the list is empty", () => {
      assertThrows(() => createToMean([]), TypeError, "at least one");
    });
    await t.step("throws if at least one element has no `toValue`", () => {
      assertThrows(() => createToMean([scor()]), TypeError, "toValue");
    });
    await t.step("throws if at least one element has no numeric `min`", () => {
      assertThrows(() => createToMean([scor({ max: 5 })]), TypeError, "min");
    });
    await t.step("throws if at least one element has no numeric `max`", () => {
      assertThrows(() => createToMean([scor({ min: 5 })]), TypeError, "max");
    });
    await t.step("returns forItem of the only `Scor`", () => {
      const toValue = () => 1; // implementation not relevant here
      const score = scor({ min: 0, max: 100, toValue });
      assertStrictEquals(createToMean([score]), score.forItem);
    });
    await t.step(
      "returns a method that takes an item and returns the arithmetic mean of all scores",
      () => {
        type Item = [name: string, value: number];

        const min = 0;
        const max = 10;
        const scores = [
          scor({ min, max, toValue: ([name]: Item) => name.length }),
          scor({ min, max, toValue: ([_, value]: Item) => value }),
        ];

        const toMean = createToMean(scores);

        assertStrictEquals(toMean(["", min]), 0);
        assertStrictEquals(toMean(["12345", min]), 0.25);
        assertStrictEquals(toMean(["", max]), 0.5);
        assertStrictEquals(toMean(["123456789", 9]), 0.9);
        assertStrictEquals(toMean(["1234567890", max]), 1);
      },
    );
  });
  await t.step("accepts a `Record<string, Scor<T>>`", async (t) => {
    await t.step("throws if there are no keys", () => {
      assertThrows(() => createToMean({}), TypeError, "at least one");
    });
    await t.step("throws if at least one element has no `toValue`", () => {
      assertThrows(() => createToMean({ s: scor() }), TypeError, "toValue");
    });
    await t.step("throws if at least one element has no numeric `min`", () => {
      assertThrows(
        () => createToMean({ s: scor({ max: 5, toValue: getZero }) }),
        TypeError,
        "min",
      );
    });
    await t.step("throws if at least one element has no numeric `max`", () => {
      assertThrows(
        () => createToMean({ s: scor({ min: 5, toValue: getZero }) }),
        TypeError,
        "max",
      );
    });
    await t.step("returns forItem of the only `Scor`", () => {
      const toValue = () => 1; // implementation not relevant here
      const score = scor({ min: 0, max: 100, toValue });
      assertStrictEquals(createToMean({ score }), score.forItem);
    });
    await t.step(
      "returns a method that takes an item and returns the arithmetic mean of all scores",
      () => {
        type Item = [name: string, value: number];

        const min = 0;
        const max = 10;
        const scores = {
          name: scor({ min, max, toValue: ([name]: Item) => name.length }),
          value: scor({ min, max, toValue: ([_, value]: Item) => value }),
        };

        const toMean = createToMean(scores);

        assertStrictEquals(toMean(["", min]), 0);
        assertStrictEquals(toMean(["12345", min]), 0.25);
        assertStrictEquals(toMean(["", max]), 0.5);
        assertStrictEquals(toMean(["123456789", 9]), 0.9);
        assertStrictEquals(toMean(["1234567890", max]), 1);
      },
    );
  });
});

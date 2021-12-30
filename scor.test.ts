import {
  assertObjectMatch,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.119.0/testing/asserts.ts";
import { AllOptions, GetValue, INVALID_RANGE, scor } from "./scor.ts";

Deno.test({
  name: "scor stores all explicit options",
  fn: () => {
    type Item = { p: number };
    const toValue: GetValue<Item> = (item) => item.p;
    const options: AllOptions<Item> = { min: 1, max: 5, toValue };
    const score = scor(options);
    assertObjectMatch(
      score,
      options as unknown as Record<string, unknown>,
    );
    options.min--;
    assertStrictEquals(score.min, 1);

    options.min++;
    assertStrictEquals(score.max, 5);

    options.toValue = () => 0;
    assertStrictEquals(score.toValue, toValue);

    // the following makes sure the fields are readonly
    // removing the comments would make the test fail
    // (some IDEs still mark the lines containing the assignment red)
    // This is not sufficient for JS runtime, since the following lines do actually modify the object.
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'toValue' because it is a read-only property.
    score.toValue = () => 0;
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'min' because it is a read-only property.
    score.min++;
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'max' because it is a read-only property.
    score.max++;
  },
});

Deno.test({
  name: "not setting `min` or `max` option",
  fn: async (t) => {
    await t.step("when both are not set `forValue` throws", () => {
      const score = scor({}); // not providing a range upfront is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow `forValue`
    });
    await t.step("stores `toValue`", () => {
      const toValue = (item: unknown[]) => item.length;
      const score = scor({ toValue });
      assertStrictEquals(score.toValue, toValue);
    });
    await t.step("when both are not set `forValue` throws", () => {
      const score = scor({ min: 7 }); // only providing `min` is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow `forValue`
    });
    await t.step("when both are not set `forValue` throws", () => {
      const score = scor({ max: 7 }); // only providing `max` is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow `forValue`
    });
  },
});

Deno.test({
  name: "not setting `toValue`",
  fn: async (t) => {
    await t.step("with an empty range `forItem` returns 0", () => {
      const score = scor({ min: 0, max: 0 }); // not providing `toValue` upfront is valid
      assertStrictEquals(score.forItem(0), 0); // no need to call toValue, since the score is always 0
    });
    await t.step("with a range `forItem` throws", () => {
      const score = scor({ min: 0, max: 1 }); // not providing `toValue` upfront is valid
      assertThrows(() => score.forItem(0), Error); // but it doesn't allow `forItem`
    });
  },
});

Deno.test({
  name: "min, max options can not be NaN",
  fn: () => {
    assertThrows(() => scor({ min: NaN }), Error, INVALID_RANGE);
    assertThrows(() => scor({ max: NaN }), Error, INVALID_RANGE);
  },
});

Deno.test({
  name: "setting min > max option fails",
  fn: () => {
    assertThrows(() => scor({ min: 1, max: 0.999 }), Error, INVALID_RANGE);
  },
});

Deno.test({
  name: "setting min == max option",
  fn: async (t) => {
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
    });
  },
});

Deno.test({
  name:
    "when the range is between 0 `min` and positive `max`, `forValue` returns the expected value",
  fn: () => {
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
    assertStrictEquals(score.forValue(NaN), 0);
  },
});

Deno.test({
  name:
    "when the range is between positive `min` and positive `max`, `forValue` returns the expected value",
  fn: () => {
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
    assertStrictEquals(score.forValue(NaN), 0);
  },
});

Deno.test({
  name:
    "when the range is between negative `min` and `max` is 0, `forValue` returns the expected value",
  fn: () => {
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
    assertStrictEquals(score.forValue(NaN), 0);
  },
});

Deno.test({
  name:
    "when the range is between negative `min` and negative `max`, `forValue` returns the expected value",
  fn: () => {
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
    assertStrictEquals(score.forValue(NaN), 0);
  },
});

Deno.test({
  name:
    "when the range is between negative `min` and positive `max`, `forValue` returns the expected value",
  fn: () => {
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
    assertStrictEquals(score.forValue(NaN), 0);
  },
});

Deno.test({
  name: "setting `getValue` and a range allows calls to `forItem`",
  fn: () => {
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
    assertStrictEquals(score.forItem({ p: NaN }), 0);
  },
});

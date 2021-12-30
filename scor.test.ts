import {
  assertObjectMatch,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.119.0/testing/asserts.ts";
import { AllOptions, INVALID_RANGE, scor } from "./scor.ts";

Deno.test({
  name: "scor stores all explicit options",
  fn: () => {
    type Item = { p: number };
    const getValue: GetValue<Item> = (item) => item.p;
    const options: AllOptions<Item> = { getValue, min: 1, max: 5 };
    const score = scor(options);
    assertObjectMatch(
      score.explicit,
      options as unknown as Record<string, unknown>,
    );
    options.min--;
    assertStrictEquals(score.explicit.min, 1);

    options.min++;
    assertStrictEquals(score.explicit.max, 5);

    // the following makes sure the fields are readonly
    // removing the comments would make the test fail
    // (some IDEs still mark the lines containing the assignment red)
    // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'explicit' because it is a read-only property.
    score.explicit = {};
    score.explicit
      // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'min' because it is a read-only property.
      .min++;
    score.explicit
      // @ts-expect-error: TS2540 [ERROR]: Cannot assign to 'max' because it is a read-only property.
      .max++;
  },
});

Deno.test({
  name: "not setting min or max value",
  fn: async (t) => {
    await t.step("when both are not set `.forValue` throws", () => {
      const score = scor({}); // not providing a range upfront is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow .forValue
    });
    await t.step("when both are not set `.forValue` throws", () => {
      const score = scor({ min: 7 }); // only providing min is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow .forValue
    });
    await t.step("when both are not set `.forValue` throws", () => {
      const score = scor({ max: 7 }); // only providing max is valid
      assertThrows(() => score.forValue(0), Error, INVALID_RANGE); // but it doesn't allow .forValue
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
  name: "setting min == max option `.forValue` is always 0",
  fn: () => {
    assertStrictEquals(scor({ min: 0, max: 0 }).forValue(0), 0);
    assertStrictEquals(scor({ min: 1, max: 1 }).forValue(1), 0);
    assertStrictEquals(scor({ min: -1, max: -1 }).forValue(-1), 0);
  },
});

Deno.test({
  name: "setting min, max options allows calls to `.forValue`",
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
  name: "setting min, max options both above 0",
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
  name: "setting min, max options works with negative values",
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
  name: "setting negative min, positive max options works",
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

[![latest version of scor package on deno.land](https://img.shields.io/github/v/tag/karfau/scor?label=deno.land/x/scor&sort=semver)](https://deno.land/x/scor)

# scor

Calculate scores for numeric values or items, and get the "total score" (aka
[arithmetic mean](https://en.wikipedia.org/wiki/Arithmetic_mean) or
[weighted arithmetic mean](https://en.wikipedia.org/wiki/Weighted_arithmetic_mean))
from multiple scores.

## Usage

Imagine you

- have a long list of items to work on, and you want to prioritize them
- want to show the most relevant items to a user before showing more

For example, let's look at npm packages. Possible criteria are:

- number of maintainers
- number of dependencies (direct/transient)
- time since last published version
- version (major < 1?) / dist-tags
- weekly downloads
- source code repo attributes (e.g. GitHub stars/forks)
- quality?
- ...?

The different relevant values come in very different "shapes". Once all the data
is gathered per package, depending on the use case the different values are more
or less relevant.

```ts
import {
  createToMean,
  distributeWeights,
  scorForItems,
} from "https://deno.land/x/scor/scor.ts";
import { getPackagesData } from "./npm.ts";

const packages = await getPackagesData();

const scors = { // scorForItems uses `toValue` (1st parameter) to determine `min` and `max`
  downloads: scorForItems(
    // toValue converts an item to a numeric value, in this case with a log10 scale
    (p) => Math.log10(p.downloads),
    packages,
  ),
  maintainers: scorForItems((p) => p.maintainers.length, packages),
};

// one way to calculate indivudual scores for each item
const scores = packages.map((p) => ({
  name: p.name,
  downloadScore: scors.downloads.forItem(p),
  maintainerScore: scors.maintainers.forItem(p),
}));
// the result could look like this (1 means highest score, 0 lowest score):
// => [{downloads: 0.786, maintainers:0.2}, {downloads: 0.89, maintainers: 1}, {downloads:1, maintainers: 0}, ...]

// or calculate the arithmetic mean per item
const scorePerItem = packages.map(createToMean(scors));
// => [0.493, 0.945, 0.5]

// or the weighted arithmetic mean
const weightedScorePerItem = packages.map(createToMean(
  scors,
  { downloads: 0.75, maintainers: 0.25 },
));
// => [0.31975, 0.45875, 0.375]

// or as a list wihtout keys
const scorsList = [
  scorForItems(
    (p) => Math.log10(p.downloads),
    packages,
  ),
  scorForItems((p) => p.maintainers.length, packages),
];

const weightedScorePerItemL = packages.map(
  createToMean(scorsList, [0.75, 0.25]),
);
// => [0.31975, 0.45875, 0.375] (of course the sam as above)

// if you have many weights and some should be distributed:
distributeWeights(
  [0.5, undefined, undefined],
); // => [0.5, 0.25, 0.25]

distributeWeights(
  { first: 0.7, second: undefined, third: undefined },
); // => {first: 0.7, second: 0.15, third: 0.15}
```

## Concept and vision

I experienced that such a "rating system", or "weighted average score", is not
so easy to get completely right from scratch alongside collecting the data. It
also involves a lot of repetitive code that easily leaks into the rest of the
code.

`scor` simplifies this by making certain assumptions:

- All values are within a certain **range** (`min <= value <= max`).
  - only numeric values are accepted, everything else throws
- To use the (different) values as a **score** and easily compare all of them,
  they need to be converted into the same `range`: between `0`(`value <= min`)
  and `1` (`value >= max`)
  - If the range is "empty" (`min === max`), the score is always 0
  - values that are "not numeric" (see `isNumeric`) result in a score of 0 (to
    avoid `NaN`)
- The user fully controls the conversion of `item` to `value` (`toValue`):
  - get deeply nested fields
  - calculate from multiple fields
  - convert data to a numeric value
  - need the highest value to be the lowest score: `-1 * value`
  - need some custom scale (e.g. logarithmic): `Math.log10(value)`
  - ...
- The user fully controls `min` and `max` values, but they can be derived from
  `items` (also using `toValue`, see `getItemRange`).
- All options for `scor` are optional and can be configured as a second step
- Fail as early as possible (by throwing a specific `Error`):
  - using a method that requires an optional value which has not been configured
  - a required value is not numeric (beside cases mentioned above)
- A `Scor` is immutable, "set..." methods create a new instance.
- A `Scor` never keeps references to the items it is scoring.
- Multiple `Scor`s can easily be combined into a single overall weighted score
  per item, e.g. to use it for sorting

## TODOs

Contributions are welcome!

- [post about it and get feedback](https://dev.to/karfau/i-published-my-first-deno-package-4720)
- Add support for weighted sum?
- Add support for more kind of averages?
  - https://en.wikipedia.org/wiki/Average#Summary_of_types
  - https://en.wikipedia.org/wiki/Geometric_mean ?
  - https://en.wikipedia.org/wiki/Harmonic_mean ?
- publish to npm(?)

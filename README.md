# scor

Calculate scores (`0...1`) for numeric values or items, ~~and get the total score (aka "[(weighted) arithmetic mean](https://en.wikipedia.org/wiki/Weighted_arithmetic_mean)") from multiple scores~~.

The above sentence represents the goal of this library. Things that are not
provided yet are struck out.

## Concept and vision

Imagine you

- have a long list of items to work on, and you want to prioritize them
- want to show the most relevant items to a user before showing more

For example, let's look at npm packages. Possible criteria are:

- number of maintainers
- number of dependencies (direct/transient)
- time since last published version
- version (major < 1?) / dist-tags
- weekly downloads
- github stargazers/forks?
- quality?
- ...?

The different relevant values come in very different "shapes". Once all the data
is gathered per package, depending on the use case the different values are more
or less relevant.

I experienced that such a "rating system", or "weighted average score", is not
so easy to get completely right from scratch alongside collecting the data. It
also involves a lot of repetitive code that easily leaks it's abstractions into
the rest of the code.

`scor` simplifies this by making certain assumptions:

- All values are within a certain **range** (`min <= value <= max`).
  - only numeric values are accepted, everything else throws
- To use the (different) values as a **score** and easily compare all of them,\
  they need to be converted into the same `range`: \ between `0`(`value <= min`)
  and `1` (`value >= max`)
  - If the range is "empty" (`min === max`), the score is always 0
  - values that are "not numeric" (see `isNumeric`) result in a score of 0
- The user fully controls the conversion of `item` to `value` (`toValue`):
  - get deeply nested fields
  - calculate from multiple fields
  - convert data to a numeric value
  - need the highest value to be the lowest score: `-1 * value`
  - need some logarithmic scale: `Math.log10(value)`
  - ...
- The user fully controls `min` and `max` values,\
  but they can be derived from `items` (also using `toValue`, see
  `getItemRange`).
- All options for `scor` are optional and can be configured as a second step
- Fail as early as possible (by throwing a specific `Error`):
  - using a method that requires an optional value which has not been configured
  - a required value is not numeric (beside cases mentioned above)
- A `Scor` is immutable, "mutations" create a new instance.
- A `Scor` never keeps references to the items it is scoring.
- To be implemented: Multiple `Scor`s can easily be combined into a single
  overall weighted score per item, e.g. to use it for sorting

## Usage

(This has not been published as a package yet, but you can of course fetch the
code from github.)

```ts
import { scorForItems } from "scor"; // I hope to publish on deno.land soon
import { getPackagesData } from "./npm";

const packages = await getPackagesData();
const scors = {
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
```

## TODOs

Contributions are welcome!

- WIP: finish goals from above
- proof that test are working in each pushed commit/branch
- create first tag
- publish to `deno.land/x/`
- publish to npm(?)

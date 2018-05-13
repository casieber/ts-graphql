/**
 * An object akin to a bitmask for JS objects.
 */
export type DeepPick = { [key: string]: true | DeepPick };

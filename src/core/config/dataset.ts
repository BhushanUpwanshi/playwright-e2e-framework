import { ENV, type Env } from './env';

/**
 * A test-data file, keyed by environment.
 *
 * Every dataset must define `prod`; the other environments are optional and fall
 * back to it. Most fixture data is identical across environments, and requiring
 * all three keys means triplicating it — which then drifts, because only the one
 * being exercised gets corrected.
 */
export type Dataset<T> = { prod: T } & Partial<Record<Env, T>>;

/**
 * Selects the slice of a dataset for the environment under test.
 *
 * @param dataset - Environment-keyed data, loaded from JSON.
 *
 * @returns The entry for the current `ENV`, or the `prod` entry when that
 *   environment defines none.
 *
 * @example
 * ```ts
 * import raw from '@data/login.data.json';
 * const data = forEnv(raw);
 * ```
 */
export function forEnv<T>(dataset: Dataset<T>): T {
    return dataset[ENV] ?? dataset.prod;
}

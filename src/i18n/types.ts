import type { ar } from "./locales/ar";

export type TranslationTree = typeof ar;

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

type Paths<T, D extends number = 5> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
          ? K | Join<K, Paths<T[K], Prev[D]>>
          : K;
      }[keyof T & string]
    : never;

type Prev = [never, 0, 1, 2, 3, 4, 5];

export type TranslationKey = Paths<TranslationTree> | (string & {});

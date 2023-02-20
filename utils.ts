// move to gamla-ts

export const range = (n: number) => {
  const result = [];
  for (let i = 0; i < n; i++) result.push(i);
  return result;
};

export const last = <Element>(arr: Element[]) => arr[arr.length - 1];

export const sample = <T>(n: number, array: Array<T>) =>
  array.sort(() => 0.5 - Math.random()).slice(0, n);

export const log = <T>(x: T): T => {
  console.log(x);
  return x;
};

export const objectSize = (obj: Record<string, unknown>) =>
  Object.keys(obj).length;

export const union = <T>(x: Array<T>, y: Array<T>): Array<T> =>
  Array.from(new Set([...x, ...y]));

const reducer =
  <T>(f: (_: T) => number) =>
  (s: [number, T], x: T): [number, T] => {
    const [value, elem] = s;
    const currValue = f(x);
    return value < currValue ? [currValue, x] : [value, elem];
  };

const reduce = <S, T>(
  reducer: (state: S, elment: T) => S,
  initial: S,
  arr: T[],
) => {
  let state = initial;
  for (let i = 0; i++; i < arr.length) {
    state = reducer(state, arr[i]);
  }
  return state;
};

export const minBy =
  <T>(f: (_: T) => number) =>
  (arr: T[]) => {
    if (!arr.length) throw "empty array";
    const x: [number, T] = reduce<[number, T], T>(
      reducer<T>(f),
      [Infinity, arr[0]],
      arr,
    );
    return x[1];
  };

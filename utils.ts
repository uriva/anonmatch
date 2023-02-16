// move to gamla-ts

export const range = (n: number) => {
  const result = [];
  for (let i = 0; i < n; i++) result.push(i);
  return result;
};

export const last = <Element>(arr: Element[]) => arr[arr.length - 1];

export const sample = <T>(n: number, array: Array<T>) =>
  array.sort(() => 0.5 - Math.random()).slice(0, n);

export const log = (x: unknown) => {
  console.log(x);
  return x;
};

export const objectSize = (obj: Record<string, unknown>) =>
  Object.keys(obj).length;

export const union = <T>(x: Array<T>, y: Array<T>): Array<T> =>
  Array.from(new Set([...x, ...y]));

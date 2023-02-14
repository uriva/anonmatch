import {
  PublicKey,
  SecretKey,
  generatePrivateKey,
  getPublicKey,
} from "./crypto.ts";
import { Serializable, handleOnion, wrapOnion } from "./index.ts";

const range = (n: number) => {
  const result = [];
  for (let i = 0; i < n; i++) result.push(i);
  return result;
};

function last<Element>(arr: Element[]) {
  return arr[arr.length - 1];
}

function sample<T>(n: number, array: Array<T>) {
  return array.sort(() => 0.5 - Math.random()).slice(0, n);
}

Deno.test("test ping pong", () => {
  const allPeers = range(10).map(() => generatePrivateKey());
  const [alice, bob] = allPeers;
  const send = (publicKey: PublicKey, message: Serializable) => {
    publicKeyToHandler[publicKey](message);
  };
  const publicKeyToHandler = Object.fromEntries(
    allPeers.map((secretKey: SecretKey) => [
      getPublicKey(secretKey),
      handleOnion(
        send,
        (message: Serializable) => ({ processed: true, got: message }),
        secretKey,
      ),
    ]),
  );
  const onionMessage = wrapOnion(
    "hello Bob, this is Alice",
    getPublicKey(alice),
    getPublicKey(bob),
    sample(3, allPeers),
    sample(3, allPeers),
  );
});

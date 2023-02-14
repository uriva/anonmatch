import { OnionMessage, handleOnion, wrapOnion } from "./index.ts";
import {
  PublicKey,
  SecretKey,
  Serializable,
  generatePrivateKey,
  getPublicKey,
} from "./crypto.ts";

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

Deno.test("test ping pong", async () => {
  const allPeers = range(10).map(() => generatePrivateKey());
  const [alice, bob] = allPeers;
  const send = (publicKey: PublicKey, message: Serializable) => {
    console.log("sending a message");
    publicKeyToHandler[publicKey](message);
  };

  const proxiesFwd: PublicKey[] = sample(3, allPeers).map(getPublicKey);
  const [burnerSecretKey, msg]: [SecretKey, OnionMessage] = await wrapOnion(
    "hello Bob, this is Alice",
    getPublicKey(alice),
    getPublicKey(bob),
    proxiesFwd,
    sample(3, allPeers).map(getPublicKey),
  );
  const publicKeyToHandler = Object.fromEntries(
    allPeers.map((secretKey: SecretKey) => [
      getPublicKey(secretKey),
      handleOnion(
        send,
        (message: Serializable) => ({ processed: true, got: message }),
        secretKey,
        (pk) => {
          if (pk === msg.responsePublicKey) return burnerSecretKey;
          else throw "not good";
        },
      ),
    ]),
  );
  publicKeyToHandler[proxiesFwd[0]](msg);
});

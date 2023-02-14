import { OnionMessage, handleOnion, wrapOnion } from "./index.ts";
import {
  PublicKey,
  SecretKey,
  Serializable,
  generatePrivateKey,
  getPublicKey,
} from "./crypto.ts";

import { assertEquals } from "https://deno.land/std@0.174.0/testing/asserts.ts";

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
  const send = (publicKey: PublicKey, message: Serializable) =>
    publicKeyToHandler[publicKey](message);
  const proxiesFwd: PublicKey[] = sample(3, allPeers).map(getPublicKey);
  const ping = "ping";
  const pong = "pong";
  const [burnerSecretKey, msg]: [SecretKey, OnionMessage] = await wrapOnion(
    ping,
    getPublicKey(alice),
    getPublicKey(bob),
    proxiesFwd,
    sample(3, allPeers).map(getPublicKey),
  );
  let aliceGot = 0;
  let bobGot = 0;
  const publicKeyToHandler = Object.fromEntries(
    allPeers.map((secretKey: SecretKey) => [
      getPublicKey(secretKey),
      handleOnion(
        send,
        (message: Serializable) => {
          if (secretKey === alice) {
            assertEquals(message, pong);
            aliceGot++;
            return null;
          }
          if (secretKey === bob) {
            assertEquals(message, ping);
            bobGot++;
            return pong;
          }
          throw "shouldn't happen";
        },
        secretKey,
        (pk) => {
          if (pk === msg.responsePublicKey) return burnerSecretKey;
          else throw "not good";
        },
      ),
    ]),
  );
  await publicKeyToHandler[proxiesFwd[0]](msg);
  assertEquals(bobGot, 1);
  assertEquals(aliceGot, 1);
});

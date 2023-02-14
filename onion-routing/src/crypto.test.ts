import {
  decryptAnonymously,
  encryptAnonymously,
  generatePrivateKey,
  getPublicKey,
} from "./crypto.ts";

import { assertEquals } from "https://deno.land/std@0.174.0/testing/asserts.ts";

Deno.test("encrypt and decrypt", async () => {
  const secretKey = generatePrivateKey();
  const data = "hello i am a message";
  assertEquals(
    await decryptAnonymously(
      secretKey,
      await encryptAnonymously(getPublicKey(secretKey), data),
    ),
    data,
  );
});

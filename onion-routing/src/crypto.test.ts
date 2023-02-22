import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.174.0/testing/asserts.ts";
import {
  decryptAnonymously,
  encryptAnonymously,
  generatePrivateKey,
  getPublicKey,
  sign,
  verify,
} from "./crypto.ts";

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

Deno.test("sign and verify", async () => {
  const secretKey = generatePrivateKey();
  const data = "hello i am a message";
  assert(
    await verify(
      getPublicKey(secretKey),
      await sign(secretKey, data),
      data,
    ),
  );
});

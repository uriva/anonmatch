import { closestMediator, createLikeMessage, newState } from "./index.ts";
import {
  generatePrivateKey,
  getPublicKey,
} from "../onion-routing/src/crypto.ts";

import { assertEquals } from "https://deno.land/std@0.174.0/testing/asserts";
import { range } from "./utils.ts";

Deno.test("simple match", async () => {
  const peers = range(10).map(generatePrivateKey);
  const [alice, bob] = peers;
  const states = range(10).map(() => newState(peers));
  const handlers = peers.map((secret) => (message) => {
    handleMessage(secret, send);
  });

  const aliceLikesBob = createLikeMessage(alice, getPublicKey(bob));
  const bobLikesAlice = createLikeMessage(alice, getPublicKey(bob));
  assertEquals(aliceLikesBob.matchId, bobLikesAlice.matchId);
  // Establish carol's identity (could be done either by alice or bob).
  const carolPk = closestMediator(matchId, peers.map(getPublicKey));

  send(carolPk, aliceLikesBob);
  send(carolPk, bobLikesAlice);

  assert(matchedWith(bob, aliceState));
  assert(matchedWith(alice, bobState));
});

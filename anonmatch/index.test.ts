import {
  AnonMatchMessage,
  AnonMatchPeerState,
  CallbackInfo,
  closestMediator,
  createLikeMessage,
  handleMessage,
  newState,
} from "./index.ts";
import {
  PublicKey,
  SecretKey,
  generatePrivateKey,
  getPublicKey,
} from "../onion-routing/src/crypto.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.174.0/testing/asserts";

import { range } from "./utils.ts";

const cbInfoToPeer = (cbInfo: CallbackInfo) => {
  return cbInfo as PublicKey;
};

const matchedWith = (peer: SecretKey, { myMatches }: AnonMatchPeerState) =>
  myMatches.includes(getPublicKey(peer));

Deno.test("simple match", () => {
  const peers = range(10).map(generatePrivateKey);
  const publicToPrivate = Object.fromEntries(
    peers.map((x) => [getPublicKey(x), x]),
  );
  const [alice, bob]: SecretKey[] = peers;
  const states: Record<SecretKey, AnonMatchPeerState> = Object.fromEntries(
    range(10).map((secret) => [secret, newState(peers)]),
  );
  const send = (cbInfo: CallbackInfo, message: AnonMatchMessage) => {
    handlers[publicToPrivate[cbInfoToPeer(cbInfo)]](cbInfo, message);
  };
  const handlers = peers.map(
    (secret: SecretKey) =>
      (cbInfo: CallbackInfo, message: AnonMatchMessage) => {
        states[secret] = handleMessage(secret, send)(states[secret])(
          message,
          cbInfo,
        );
      },
  );

  const aliceLikesBob = createLikeMessage(alice, getPublicKey(bob));
  const bobLikesAlice = createLikeMessage(alice, getPublicKey(bob));
  assertEquals(aliceLikesBob.like.matchId, bobLikesAlice.like.matchId);
  const matchId = aliceLikesBob.like.matchId;
  // Establish carol's identity (could be done either by alice or bob).
  const carolPk = closestMediator(peers.map(getPublicKey), matchId);

  send(carolPk, aliceLikesBob);
  send(carolPk, bobLikesAlice);

  assert(matchedWith(alice, states[bob]));
  assert(matchedWith(bob, states[alice]));
});

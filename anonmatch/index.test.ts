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
} from "https://deno.land/std@0.174.0/testing/asserts.ts";

import { range } from "../utils.ts";

const cbInfoToPeer = (cbInfo: CallbackInfo) => cbInfo as PublicKey;

const matchedWith = (peer: SecretKey, { myMatches }: AnonMatchPeerState) =>
  myMatches.includes(getPublicKey(peer));

Deno.test("simple match", async () => {
  const peers = range(10).map(() => generatePrivateKey());
  const publicToPrivate = Object.fromEntries(
    peers.map((x) => [getPublicKey(x), x]),
  );
  const [alice, bob]: SecretKey[] = peers;
  const [aliceLikesBob, bobLikesAlice] = await Promise.all(
    [
      [alice, bob],
      [bob, alice],
    ].map(([likerSecret, likeeSecret]) =>
      createLikeMessage(likerSecret, getPublicKey(likeeSecret)),
    ),
  );
  assertEquals(aliceLikesBob.like.matchId, bobLikesAlice.like.matchId);
  const matchId = aliceLikesBob.like.matchId;
  // Establish carol's identity (could be done either by alice or bob).
  const carolPk = closestMediator(peers.map(getPublicKey), matchId);
  const queue: [CallbackInfo, AnonMatchMessage][] = [
    [carolPk, aliceLikesBob],
    [carolPk, bobLikesAlice],
  ];

  let states: Record<SecretKey, AnonMatchPeerState> = Object.fromEntries(
    peers.map((secret) => [secret, newState(peers)]),
  );
  while (true) {
    const current = queue.pop();
    if (!current) break;
    const [cbInfo, message]: [CallbackInfo, AnonMatchMessage] = current;
    const secret = publicToPrivate[cbInfoToPeer(cbInfo)];
    const [newState, messagesToSend] = await handleMessage(secret)(
      states[secret],
    )(message, cbInfo);
    messagesToSend.forEach((m) => queue.push(m));
    states = { ...states, [secret]: newState };
  }

  assert(matchedWith(alice, states[bob]));
  assert(matchedWith(bob, states[alice]));
});

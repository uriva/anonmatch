import {
  PublicKey,
  encryptStable,
  sign,
  verify,
} from "../onion-routing/src/crypto.ts";
import { log, minBy, objectSize, union } from "../utils.ts";

import { SecretKey } from "../onion-routing/src/crypto.ts";
import { getPublicKey } from "../../../.cache/deno/npm/registry.npmjs.org/@noble/secp256k1/1.7.1/lib/index.d.ts";
import { levenshteinEditDistance } from "npm:levenshtein-edit-distance";
import nostrTools from "npm:nostr-tools";

export type CallbackInfo = {};
type MatchId = string;
type LikesSeen = Record<
  MatchId,
  Record<EncryptedSignature, [CallbackInfo, SelfEncryptedLikee]>
>;
export type AnonMatchPeerState = {
  myMatches: Array<PublicKey>;
  likesSeen: LikesSeen;
  peersKnown: Array<PublicKey>;
};

type PeersNoticeMessage = { type: "peers-notice"; peers: PublicKey[] };
type EncryptedSignature = string;
type SelfEncryptedLikee = string;
type SignedLike = {
  likee: SelfEncryptedLikee;
  signature: EncryptedSignature;
  matchId: MatchId;
};
type LikeMessage = { type: "like"; like: SignedLike };
type MatchNoticeMessage = { type: "match-notice"; like: SignedLike };

export type AnonMatchMessage =
  | PeersNoticeMessage
  | LikeMessage
  | MatchNoticeMessage;

const createLikeSignature = async (
  liker: SecretKey,
  likee: PublicKey,
  matchId: MatchId,
): Promise<EncryptedSignature> =>
  nostrTools.nip04.encrypt(liker, likee, await sign(liker, matchId));

const verifyLikeSignature = async (
  likee: SecretKey,
  liker: PublicKey,
  matchId: MatchId,
  signature: EncryptedSignature,
): Promise<boolean> =>
  verify(
    await nostrTools.nip04.decrypt(likee, liker, signature),
    liker,
    matchId,
  );

const createMatchId = (
  source: SecretKey,
  target: PublicKey,
): Promise<MatchId> =>
  encryptStable(
    source,
    target,
    "i like you",
    new TextEncoder().encode("anonmatch1111111"),
  );

export const createPeersNoticeMessage = (
  peers: PublicKey[],
): PeersNoticeMessage => ({ type: "peers-notice", peers });

export const createLikeMessage = async (
  source: SecretKey,
  target: PublicKey,
): Promise<LikeMessage> => {
  const matchId = await createMatchId(source, target);
  return {
    type: "like",
    like: {
      likee: nostrTools.nip04.encrypt(source, getPublicKey(source), target),
      matchId,
      signature: await createLikeSignature(source, target, matchId),
    },
  };
};

const toMatchNoticeMessage = (
  matchId: MatchId,
  signatureToCallbackInfo: [
    EncryptedSignature,
    [CallbackInfo, SelfEncryptedLikee],
  ][],
): [CallbackInfo, MatchNoticeMessage][] => {
  if (signatureToCallbackInfo.length != 2) throw "shouldn't happen";
  const [[sig1, [cb1, enclike1]], [sig2, [cb2, enclike2]]] =
    signatureToCallbackInfo;
  return [
    [cb1, makeMatchNotice(matchId, enclike1, sig2)],
    [cb2, makeMatchNotice(matchId, enclike2, sig1)],
  ];
};

export const newState = (initialPeers: PublicKey[]): AnonMatchPeerState => ({
  myMatches: [],
  likesSeen: {},
  peersKnown: initialPeers,
});

const makeMatchNotice = (
  matchId: MatchId,
  likee: string,
  signature: EncryptedSignature,
): MatchNoticeMessage => ({
  type: "match-notice",
  like: { likee, matchId, signature },
});

export const handleMessage =
  (me: SecretKey) =>
  (state: AnonMatchPeerState) =>
  async (
    message: AnonMatchMessage,
    callbackInfo: CallbackInfo,
  ): Promise<[AnonMatchPeerState, [CallbackInfo, MatchNoticeMessage][]]> => {
    const { type } = message;
    if (type === "peers-notice") {
      return [
        { ...state, peersKnown: union(state.peersKnown, message.peers) },
        [],
      ];
    }
    if (type === "like") {
      const {
        like: { signature, matchId, likee },
      } = message;
      // Register the like.
      const likesSeen: LikesSeen = {
        ...state.likesSeen,
        [matchId]: {
          ...state.likesSeen[matchId],
          [signature]: [callbackInfo, likee],
        },
      };
      const newS = { ...state, likesSeen };
      return [
        newS,
        objectSize(likesSeen[matchId]) === 2
          ? toMatchNoticeMessage(matchId, Object.entries(likesSeen[matchId]))
          : [],
      ];
    }
    if (type === "match-notice") {
      const {
        like: { matchId, signature, likee },
      } = message;
      return [
        (await verifyLikeSignature(
          me,
          await nostrTools.nip04.decrypt(me, getPublicKey(me), likee),
          matchId,
          signature,
        ))
          ? { ...state, myMatches: union(state.myMatches, [matchId]) }
          : state,
        [],
      ];
    }
    return [state, []];
  };

export const closestMediator = (
  peers: PublicKey[],
  matchId: MatchId,
): PublicKey =>
  minBy((x: PublicKey) => levenshteinEditDistance(x, matchId))(peers);

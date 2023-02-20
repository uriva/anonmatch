import {
  PublicKey,
  encryptStable,
  sign,
  verify,
} from "../onion-routing/src/crypto.ts";
import { log, minBy, objectSize, union } from "../utils.ts";

import { SecretKey } from "../onion-routing/src/crypto.ts";
import { levenshteinEditDistance } from "npm:levenshtein-edit-distance";
import nostrTools from "npm:nostr-tools";

export type CallbackInfo = {};
type MatchId = string;
type LikesSeen = Record<MatchId, Record<EncryptedSignature, CallbackInfo>>;
export type AnonMatchPeerState = {
  myMatches: Array<PublicKey>;
  likesSent: Record<MatchId, PublicKey>;
  likesSeen: LikesSeen;
  peersKnown: Array<PublicKey>;
};

type PeersNoticeMessage = { type: "peers-notice"; peers: PublicKey[] };
type EncryptedSignature = string;
type SignedLike = {
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
      matchId,
      signature: await createLikeSignature(source, target, matchId),
    },
  };
};

export const newState = (initialPeers: PublicKey[]): AnonMatchPeerState => ({
  myMatches: [],
  likesSent: {},
  likesSeen: {},
  peersKnown: initialPeers,
});

const makeMatchNotice = (
  matchId: MatchId,
  signature: EncryptedSignature,
): MatchNoticeMessage => ({
  type: "match-notice",
  like: { matchId, signature },
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
        like: { signature, matchId },
      } = message;
      // Register the like.
      const likesSeen: LikesSeen = {
        ...log(state).likesSeen,
        [matchId]: { ...state.likesSeen[matchId], [signature]: callbackInfo },
      };
      const newState = { ...state, likesSeen };
      if (objectSize(likesSeen[matchId]) === 2) {
        for (const [signature, callback] of Object.entries(likesSeen[matchId]))
          [newState, [callback, makeMatchNotice(matchId, signature)]];
      }
      return [log(newState), []];
    }
    if (type === "match-notice") {
      const {
        like: { matchId, signature },
      } = message;
      return [
        (await verifyLikeSignature(
          me,
          state.likesSent[matchId],
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

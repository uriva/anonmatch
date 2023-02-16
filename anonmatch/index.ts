import { objectSize, union } from "../utils.ts";

import { PublicKey } from "../onion-routing/src/crypto.ts";
import { SecretKey } from "../onion-routing/src/crypto.ts";
import { levenshteinEditDistance } from "npm:levenshtein-edit-distance";
import { minBy } from "npm:gamla";
import nostrTools from "npm:nostr-tools";

type CallbackInfo = {};
type MatchId = string;
type LikesSeen = { [_: MatchId]: { [_: EncryptedSignature]: CallbackInfo } };
type AnonMatchPeerState = {
  myMatches: Array<PublicKey>;
  likesSent: { [_: MatchId]: PublicKey };
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

type AnonMatchMessage = PeersNoticeMessage | LikeMessage | MatchNoticeMessage;

const createLikeSignature = (
  liker: SecretKey,
  likee: PublicKey,
  matchId: MatchId,
): EncryptedSignature => nostrTools.nip04.encrypt(liker, likee, matchId);

const verifyLikeSignature = (
  likee: SecretKey,
  liker: PublicKey,
  matchId: MatchId,
  signature: EncryptedSignature,
) => nostrTools.nip04.decrypt(likee, liker, signature) === matchId;

const createMatchId = (source: SecretKey, target: PublicKey) =>
  nostrTools.nip04.encrypt(source, target, "i like you");

export const createPeersNoticeMessage = (
  peers: PublicKey[],
): PeersNoticeMessage => ({ type: "peers-notice", peers });

export const createLikeMessage = (
  source: SecretKey,
  target: PublicKey,
): LikeMessage => {
  const matchId = createMatchId(source, target);
  return {
    type: "like",
    like: { matchId, signature: createLikeSignature(source, target, matchId) },
  };
};

export const newState = (initialPeers): AnonMatchPeerState => ({
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
  (
    me: SecretKey,
    send: (cb: CallbackInfo, message: AnonMatchMessage) => void,
  ) =>
  (state: AnonMatchPeerState) =>
  (message: AnonMatchMessage, callbackInfo: CallbackInfo) => {
    const { type } = message;
    if (type === "peers-notice") {
      return { ...state, peersKnown: union(state.peersKnown, message.peers) };
    }
    if (type === "like") {
      const {
        like: { signature, matchId },
      } = message;
      // Register the like.
      const likesSeen: LikesSeen = {
        ...state.likesSeen,
        matchId: { ...state.likesSeen[matchId], [signature]: callbackInfo },
      };
      if (objectSize(likesSeen[matchId]) === 2) {
        for (const [signature, callback] of Object.entries(likesSeen[matchId]))
          send(callback, makeMatchNotice(matchId, signature));
      }
      return {
        ...state,
        likesSeen,
      };
    }
    if (type === "match-notice") {
      const {
        like: { matchId, signature },
      } = message;
      return verifyLikeSignature(
        me,
        state.likesSent[matchId],
        matchId,
        signature,
      )
        ? { ...state, myMatches: union(state.myMatches, [matchId]) }
        : state;
    }
  };

export const closestMediator = (
  peers: PublicKey[],
  matchId: MatchId,
): PublicKey =>
  minBy((x: PublicKey) => levenshteinEditDistance(x, matchId))(peers);

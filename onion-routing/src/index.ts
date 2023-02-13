import pow from "npm:proof-of-work";
import x from "npm:nostr-tools@1.2.1";

type ProofOfWork = string;

const complexity = 16;

const work = (data: string): ProofOfWork => {
  return new pow.Solver().solve(complexity);
};

const verifyWork = (nonce: ProofOfWork, data: string) => {
  return new pow.Verifier({ complexity, size: 10, n: 10 }).check(
    nonce,
    complexity,
  );
};

const { generatePrivateKey, getPublicKey } = x;
type PrivateKey = ReturnType<typeof generatePrivateKey>;
type PublicKey = ReturnType<typeof getPublicKey>;
type Encrypted = string;

type Route = {
  head: PublicKey;
  // encrypted using head key
  tail: Encrypted; // <Route | null>;
  // coupled with tail string to prevent double spending (so it must go the path chosen)
  proofOfWork: ProofOfWork;
};

type OnionMessage = {
  fwdRoute?: Route | null;
  bwdRoute?: Route | null;
  response?: Encrypted; // <any>
  request?: Encrypted; // <any>
};

const buildRoute =
  (encrypt) =>
  ([head, ...tail]: PublicKey[]): Route | null => {
    if (!head) return null;
    const encryptdTail = encrypt(head, buildRoute(tail));
    return {
      proofOfWork: work(encryptdTail),
      head,
      tail: encryptdTail,
    };
  };

export const handleOnion =
  (decrypt, send, process) =>
  ({ fwdRoute, bwdRoute, request, response }: OnionMessage) => {
    if (!bwdRoute) {
      process(response);
      return;
    }
    if (fwdRoute) {
      const { head, tail, proofOfWork }: Route = decrypt(fwdRoute);
      if (!verifyWork(tail, proofOfWork)) return;
      send(head, {
        bwdRoute,
        fwdRoute: tail,
        request,
      });
    } else {
      const { head, tail, proofOfWork }: Route = decrypt(bwdRoute);
      if (!verifyWork(tail, proofOfWork)) return;
      send(head, {
        bwdRoute: tail,
        response: response || process(request),
      });
    }
  };

function last<Element>(arr: Element[]) {
  return arr[arr.length - 1];
}

export const wrapOnion =
  (encrypt) =>
  (
    request: any,
    peersFwd: PublicKey[],
    peersBwd: PublicKey[],
  ): OnionMessage => {
    return {
      request: encrypt(last(peersFwd), request),
      fwdRoute: buildRoute(encrypt)(peersFwd),
      bwdRoute: buildRoute(encrypt)(peersBwd),
    };
  };

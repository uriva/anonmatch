import x from "npm:nostr-tools@1.2.1";

type Payment = string;

const pay = (): Payment => {
  return "payment";
};

const transactPayment = (payment: Payment) => {
  return true;
};

const { generatePrivateKey, getPublicKey } = x;
type PrivateKey = ReturnType<typeof generatePrivateKey>;
type PublicKey = ReturnType<typeof getPublicKey>;
type Encrypted = string;

type Route = {
  head: PublicKey;
  // encrypted using head key
  tail: Encrypted; // <Route | null>;
  payment: Payment;
};

type OnionMessage = {
  fwdRoute?: Route | null;
  bwdRoute?: Route | null;
  response?: Encrypted; // <any>
  request?: Encrypted; // <any>
};

const buildRoute =
  (encrypt, pay) =>
  ([head, ...tail]: PublicKey[]): Route | null => {
    if (!head) return null;
    return {
      payment: pay(),
      head,
      tail: encrypt(head, buildRoute(encrypt, pay)(tail)),
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
      const { head, tail, payment }: Route = decrypt(fwdRoute);
      if (!transactPayment(payment)) return;
      send(head, {
        bwdRoute,
        fwdRoute: tail,
        request,
      });
    } else {
      const { head, tail, payment }: Route = decrypt(bwdRoute);
      if (!transactPayment(payment)) return;
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
  (encrypt, pay) =>
  (
    request: any,
    peersFwd: PublicKey[],
    peersBwd: PublicKey[],
  ): OnionMessage => {
    return {
      request: encrypt(last(peersFwd), request),
      fwdRoute: buildRoute(encrypt, pay)(peersFwd),
      bwdRoute: buildRoute(encrypt, pay)(peersBwd),
    };
  };

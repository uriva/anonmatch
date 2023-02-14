import {
  AnonymousEncryption,
  PublicKey,
  SecretKey,
  decryptAnonymously,
  encryptAnonymously,
} from "./crypto.ts";

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };
type Route = {
  head: PublicKey;
  // encrypted using head key
  tail: AnonymousEncryption; // <Route | null>;
};

type OnionMessage = {
  fwdRoute?: Route | null;
  bwdRoute?: Route | null;
  response?: AnonymousEncryption; // <any>
  request?: AnonymousEncryption; // <any>
};

const buildRoute = async ([
  head,
  ...tail
]: PublicKey[]): Promise<Route | null> => {
  return head
    ? {
        head,
        tail: await encryptAnonymously(
          head,
          JSON.stringify(await buildRoute(tail)),
        ),
      }
    : null;
};

export const handleOnion =
  (
    send: (pk: number, message: Serializable) => void,
    process: (message: Serializable) => Serializable,
    privateKey: SecretKey,
  ) =>
  async ({ fwdRoute, bwdRoute, request, response }: OnionMessage) => {
    if (!bwdRoute) {
      if (!response) {
        console.error("expected a response");
        return;
      }
      process(await decryptAnonymously(privateKey, response));
      return;
    }
    if (fwdRoute) {
      const { head, tail }: Route = fwdRoute;
      send(head, {
        bwdRoute,
        fwdRoute: await decryptAnonymously(privateKey, tail),
        request,
      });
    } else {
      const { head, tail }: Route = bwdRoute;
      send(head, {
        bwdRoute: await decryptAnonymously(privateKey, tail),
        response: response || process(request),
      });
    }
  };

export const wrapOnion = async (
  request: Serializable,
  sender: PublicKey,
  recipient: PublicKey,
  proxiesFwd: PublicKey[],
  proxiesBwd: PublicKey[],
): Promise<OnionMessage> => {
  const [requestStr, fwdRoute, bwdRoute] = await Promise.all([
    encryptAnonymously(recipient, JSON.stringify(request)),
    buildRoute([...proxiesFwd, recipient]),
    buildRoute([...proxiesBwd, sender]),
  ]);
  return {
    request: requestStr,
    fwdRoute,
    bwdRoute,
  };
};

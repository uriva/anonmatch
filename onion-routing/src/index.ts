import {
  AnonymousEncryption,
  PublicKey,
  SecretKey,
  Serializable,
  decryptAnonymously,
  encryptAnonymously,
  generatePrivateKey,
  getPublicKey,
} from "./crypto.ts";

type Route = {
  head: PublicKey;
  tail?: EncryptedRoute;
};
type EncryptedRoute = AnonymousEncryption;
const encryptRoute = encryptAnonymously as (
  pk: PublicKey,
  route: Route,
) => Promise<EncryptedRoute>;

const decryptRoute = decryptAnonymously as (
  sk: SecretKey,
  data: EncryptedRoute,
) => Promise<Route>;

export type OnionMessage = {
  responsePublicKey: PublicKey;
  fwdRoute?: EncryptedRoute;
  bwdRoute?: EncryptedRoute;
  response?: AnonymousEncryption;
  request?: AnonymousEncryption;
};

const buildRoute = async ([head, ...tail]: PublicKey[]): Promise<Route> => {
  return tail.length
    ? {
        head,
        tail: await encryptRoute(head, await buildRoute(tail)),
      }
    : { head };
};

export const handleOnion =
  (
    send: (pk: number, message: Serializable) => void,
    process: (message: Serializable) => Serializable,
    privateKey: SecretKey,
    getBurnerSecret: (pk: PublicKey) => SecretKey,
  ) =>
  async ({
    responsePublicKey,
    fwdRoute,
    bwdRoute,
    request,
    response,
  }: OnionMessage) => {
    console.log("got message");
    if (!bwdRoute) {
      if (!response) {
        console.error("expected a response");
        return;
      }
      process(
        await decryptAnonymously(getBurnerSecret(responsePublicKey), response),
      );
      return;
    }
    if (fwdRoute) {
      const { head, tail }: Route = await decryptRoute(privateKey, fwdRoute);
      console.log("decrypting");
      send(head, {
        bwdRoute,
        fwdRoute: tail,
        request,
      });
      console.log("ended");
    } else {
      const { head, tail }: Route = await decryptRoute(privateKey, bwdRoute);
      send(head, {
        bwdRoute: tail,
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
): Promise<[SecretKey, OnionMessage]> => {
  const burner = generatePrivateKey();
  const [requestStr, fwdRoute, bwdRoute] = await Promise.all([
    encryptAnonymously(recipient, JSON.stringify(request)),
    buildRoute([...proxiesFwd, recipient]),
    buildRoute([...proxiesBwd, sender]),
  ]);
  return [
    burner,
    {
      request: requestStr,
      responsePublicKey: getPublicKey(burner),
      fwdRoute: await encryptRoute(proxiesFwd[0], fwdRoute),
      bwdRoute: await encryptRoute(recipient, bwdRoute),
    },
  ];
};

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
    if (!bwdRoute) {
      if (!response) {
        console.error("expected a response");
        return;
      }
      return process(
        await decryptAnonymously(getBurnerSecret(responsePublicKey), response),
      );
    }
    if (fwdRoute) {
      const { head, tail }: Route = await decryptRoute(privateKey, fwdRoute);
      return send(head, {
        responsePublicKey,
        bwdRoute,
        fwdRoute: tail,
        request,
      });
    } else {
      const { head, tail }: Route = await decryptRoute(privateKey, bwdRoute);
      return send(head, {
        responsePublicKey,
        bwdRoute: tail,
        response:
          response ||
          (await encryptAnonymously(
            responsePublicKey,
            process(
              await decryptAnonymously(
                privateKey,
                request as AnonymousEncryption,
              ),
            ),
          )),
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
    encryptAnonymously(recipient, request),
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

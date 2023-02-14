import nostrTools from "npm:nostr-tools";

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

export const generatePrivateKey = nostrTools.generatePrivateKey;
export const getPublicKey = nostrTools.getPublicKey;

export type PublicKey = ReturnType<typeof getPublicKey>;
export type SecretKey = ReturnType<typeof generatePrivateKey>;
export type AnonymousEncryption = {
  anonymousPublicKey: PublicKey;
  cipher: string;
};

export const encryptAnonymously = async (
  recipient: PublicKey,
  data: Serializable,
): Promise<AnonymousEncryption> => {
  const privateKey = generatePrivateKey();
  return {
    anonymousPublicKey: getPublicKey(privateKey),
    cipher: await nostrTools.nip04.encrypt(
      privateKey,
      recipient,
      JSON.stringify(data),
    ),
  };
};

export const decryptAnonymously = async (
  secret: SecretKey,
  { anonymousPublicKey, cipher }: AnonymousEncryption,
): Promise<Serializable> => {
  return JSON.parse(
    await nostrTools.nip04.decrypt(secret, anonymousPublicKey, cipher),
  );
};

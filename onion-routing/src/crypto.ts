import nostrTools from "npm:nostr-tools";

export const generatePrivateKey = nostrTools.generatePrivateKey;
export const getPublicKey = nostrTools.generatePrivateKey;

export type PublicKey = ReturnType<typeof getPublicKey>;
export type SecretKey = ReturnType<typeof generatePrivateKey>;
export type AnonymousEncryption = {
  anonymousPublicKey: PublicKey;
  cipher: string;
};

export const encryptAnonymously = async (
  recipient: PublicKey,
  data: string,
): Promise<AnonymousEncryption> => {
  const privateKey = generatePrivateKey();
  return {
    anonymousPublicKey: getPublicKey(privateKey),
    cipher: await nostrTools.nip04.encrypt(privateKey, recipient, data),
  };
};

export const decryptAnonymously = (
  secret: SecretKey,
  { anonymousPublicKey, cipher }: AnonymousEncryption,
): string => {
  return nostrTools.nip04.decrypt(secret, anonymousPublicKey, cipher);
};

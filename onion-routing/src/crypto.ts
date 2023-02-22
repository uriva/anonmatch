import { base64 } from "npm:@scure/base";
import { getSharedSecret, schnorr, utils } from "npm:@noble/secp256k1";
import nostrTools from "npm:nostr-tools";

import "./monkey_patch_secp256k1.ts";

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

export const generatePrivateKey = nostrTools.generatePrivateKey;
export type Signature = string;
export const getPublicKey = nostrTools.getPublicKey;

export type PublicKey = ReturnType<typeof getPublicKey>;
export type SecretKey = ReturnType<typeof generatePrivateKey>;
export type AnonymousEncryption = {
  anonymousPublicKey: PublicKey;
  cipher: string;
};

export const encryptStable = async (
  privkey: SecretKey,
  pubkey: PublicKey,
  text: string,
  iv: Uint8Array, // length 16,
) =>
  `${
    base64.encode(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-CBC", iv },
          await crypto.subtle.importKey(
            "raw",
            getSharedSecret(privkey, "02" + pubkey).slice(1, 33),
            { name: "AES-CBC" },
            false,
            ["encrypt"],
          ),
          new TextEncoder().encode(text),
        ),
      ),
    )
  }?iv=${base64.encode(new Uint8Array(iv.buffer))}`;

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
): Promise<Serializable> =>
  JSON.parse(
    await nostrTools.nip04.decrypt(secret, anonymousPublicKey, cipher),
  );

export const sign = (secret: SecretKey, message: string): Signature =>
  utils.bytesToHex(schnorr.signSync(stringEncode(message), secret));

export const verify = (
  publicKey: PublicKey,
  signature: Signature,
  message: string,
) => schnorr.verifySync(signature, stringEncode(message), publicKey);

const stringEncode = (str: string): Uint8Array => new TextEncoder().encode(str);

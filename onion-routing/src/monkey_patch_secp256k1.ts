import * as secp256k1 from "npm:@noble/secp256k1";
import { sha256 } from "npm:@noble/hashes/sha256";

secp256k1.utils.sha256Sync = (...msgs) =>
  sha256(secp256k1.utils.concatBytes(...msgs));

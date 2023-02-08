import pow from "npm:proof-of-work";
import x from "npm:nostr-tools@1.2.1";

const solver = new pow.Solver();

const nonce = solver.solve(16);
console.log(nonce);

const { generatePrivateKey, getPublicKey } = x;
const sk = generatePrivateKey(); // `sk` is a hex string
const pk = getPublicKey(sk); // `pk` is a hex string

console.log(sk, pk);

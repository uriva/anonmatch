# Anonymous distributed matching

## Goals

1. Allow a p2p network to match pairs of peers who like each other.

## Assumptions

1. Peers can communicate securely if they know each other's identity.
1. Profiles are considered completely public.

## Constraints

1. No one can know of a match except the matched pair, and they know only if they bilateraly like each other.
1. No one can know how many matches a peer had.

## Solution Architecture

Peers find out about each other from other peers, and send each other profiles they know of.

Profiles are signed descriptions of peers with a timestamp. The latest profile is to override any preceding versions.

If Alice gets Bob's profile and she likes him, she can produce a secret shared to both of them (ECDH shared secret). She sends this secret through n proxies (onion routing style), to a designated intermediary between her and Bob.

The designated intermediary, Carol, is defined as the user with public key closest to `hash(app id, sharedSecret(Alice, Bob))` public keys. Assuming most peers know most peers, Alice and Bob should agree on Carol's identity.

Carol receives the shared secret from two different proxies, and so declares a match. She does so by sending back through the onion relays the match fact. This eventually reaches Alice (and Bob), which at this point can communicate directly, knowing they both like each other.

In order for Carol not be able to fake a message, Alice and Bob add to the shared secret an encrypted signature of the match, that can only be verified by the other side.

Carol has no way of finding Alice or Bob's identity, nor can she fake a match. The relays can only know a match has occurred, but not who it was (The last relay doesn't know it is the last relay). Selecting different relays each time limit their ability to know how many matches Alice had in total.

## Attack vectors

### Like spamming

Alice can just like everyone and then she'll find out who likes her.

Mitigations:

1. Some way to track how many likes peers have sent, and ignore some of their likes.
1. Maybe a proof of work to make it unreasonable to send a large number of likes.

## Messages

1. Alice likes Bob message (shared secret of Alice and Bob)
1. Share profiles
1. Discover peers

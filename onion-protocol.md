## Goal

Pass a message to a recipient without them knowing who sent it, and having it still be able to reply.

Prevent spamming using proof of work.

```ts
type Route   = {
    head: PublicKey;
    tail: Encrypted<Route | null> // encrypted using head key
    proofOfWork: ProofOfWork
}


type OnionMessage = {
  ?fwd: Encrypted<Route>
  ?bwd: Encrypted<Route>
  ?response: any
  ?request: any
}


type MessageWithPOW = {
  payload: OnionMessage;
  // coupled with payload and recipient public key to prevent double spending
  proofOfWork: ProofOfWork;
};

const handleOnion =
  (process) =>
  ({ proofOfWork, payload }: MessageWithPOW) => {
    if (!verifyPOW(proofOfWork)) return;
    const { fwd, bwd,  request } = payload;
    if (!bwd) process(response);
    if (!fwd) {
      send(bwd.head, {
        proofOfWork: bwd.proofOfWork,
        payload: {
          bwd: bwd.tail,
          response: payload.response || process(request),
        },
      });
      return;
    }
    send(fwd.head, {
      proofOfWork: fwd.proofOfWork,
      payload: { bwd, fwd: fwd.tail, request },
    });
  };
```

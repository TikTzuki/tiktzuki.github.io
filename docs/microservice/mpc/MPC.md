---
sidebar_position: 1
---

## Terms

- GG18: Refers to the protocol by Gennaro and Goldfeder (2018), enabling multiple parties to jointly generate ECDSA keys and signatures without revealing their private shares.
  It supports ( t+1 ) out of ( n ) signing, meaning any subset of ( t+1 ) parties can sign.

- GG20: Refers to the improved protocol by Gennaro and Goldfeder (2020).
  It adds robustness by identifying malicious parties if signing fails and requires only a broadcast channel for communication.

### Protocols

#### Round-based protocol

In round-based protocol we have n parties that can send messages to and receive messages from other parties within rounds (number of parties n is known prior to starting protocol).\
At every round party may send a P2P or broadcast message, and it receives all broadcast messages sent by other parties and P2P messages sent directly to it.
After party's received enough round messages in this round, it either proceeds (evaluates something on received messages and goes to next round) or finishes the protocol.

## MPC over NATS architecture

- Run your own private NATS cluster (not public NGS) for security.

- Each node:

    - Connects via mTLS (certs signed by your CA).

    - Subscribes to a subject named after its ID (mpc.node.<id>).

    - Publishes MPC messages directly to the recipient’s subject.

- For group broadcasts: use a shared subject (mpc.round.<round_id>).

- Add application-level AEAD encryption (ChaCha20-Poly1305 or AES-GCM) per MPC message so that even if NATS is compromised, contents stay secret.

Example:

- Node A → publishes encrypted share to mpc.node.2.

- Node B → has subscription to mpc.node.2, receives it, decrypts, processes.

- For broadcast (e.g., commitments), Node A → publishes to mpc.round.5, all nodes subscribed get it.

## Key Share Storage Best Practices

Example:

Party A: Stores its share inside AWS KMS/HSM, with no export permission.

Party B: Stores its share in Azure HSM.

Party C: Runs inside an Intel SGX enclave on-premises.

Each share is encrypted at rest, protected by per-party infrastructure, and only accessible by the MPC runtime.
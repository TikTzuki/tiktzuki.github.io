---
sidebar_position: 1
---

# MPC-based Crypto-Custody Design (Rust) — SSD

## Terms


### Protocols

#### Round-based protocol

In round-based protocol we have n parties that can send messages to and receive messages from other parties within rounds (number of parties n is known prior to starting protocol).\
At every round party may send a P2P or broadcast message, and it receives all broadcast messages sent by other parties and P2P messages sent directly to it.
After party's received enough round messages in this round, it either proceeds (evaluates something on received messages and goes to next round) or finishes the protocol.

#### GG18
- GG18: Refers to the protocol by Gennaro and Goldfeder (2018), enabling multiple parties to jointly generate ECDSA keys and signatures without revealing their private shares.
  It supports ( t+1 ) out of ( n ) signing, meaning any subset of ( t+1 ) parties can sign.

#### GG20
- GG20: Refers to the improved protocol by Gennaro and Goldfeder (2020).
  It adds robustness by identifying malicious parties if signing fails and requires only a broadcast channel for communication.

#### CGGMP24
- CGGMP24 is a state-of-art ECDSA TSS protocol that supports 1-round signing (requires 3 preprocessing rounds), identifiable abort, and a key refresh protocol.

## Scopes

A complete MPC-based crypto asset custody system in Rust should cover:

- Key Generation (MPC Keygen): Distributed ECDSA key generation using a GG20 protocol.
- Secure Storage: Each party stores its secret share securely (e.g., encrypted local file, HSM).
- Signing (MPC Sign): Distributed signing protocol, requiring threshold parties to cooperate.
- Communication: Secure, authenticated, and encrypted messaging (over NATS).
- Access Control: Party authentication, authorization, and audit logging.
- Recovery & Rotation: Key share recovery, rotation, and party join/leave handling.
- Transaction Policy: Rules for transaction approval (e.g., multi-party approval, limits).



## MPC - SSD

Professional, end-to-end design for a threshold/MPC-based crypto custody system written in Rust. I’ll give: protocol choices & rationale, system architecture, required crates, concrete Rust module layout, message formats (NATS), storage/HSM choices, signing & keygen flows, recovery/rotation, transaction policy, testing & deployment notes, and short example code snippets you can drop into a Rust project.

> Short summary of recommended approach: implement a modern threshold-ECDSA stack (prefer CGGMP24 / audited implementations where possible) built on a tokio async runtime, using `async-nats` for messaging, `k256` (or vetted bindings) for curve primitives where needed, and integrate HSM/PKCS#11 or encrypted local storage for secret-share persistence. Use threshold libraries (existing Rust crates) rather than inventing low-level zero-knowledge subprotocols from scratch unless you have cryptographers on staff. Sources: DFNS CGGMP24 release, ZenGo-X multi-party ECDSA, Axelar/tofn notes, Boltlabs tss-ecdsa and Rust crypto crates. ([dfns.co][1], [GitHub][2])

---

### 1. Protocol choice & justification

* **Primary recommendation**: **CGGMP24** (modern threshold ECDSA improvements built on/after CGGMP/CGGMP24 family) — more recent protocol addressing identified attacks on older GG20 variants; DFNS published a reviewed Rust implementation and used it in production. Use this where production-readiness and audits are required. ([dfns.co][1])
* **Alternative**: **GG20** implementation (e.g., ZenGo-X / `multi-party-ecdsa` or `tofn`), acceptable but be aware of historical attacks and implementation caveats — review/adapt to known mitigations. ([GitHub][2])

---

### 2. High-level architecture

Components (each as a Rust microservice or library crate):

1. **MPC Node / Party Agent** (runs at each custodian party)

  * Implements protocol state machine for DKG (keygen), Threshold Sign, refresh/reshare, recovery.
  * Stores local secret share (encrypted on disk or in HSM).
  * Connects to messaging layer (NATS).
  * Exposes admin gRPC/REST for health & audit.

2. **Orchestrator** (optional but recommended)

  * Subscribes to requests (API / operator).
  * Initiates signing sessions, enforces transaction policy, collects approvals, starts MPC rounds.
  * Not in possession of any secret—only session coordination.

3. **Transaction Policy Engine**

  * Holds policy rules: thresholds, whitelists, amount limits, time windows, approval workflows.

4. **Messaging Layer**

  * **NATS** (async-nats client) for authenticated, encrypted pub/sub + request/reply for MPC rounds. Use NATS server(s) with TLS and account/creds authentication. ([Crates.io][3], [Docs.rs][4])

5. **Storage & Key Backup**

  * Local encrypted files (age, libsodium secretbox) or HSM / PKCS#11 for share custody & signing operations.
  * Optionally an encrypted escrow for share backups (Shamir-share-of-share encrypted, split into backup parties).

6. **Auditing & Logging**

  * Immutable event log (append-only, e.g., Kafka or write-once store) and on-chain checkpointing if desired.
  * All protocol steps emit auditable messages (no secrets).

7. **Admin UI / API**

  * For operator requests, recovery flows, rotation, party join/leave.

Diagram (logical): Operator/API → Orchestrator → NATS → Party Agents → HSM/Local secure store

---

### 3. Rust ecosystem and crates (recommended)

* MPC / Threshold ECDSA crates:

  * `CGGMP24` / `dfns` implementation (CGGMP24) — recommended if production-ready in your review. ([Crates.io][5], [dfns.co][1])
  * `multi-party-ecdsa` (ZenGo-X). ([GitHub][2])

* Curve / crypto primitives:

  * `k256` (pure-Rust secp256k1) or curated FFI to `libsecp256k1` depending on performance/security needs. ([Docs.rs][8], [the iqlusion blog on Svbtle][9])
  * `rand`, `subtle`, `zeroize` for secret hygiene.

* Storage & HSM:

  * `pkcs11` crates or `tss-esapi` for TPM interfacing.
  * `age` crate for file encryption, or `ring`/`libsodium` bindings.

---

### 4. Detailed module layout (Rust workspace)

Workspace with crates:

```
mpc-node/
  Cargo.toml (workspace)
  crates/
    mpc-protocol/        # wraps threshold ECDSA library & protocol state machines
    party-agent/         # binary: runs on each custodian
    orchestrator/        # binary: orchestrates sessions, enforces policy
    messaging/           # NATS client helpers + message schemas
    storage/             # encrypted local storage + HSM integration
    policy/              # transaction policy engine
    audit/               # audit events + sink (Kafka/DB)
    api/                 # REST/gRPC server for operators (auth)
```

#### Core responsibilities

* **mpc-protocol**: types `KeyGenSession`, `SignSession`, `ReshareSession`. Exposes async functions that run protocol rounds and accept/send serialized protocol messages. Internally uses `CGGMP24`/`multi-party-ecdsa`.
* **party-agent**: connects to NATS, listens for protocol messages, holds `LocalSecretShare`, signs messages produced by `mpc-protocol`.
* **messaging**: contains typed NATS subjects and message envelopes with JSON/Protobuf schema, authentication tokens, and session IDs.
* **storage**: `SecretStore` trait with two impls: `EncryptedFileStore` and `HsmStore` (PKCS#11/TSS).
* **policy**: DSL for rules, e.g., `Threshold=3`, `DailyLimit=1000 BTC`, `RequireApprovalsFrom=[role:treasury]`.

---

### 5. Messaging & session flow (NATS)

Design choices:

* Use **per-session subjects**: `mpc.{session_id}.party.{party_id}` for direct messages; `mpc.{session_id}.broadcast` for broadcast/multiparty messages.
* Messages must be signed at the transport layer using mutual TLS or NATS creds; also include MACs of message content and sequence numbers.

Example subject naming:

* `mpc.keygen.{key_id}.party.{party_id}`
* `mpc.sign.{tx_id}.party.{party_id}`
* `mpc.session.{session_id}.control` (for control/abort)

All messages contain:

```protobuf
message MpcEnvelope {
  string session_id = 1;
  uint32 round = 2;
  bytes payload = 3; // proto of protocol-specific message
  bytes sig = 4;     // optional transport-level signature
  uint64 timestamp = 5;
}
```

---

[//]: # (## MPC over NATS architecture)

[//]: # ()
[//]: # (- Run your own private NATS cluster &#40;not public NGS&#41; for security.)

[//]: # ()
[//]: # (- Each node:)

[//]: # ()
[//]: # (  - Connects via mTLS &#40;certs signed by your CA&#41;.)

[//]: # ()
[//]: # (  - Subscribes to a subject named after its ID &#40;mpc.node.\<id>&#41;.)

[//]: # ()
[//]: # (  - Publishes MPC messages directly to the recipient’s subject.)

[//]: # ()
[//]: # (- For group broadcasts: use a shared subject &#40;mpc.round.\<round_id>&#41;.)

[//]: # ()
[//]: # (- Add application-level AEAD encryption &#40;ChaCha20-Poly1305 or AES-GCM&#41; per MPC message so that even if NATS is compromised, contents stay secret.)

[//]: # ()
[//]: # (Example:)

[//]: # ()
[//]: # (- Node A → publishes encrypted share to mpc.node.2.)

[//]: # ()
[//]: # (- Node B → has subscription to mpc.node.2, receives it, decrypts, processes.)

[//]: # ()
[//]: # (- For broadcast &#40;e.g., commitments&#41;, Node A → publishes to mpc.round.5, all nodes subscribed get it.)

[//]: # (---)

### 6. Key generation (MPC KeyGen) flow (concrete)

1. **Operator** requests a new key (`orchestrator`).
2. `orchestrator` creates `session_id`, determines participants, threshold `t`, and publishes `mpc.keygen.{keyid}.start` with metadata.
3. Each `party-agent` loads local `SecretStore` slot for this `keyid` (empty for new keys).
4. `mpc-protocol::KeyGenSession::start(...)` — runs DKG rounds with messages exchanged over NATS subjects above.
5. On success each `party-agent` stores its secret share encrypted and emits an audit event `KeyGenerated{key_id, public_key, party_id}`.

---

### 7. Signing (MPC Sign) flow (concrete)

1. Submit a transaction to `orchestrator` → orchestrator validates against `policy` (policy engine).
2. If policy passes, orchestrator creates `sign_session` and publishes `mpc.sign.{txid}.start`.
3. Parties receive `start`, run `mpc-protocol::SignSession::prepare(...)` which performs pre-sign rounds (nonce generation, commitments).
4. Exchange signing round messages over `mpc.sign.{txid}.party.{id}` subjects. Each party verifies ZK proofs and message authenticity per protocol.
5. After final round, each party produces a signature share; orchestrator (or one party, depending on protocol) aggregates partial signature shares into canonical ECDSA signature.
6. Coordinator returns signature to operator; transaction broadcast.

Security note: never reconstruct the private key; only reconstruct the signature.

---

### 8. Storage, HSM & secure share handling

Interfaces:

```rust
#[async_trait]
pub trait SecretStore {
    async fn put_share(&self, key_id: &str, share: &[u8]) -> Result<()>;
    async fn get_share(&self, key_id: &str) -> Result<Vec<u8>>;
    async fn delete_share(&self, key_id: &str) -> Result<()>;
}
```

Implementations:

* `EncryptedFileStore` — encrypt with `age` or with an AEAD key held in local secure enclave or OS keystore.
* `HsmStore` — uses `pkcs11` crate or vendor SDK to store share or perform private operations inside HSM. If HSM supports only single-key ops, use it to encrypt share keys or seal ephemeral keys.

Backups:

* Escrow encrypted backups split into Shamir shares stored in separate locations/parties.
* Recovery flow: use a quorum of recovery parties to reconstruct share.

---

### 9. Access Control, Authentication & Audit

* **AuthN**: mTLS certs or NATS creds per party. Rotate certs periodically. Use short-lived operator tokens for API access.
* **AuthZ**: orchestrator enforces role-based rules (operator, auditor, approver).
* **Audit**: append-only ledger of protocol events (session started, rounds completed, approvals). Use Kafka or write-only DB and sign each audit record with an operational key for tamper evidence.

---

### 10. Recovery & Rotation

* **Rotation**: proactive resharing (reshare protocol) without changing public key (proactive security). Use `mpc-protocol::ReshareSession`.
* **Key rotation**: if changing the public key is needed, run full DKG and update policies.
* **Party join/leave**: use reshare to move to new `n,t` set. Require higher threshold for join/leave approval to avoid malicious replacement.
* **Loss recovery**: have a key escrow (encrypted shares) split among independent recovery parties; recover via threshold restore process.

---

### 11. Transaction policy examples

Policy DSL examples:

* `Threshold = 3 of 5`
* `DailyLimit: { coin: BTC, amount: 100.0 }`
* `RequireRoleApprovals: ["treasury_head", "compliance"]`
* `TimeLock`: approvals must be gathered within 24 hours else re-authorization required.

Enforce policy before starting sign session.

---

### 12. Testing, audits & hardening

* **Unit tests** for protocol state transitions (simulate dropped messages, replays).
* **Integration tests** with `n` local party-agents using in-memory NATS.
* **Fuzzing** on messages and ZK-proof bytes.
* **Formal review** of cryptographic implementation by external cryptographers/security firm.
* **Pen tests** and red-team (particularly around messaging & replay attacks).
* **Run BFS on known vulnerabilities** and track crate advisories.

---

### 13. Example code snippets

`Cargo.toml` (top-level dependencies)

```toml
[dependencies]
tokio = { version = "1", features = ["rt-multi-thread","macros"] }
async-nats = "0.42"      # NATS async client
serde = { version = "1", features = ["derive"] }
prost = "0.11"           # if using protobufs
k256 = "0.11"            # secp256k1 primitives
zeroize = "1.5"
tracing = "0.1"
anyhow = "1.0"
```

Minimal NATS pub/sub helper (async):

```rust
use async_nats::ConnectOptions;
use prost::Message;
use tokio::time::{timeout, Duration};

pub async fn connect_nats(endpoint:&str, creds_path: Option<&str>) -> anyhow::Result<async_nats::Client> {
    let client = if let Some(creds) = creds_path {
        ConnectOptions::with_credentials(creds).connect(endpoint).await?
    } else {
        async_nats::connect(endpoint).await?
    };
    Ok(client)
}

pub async fn publish_envelope(client: &async_nats::Client, subject: &str, data: &[u8]) -> anyhow::Result<()> {
    client.publish(subject.into(), data.into()).await?;
    Ok(())
}
```

Stub for starting a sign session in party-agent:

```rust
async fn handle_start_sign(session_id: String, tx: Transaction) -> anyhow::Result<()> {
    // 1) Validate operator signature & policy locally
    // 2) Initiate sign session in mpc-protocol crate
    let mut session = mpc_protocol::SignSession::new(session_id, tx)?;
    loop {
        let outgoing = session.next_message().await?;
        // send outgoing bytes to session subject for other parties
        publish_envelope(&client, &format!("mpc.sign.{}.broadcast", session.session_id()), &outgoing).await?;
        if session.is_finished() { break; }
    }
    let signature = session.final_signature()?;
    // return signature to orchestrator (via NATS or API)
    Ok(())
}
```

(These are skeletons — real production code will wire in ZK verification, error handling, retries, timeouts, and secure memory handling.)

---

### 14. Security trade-offs & practical notes

* **Use audited crates** (DFNS CGGMP24, ZenGo-X, CGGMP24) — avoid rolling your own cryptography. ([dfns.co][1], [GitHub][2])
* **Performance**: threshold ECDSA is more expensive than single-key ECDSA; benchmark `k256` vs libsecp FFI. ([GitHub][11], [the iqlusion blog on Svbtle][9])
* **Attacks to watch**: replay attacks, message tampering, rogue-key attacks. Ensure protocol proofs and binding to session IDs.
* **Transport**: NATS is fast but requires careful setup (mTLS, creds, account limits). ([Crates.io][3], [Docs.rs][4])

---

### 15. Deployment checklist

* Pick and vendor-lock chosen threshold crate after security review.
* Build Docker images for `party-agent` with minimal OS surface and seccomp.
* Deploy NATS cluster with TLS, accounts, and monitoring.
* Provision HSMs or secure enclaves per party if required.
* Run integration testnet with simulated failures (network partition, message loss).
* Schedule third-party crypto audit.

---

### 16. Next steps (practical implementation plan — 6 milestones)

1. **Prototype**: wire `party-agent` + `orchestrator` using `multi-party-ecdsa` or `CGGMP24` in a local NATS test cluster. Implement EncryptedFileStore.
2. **Integration tests**: 3-of-5 signing and keygen tests, simulate recovery and rotation.
3. **Security review**: get a crypto audit on protocol usage and implementation.
4. **HSM integration**: implement `HsmStore` and test key sealing/unsealing.
5. **Policy engine & UI**: operator workflows and approval flows.
6. **Production rollout**: harden, monitor, and staged rollout.

---

### 17. Useful references & starting points

* ZenGo-X `multi-party-ecdsa` (Rust). ([GitHub][2])
* DFNS CGGMP24 Rust implementation / write-up (production & audit note). ([dfns.co][1])
* `async-nats` crate docs (NATS Rust client). ([Crates.io][3], [Docs.rs][10])
* `k256` crate (secp256k1 pure-Rust). ([Docs.rs][8], [Crates.io][12])

---

## MPC over NATS architecture

- Run your own private NATS cluster (not public NGS) for security.

- Each node:

  - Connects via mTLS (certs signed by your CA).

  - Subscribes to a subject named after its ID (mpc.node.\<id>).

  - Publishes MPC messages directly to the recipient’s subject.

- For group broadcasts: use a shared subject (mpc.round.\<round_id>).

- Add application-level AEAD encryption (ChaCha20-Poly1305 or AES-GCM) per MPC message so that even if NATS is compromised, contents stay secret.

Example:

- Node A → publishes encrypted share to mpc.node.2.

- Node B → has subscription to mpc.node.2, receives it, decrypts, processes.

- For broadcast (e.g., commitments), Node A → publishes to mpc.round.5, all nodes subscribed get it.

---

## Key Share Storage Best Practices

Example:

Party A: Stores its share inside AWS KMS/HSM, with no export permission.

Party B: Stores its share in Azure HSM.

Party C: Runs inside an Intel SGX enclave on-premises.

Each share is encrypted at rest, protected by per-party infrastructure, and only accessible by the MPC runtime.

[1]: https://www.dfns.co/article/cggmp21-in-rust-at-last?utm_source=chatgpt.com "CGGMP21 In Rust, At Last"
[2]: https://github.com/ZenGo-X/multi-party-ecdsa?utm_source=chatgpt.com "ZenGo-X/multi-party-ecdsa: Rust implementation of {t,n}"
[3]: https://crates.io/crates/async-nats?utm_source=chatgpt.com "async-nats - crates.io: Rust Package Registry"
[4]: https://docs.rs/nats/latest/nats/struct.Options.html?utm_source=chatgpt.com "Options in nats - Rust"
[5]: https://crates.io/crates/CGGMP24?utm_source=chatgpt.com "CGGMP24 - crates.io: Rust Package Registry"
[6]: https://github.com/axelarnetwork/tofn?utm_source=chatgpt.com "axelarnetwork/tofn: A threshold cryptography library in Rust"
[7]: https://github.com/boltlabs-inc/tss-ecdsa?utm_source=chatgpt.com "boltlabs-inc/tss-ecdsa: An implementation of a threshold ..."
[8]: https://docs.rs/k256?utm_source=chatgpt.com "k256 - Rust"
[9]: https://iqlusion.blog/k256-crate-pure-rust-projective-secp256k1-library?utm_source=chatgpt.com "a pure Rust secp256k1 library based on projective formulas"
[10]: https://docs.rs/nats?utm_source=chatgpt.com "nats - Rust"
[11]: https://github.com/tarcieri/rust-secp256k1-ecdsa-bench?utm_source=chatgpt.com "Rust secp256k1 ECDSA benchmarks"
[12]: https://crates.io/crates/k256?utm_source=chatgpt.com "k256 - crates.io: Rust Package Registry"

---
sidebar_position: 2
---

Below is a pragmatic pattern for application‑level AEAD for an MPC system over NATS:

Core goals:
- Pairwise (or group) secure channels layered above NATS subjects
- Forward secrecy via ephemeral X25519 ECDH + HKDF
- Explicit AAD binding (session id, round, party ids, algorithm)
- Framed messages (version, cipher, session id, counter, lengths)
- Replay protection (monotonic counter store)
- Periodic rekey / key rotation
- Separation of signing (authN) and AEAD (conf+auth)

Design outline:
1. Identity keys: Long‑term Ed25519 (sign) + ephemeral X25519 (KEX).
2. Handshake:
- Each party publishes its ephemeral public key on a control subject.
- After all are collected, derive a master_secret (e.g. concat sorted shared secrets; or pairwise for scalability).
- HKDF(master_secret, info=sorted_party_ids||protocol_label) → base key material.
3. Session keys:
- For pairwise: derive per (A,B) sub-key using HKDF with info = "PAIR"+"A|B".
- For group broadcast: derive group key with info = "GROUP".
4. AEAD session object (like existing `AeadSession`) manages:
- session_id (random 4 bytes)
- atomic counter (nonce suffix)
- key bytes
5. AAD content example: version || session_id || round || sender_party_id || algorithm_tag
6. Replay:
- Keep highest counter seen per (session_id, sender). Reject lower or duplicate.
7. Rotation:
- Trigger after N messages or time T or near counter wrap. Perform fresh ephemeral ECDH and rebuild sessions.
8. NATS subjects:
- Control / handshake: mpc.ctrl.\<session_uuid>
- Pairwise encrypted: mpc.sec.pair.\<A>.\<B>
- Group broadcast: mpc.sec.group.\<group_id>
9. Signing:
- Sign the plaintext metadata header (or handshake payload) with Ed25519 to authenticate before AEAD encryption for defense in depth.

Code sketch (simplified) showing: handshake aggregation, session derivation, send/receive with AEAD wrapper. Omitted: error handling details, persistence, batching.

```rust
use std::{collections::HashMap, sync::{Arc, RwLock}};
use anyhow::Result;
use rand::RngCore;
use hkdf::Hkdf;
use sha2::Sha256;
use x25519_dalek::{PublicKey as XPublic, StaticSecret as XSecret};
use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use async_nats::{Client, Message};
use zeroize::Zeroize;

const AAD_VERSION: u8 = 1;
const CIPHER_CHACHA20: u8 = 1;

#[derive(Clone)]
pub struct PartyId(pub String);

pub struct HandshakeBundle {
    pub party_id: PartyId,
    pub eph_pub: [u8; 32],
    pub sig: Signature,
}

pub struct CryptoIdentity {
    sign_sk: SigningKey,
    sign_vk: VerifyingKey,
    x_secret: XSecret,
    x_public: XPublic,
}

impl CryptoIdentity {
    pub fn new(sign_sk: SigningKey) -> Self {
        let sign_vk = sign_sk.verifying_key();
        let x_secret = XSecret::new(rand::rngs::OsRng);
        let x_public = XPublic::from(&x_secret);
        Self { sign_sk, sign_vk, x_secret, x_public }
    }
    pub fn handshake_advert(&self, me: &PartyId) -> HandshakeBundle {
        let mut msg = Vec::new();
        msg.extend_from_slice(me.0.as_bytes());
        msg.extend_from_slice(self.x_public.as_bytes());
        let sig = self.sign_sk.sign(&msg);
        HandshakeBundle { party_id: me.clone(), eph_pub: *self.x_public.as_bytes(), sig }
    }
}

pub struct AeadSession {
    cipher: u8,
    session_id: [u8;4],
    counter: u64,
    key: Vec<u8>,
}

impl Drop for AeadSession {
    fn drop(&mut self) { self.key.zeroize(); }
}

impl AeadSession {
    pub fn new(cipher: u8, key: Vec<u8>) -> Self {
        let mut sid = [0u8;4];
        rand::rngs::OsRng.fill_bytes(&mut sid);
        Self { cipher, session_id: sid, counter: 0, key }
    }
    fn next_counter(&mut self) -> u64 {
        let c = self.counter;
        self.counter += 1;
        c
    }
    fn nonce(&self, counter: u64) -> [u8;12] {
        let mut n=[0u8;12];
        n[..4].copy_from_slice(&self.session_id);
        n[4..].copy_from_slice(&counter.to_be_bytes());
        n
    }
    pub fn encrypt(&mut self, plaintext: &[u8], aad_ctx: &[u8]) -> Result<Vec<u8>> {
        let cnt = self.next_counter();
        let nonce = self.nonce(cnt);
        // Using chacha20poly1305
        use chacha20poly1305::{ChaCha20Poly1305, aead::{Aead, KeyInit}, Key, Nonce};
        let key = Key::from_slice(&self.key);
        let aead = ChaCha20Poly1305::new(key);
        let ct = aead.encrypt(Nonce::from_slice(&nonce), chacha20poly1305::aead::Payload {
            msg: plaintext,
            aad: aad_ctx
        })?;
        // Frame: [ver][cipher][sid4][counter8][aad_len2][ct_len4][aad][ct]
        let mut out = Vec::with_capacity(1+1+4+8+2+4+aad_ctx.len()+ct.len());
        out.push(AAD_VERSION);
        out.push(self.cipher);
        out.extend_from_slice(&self.session_id);
        out.extend_from_slice(&cnt.to_be_bytes());
        out.extend_from_slice(&(aad_ctx.len() as u16).to_be_bytes());
        out.extend_from_slice(&(ct.len() as u32).to_be_bytes());
        out.extend_from_slice(aad_ctx);
        out.extend_from_slice(&ct);
        Ok(out)
    }
    pub fn decrypt(&self, frame: &[u8], expected_aad_prefix: &[u8]) -> Result<(Vec<u8>, u64)> {
        if frame.len() < 1+1+4+8+2+4 { anyhow::bail!("short"); }
        let mut i=0;
        if frame[i] != AAD_VERSION { anyhow::bail!("ver"); } i+=1;
        if frame[i] != self.cipher { anyhow::bail!("cipher"); } i+=1;
        if &frame[i..i+4] != &self.session_id { anyhow::bail!("sid"); } i+=4;
        let counter = u64::from_be_bytes(frame[i..i+8].try_into()?); i+=8;
        let aad_len = u16::from_be_bytes(frame[i..i+2].try_into()? ) as usize; i+=2;
        let ct_len = u32::from_be_bytes(frame[i..i+4].try_into()? ) as usize; i+=4;
        if frame.len() < i+aad_len+ct_len { anyhow::bail!("trunc"); }
        let aad = &frame[i..i+aad_len]; i+=aad_len;
        let ct = &frame[i..i+ct_len];
        if !aad.starts_with(expected_aad_prefix) { anyhow::bail!("aad mismatch"); }
        let nonce = self.nonce(counter);
        use chacha20poly1305::{ChaCha20Poly1305, aead::{Aead, KeyInit}, Key, Nonce};
        let key = Key::from_slice(&self.key);
        let aead = ChaCha20Poly1305::new(key);
        let pt = aead.decrypt(Nonce::from_slice(&nonce), chacha20poly1305::aead::Payload {
            msg: ct,
            aad
        })?;
        Ok((pt, counter))
    }
}

pub struct SessionStore {
    // key: channel id (pairwise or group)
    map: RwLock<HashMap<String, AeadSession>>,
    highest: RwLock<HashMap<String, u64>>, // replay tracking
}

impl SessionStore {
    pub fn new() -> Self {
        Self {
            map: RwLock::new(HashMap::new()),
            highest: RwLock::new(HashMap::new()),
        }
    }
    pub fn insert(&self, chan: String, sess: AeadSession) {
        self.map.write().unwrap().insert(chan, sess);
    }
    pub fn encrypt(&self, chan: &str, aad: &[u8], pt: &[u8]) -> Result<Vec<u8>> {
        let mut guard = self.map.write().unwrap();
        let sess = guard.get_mut(chan).ok_or_else(|| anyhow::anyhow!("no session"))?;
        sess.encrypt(pt, aad)
    }
    pub fn decrypt(&self, chan: &str, frame: &[u8], expect_aad_prefix: &[u8]) -> Result<Vec<u8>> {
        let guard = self.map.read().unwrap();
        let sess = guard.get(chan).ok_or_else(|| anyhow::anyhow!("no session"))?;
        let (pt, counter) = sess.decrypt(frame, expect_aad_prefix)?;
        let mut h = self.highest.write().unwrap();
        let hi = h.entry(chan.to_string()).or_insert(0);
        if counter < *hi { anyhow::bail!("replay"); }
        if counter == *hi { anyhow::bail!("dup"); }
        *hi = counter;
        Ok(pt)
    }
}

// Derive a base key from collected handshakes (group mode)
pub fn derive_group_key(bundles: &[HandshakeBundle]) -> Result<Vec<u8>> {
    // For simplicity: concatenate sorted pub keys; in production use pairwise shared secrets & KDF tree
    let mut pubs: Vec<&[u8]> = bundles.iter().map(|b| &b.eph_pub[..]).collect();
    pubs.sort();
    let mut material = Vec::new();
    for p in pubs { material.extend_from_slice(p); }
    let hk = Hkdf::<Sha256>::new(None, &material);
    let mut okm = vec![0u8; 32];
    hk.expand(b"mpc-group-key-v1", &mut okm).map_err(|_| anyhow::anyhow!("hkdf fail"))?;
    Ok(okm)
}

// Example send (pairwise)
pub async fn send_pairwise(nc: &Client, store: Arc<SessionStore>, a: &PartyId, b: &PartyId, round: u32, payload: &[u8]) -> Result<()> {
    let chan = format!("pair:{}:{}", a.0, b.0);
    let aad = build_aad(a, round);
    let frame = store.encrypt(&chan, &aad, payload)?;
    let subj = format!("mpc.sec.pair.{}.{}", a.0, b.0);
    nc.publish(subj, frame.into()).await?;
    Ok(())
}

fn build_aad(sender: &PartyId, round: u32) -> Vec<u8> {
    let mut v = Vec::with_capacity(1 + sender.0.len() + 4);
    v.push(0x01); // AAD schema version
    v.extend_from_slice(sender.0.as_bytes());
    v.extend_from_slice(&round.to_be_bytes());
    v
}

pub async fn recv_pairwise(store: Arc<SessionStore>, a: &PartyId, b: &PartyId, msg: &Message) -> Result<Vec<u8>> {
    let chan = format!("pair:{}:{}", a.0, b.0);
    let prefix = [0x01u8]; // expect AAD version prefix
    store.decrypt(&chan, &msg.payload, &prefix)
}
```

Key rotation:
- Re-run ephemeral X25519 exchange
- Derive fresh keys
- Call `AeadSession::new` and replace in `SessionStore`
- Invalidate old session after grace window

Hardening suggestions:
- Use constant-time compares (`subtle`) for IDs
- Limit frame size and enforce max
- Add timestamp / round window checks
- Consider per-message ephemeral key (heavier) if stronger Forward Secrecy required
- Add optional post-quantum KEM hybrid later

This pattern layers cleanly over NATS without modifying transport while providing deterministic nonce construction and replay defense.
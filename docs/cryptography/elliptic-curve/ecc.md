# Elliptic Curve Cryptography

---

## 1. What is ECC?

Elliptic Curve Cryptography is a form of **public-key cryptography** based on the mathematics of elliptic curves over finite fields.

* Like RSA, it allows **key exchange**, **digital signatures**, and **encryption**.
* But ECC achieves the same level of security with **much smaller key sizes**.

   * RSA 3072-bit ≈ ECC 256-bit security.

---

## 2. Elliptic Curve Basics
An elliptic curve is defined by an equation of the form:

$$
y^2 = x^3 + ax + b \quad \text{over a finite field } \mathbb{F}_p
$$

* Let $(a,b)$ are constants chosen such that the curve has no singularities (i.e., $4a^3 + 27b^2 \neq 0$).
* $\mathbb{F}_p$ means calculations are done modulo a prime $p$.

Each point $(x,y)$ on this curve, plus a special point at infinity, form an **abelian group** under an operation called **point addition**.

---

## 3. Group Operation

ECC works because we can define arithmetic on curve points:

* **Point addition:** Given two points $P$ and $Q$, we can compute $R = P + Q$.
* **Point doubling:** If $P = Q$, then $R = 2P$.
* **Scalar multiplication:** $kP = P + P + \dots + P$ (k times).

This scalar multiplication is **easy to compute** but **hard to reverse**.
The hard problem is called the **Elliptic Curve Discrete Logarithm Problem (ECDLP)**: given $P$ and $Q = kP$, find $k$. This is the foundation of ECC security.

---

## 4. Cryptographic Applications

ECC is used in many protocols:

* **Key Exchange (ECDH):** Two parties exchange points and derive a shared secret.
* **Digital Signatures (ECDSA, EdDSA):** Prove ownership of a private key without revealing it.
* **Encryption (ECIES):** Encrypt data using public keys on elliptic curves.

---

## 5. Example: ECDH Key Exchange

1. Public parameters: curve $E$, generator point $G$.
2. Alice chooses private key $a$, computes public key $A = aG$.
3. Bob chooses private key $b$, computes public key $B = bG$.
4. Alice computes shared secret: $S = aB = a(bG)$.
5. Bob computes shared secret: $S = bA = b(aG)$.
   Both derive the same secret $S = abG$, but no outsider can compute it without solving ECDLP.

---

## 6. Common Curves

* **secp256k1** → used in Bitcoin and Ethereum.
* **Curve25519** → used in Signal, TLS, SSH (favored for speed and security).
* **P-256 (secp256r1)** → standardized by NIST.

# ECDSA (Elliptic Curve Digital Signature Algorithm)

---

## 1. Background: What is ECDSA?

ECDSA is a **digital signature algorithm** based on **Elliptic Curve Cryptography (ECC)**.

* It’s used to **sign messages** (prove authenticity) and **verify signatures** (prove origin & integrity).
* Widely used in **Bitcoin, Ethereum, TLS certificates, SSH, JWTs**, etc.
* Its security is based on the hardness of the **Elliptic Curve Discrete Logarithm Problem (ECDLP)**.

---

## 2. Key Concepts You Need First

### (a) Finite Fields

Cryptography works over **finite fields** (like modular arithmetic).
For example:

```
In mod 7:
  3 + 5 ≡ 1 (mod 7)
  3 × 5 ≡ 1 (mod 7)
```

### (b) Elliptic Curves

An elliptic curve is defined by an equation like:

Demo: [Elliptic Curves](/cryptography/elliptic-demo)

```
y² = x³ + ax + b (mod p)
```


where `p` is a prime (so we’re in a finite field).

These curves aren’t circles/ellipses — instead, they form a **special set of points** with useful math properties.

### (c) Group Law (Point Addition)

On elliptic curves, we define:

* **Point addition**: adding two points gives another point on the curve.
* **Scalar multiplication**: repeating addition many times (like multiplication in normal math).

This operation is **easy one way**, but **hard to reverse** — the basis of ECC security.

---

## 3. ECDSA Key Generation

1. Choose a standard elliptic curve (like **secp256k1** in Bitcoin).
2. Pick a random private key `d` (a number in `[1, n-1]`, where `n` is the order of the curve).
3. Compute public key `Q = d × G`, where `G` is the generator point on the curve.

So:

* **Private key** = number `d`
* **Public key** = point `Q`

---

## 4. Signing a Message

To sign a message `m` with private key `d`:

1. Compute hash: `z = HASH(m)` (SHA-256, for example).
2. Pick a random number `k` (nonce, must be secret & unique).
3. Compute point: `R = k × G`, let `r = R.x mod n`.

    * If `r = 0`, restart.
4. Compute: `s = k⁻¹ (z + r·d) mod n`.

    * If `s = 0`, restart.
5. Signature = pair `(r, s)`.

---

## 5. Verifying a Signature
To verify `(r, s)` against message `m` and public key `Q`:

1. Check `r, s` are in range `[1, n-1]`.
2. Compute hash: `z = HASH(m)`.
3. Compute inverse: `w = s⁻¹ mod n`.
4. Compute:
   * $u_1 = zw \mod n$
   * $u_2 = rw \mod n$
   * $X = u_1 G + u_2 Q$.

   Let `x = X.x mod n`.
5. Signature valid if `x = r`.

🔑 **Key weakness:** If $k$ is ever reused or leaked → private key $d$ can be recovered (this happened in Bitcoin/PS3 hacks).

---

## 6. Why ECDSA Works

* Signing equation: `s = k⁻¹(z + r·d)`
* Verification recombines `G` and `Q` so that the only way `r` matches is if the signer knew `d`.
* Security: Breaking ECDSA means solving **ECDLP**, which is computationally infeasible.

---

## 7. Implement in java

### Step 1: Define a Small Finite Field and Curve

$$
y^2 \equiv x^3 + ax + b \pmod{p}
$$

For simplicity:

* $p = 17$ (prime modulus)
* Curve: $y^2 = x^3 + 2x + 2 \ (\text{mod } 17)$
* Generator point $G = (5, 1)$
* Order (n) = 19 (we’ll just pick a small prime for the cycle length)

```python
# Finite field modulo
p = 17  

# Curve parameters: y^2 = x^3 + ax + b (mod p)
a, b = 2, 2

# Generator point
G = (5, 1)
n = 19  # order of the generator (for toy curve)
```

---

### Step 2. Modular Inverse (needed for division)

We’ll use the **extended Euclidean algorithm** to compute inverses mod p.

```python
def modinv(k, p):
    """Modular inverse using Extended Euclidean Algorithm"""
    if k == 0:
        raise ZeroDivisionError("division by zero")
    return pow(k, -1, p)  # Python 3.8+ supports this
```

---

### Step 3. Point Addition on the Curve

We need point addition and doubling.

```python
def point_add(P, Q):
    if P is None: return Q
    if Q is None: return P
    
    (x1, y1) = P
    (x2, y2) = Q
    
    if x1 == x2 and (y1 != y2 or y1 == 0):
        return None  # point at infinity
    
    if P == Q:
        # slope = (3*x1^2 + a) / (2*y1)
        m = (3 * x1 * x1 + a) * modinv(2 * y1, p) % p
    else:
        # slope = (y2 - y1) / (x2 - x1)
        m = (y2 - y1) * modinv(x2 - x1, p) % p
    
    x3 = (m * m - x1 - x2) % p
    y3 = (m * (x1 - x3) - y1) % p
    
    return (x3, y3)
```

---

# Step 4. Scalar Multiplication

Multiply a point by an integer (repeated addition).

```python
def scalar_mult(k, P):
    R = None
    while k > 0:
        if k & 1:
            R = point_add(R, P)
        P = point_add(P, P)
        k >>= 1
    return R
```

---

# Step 5. Key Generation

Pick random private key $d$, compute public key $Q = d·G$.

```python
import random

def generate_keypair():
    d = random.randrange(1, n)   # private key
    Q = scalar_mult(d, G)        # public key
    return d, Q
```

---

# Step 6. ECDSA Signing

Follow the ECDSA signing steps.

```python
def sign(m, d):
    z = m % n  # pretend "hash" is just m mod n
    while True:
        k = random.randrange(1, n)
        R = scalar_mult(k, G)
        r = R[0] % n
        if r == 0:
            continue
        s = (modinv(k, n) * (z + r * d)) % n
        if s == 0:
            continue
        return (r, s)
```

---

# Step 7. ECDSA Verification

Verify a signature.

```python
def verify(m, sig, Q):
    r, s = sig
    if not (1 <= r < n and 1 <= s < n):
        return False
    z = m % n
    w = modinv(s, n)
    u1 = (z * w) % n
    u2 = (r * w) % n
    X = point_add(scalar_mult(u1, G), scalar_mult(u2, Q))
    if X is None:
        return False
    return (X[0] % n) == r
```

---

# Step 8. Test It Out

```python
# Key generation
d, Q = generate_keypair()
print("Private key:", d)
print("Public key:", Q)

# Sign a message
m = 13  # pretend message = 13
sig = sign(m, d)
print("Signature:", sig)

# Verify
print("Valid?", verify(m, sig, Q))
```

---

✅ This should output something like:

```
Private key: 7
Public key: (0,6)
Signature: (10, 4)
Valid? True
```

---

# 2. ECDSA (Elliptic Curve Digital Signature Algorithm)

### Signing a message

1. Hash the message: $z = H(m)$.
2. Choose a random integer $k$ (ephemeral secret, must be unique and hidden).
3. Compute the point $R = kG$.

   * Let $r = x(R) \mod n$ (use the x-coordinate).
   * If $r = 0$, restart.
4. Compute $s = k^{-1}(z + rd) \mod n$.

   * If $s = 0$, restart.
5. Signature is the pair $(r, s)$.

### Verifying a signature



---

# 3. Schnorr Signatures (cleaner alternative)

Schnorr is mathematically simpler and has nice properties (linear, provably secure under discrete log).

### Signing

1. Hash the message: $z = H(m)$.
2. Choose random nonce $k$.
3. Compute $R = kG$.
4. Compute challenge $e = H(R \parallel Q \parallel z)$.
5. Compute response $s = k + ed \mod n$.
6. Signature is $(R, s)$.

### Verifying

Given signature $(R, s)$:

1. Compute $e = H(R \parallel Q \parallel z)$.
2. Check if $sG = R + eQ$.

   * If true, signature is valid.

🔑 **Advantages over ECDSA:**

* Simpler math.
* No fragile dependency on $k^{-1}$.
* Supports **batch verification** (verify many sigs at once).
* Enables **signature aggregation** (combine many sigs into one). → This is why Bitcoin Taproot adopted Schnorr.

---

# 4. Side-by-Side Comparison

| Feature          | ECDSA                        | Schnorr                             |
| ---------------- | ---------------------------- | ----------------------------------- |
| Complexity       | More steps, fragile with $k$ | Very clean & simple                 |
| Security proof   | Heuristic                    | Provable under ECDLP                |
| Multi-signatures | Awkward                      | Natural & efficient                 |
| Adoption         | Widely used (Ethereum, TLS)  | Growing (Bitcoin Taproot, research) |

---

# 5. Next Step for You

Since you’re a blockchain engineer, the most useful practice is:

* Implement **ECDSA** (sign + verify) on `secp256k1` (Bitcoin curve).
* Implement **Schnorr** on the same curve.
* Compare how they behave with real messages.

---

Would you like me to **show you code examples** (Python or Rust) for:

1. ECDSA sign/verify, and
2. Schnorr sign/verify
   so you can see the math in action?

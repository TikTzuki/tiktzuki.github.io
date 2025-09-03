# SECP256k1

# 1. What is secp256k1?

It’s a **Koblitz curve** defined over a **256-bit prime field**.
Equation:

$$
y^2 \equiv x^3 + 7 \ (\text{mod } p)
$$

where

* **Prime modulus**

```latex
p = FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE FFFFFC2F
```

$$
= 2^{256} - 2^{32} - 2^{9} - 2^{8} - 2^{7} - 2^{6} - 2^{4} - 1
$$

* **Curve parameters**

  $$
  a = 0, \quad b = 7
  $$

* **Generator point (G)**
  G has fixed coordinates:

  ```
  Gx = 55066263022277343669578718895168534326250603453777594175500187360389116729240
  Gy = 32670510020758816978083085130507043184471273380659243275938904335757337482424
  ```

* **Order of G** (n)

  ```
  n = FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141
    = 115792089237316195423570985008687907852837564279074904382605163141518161494337
  ```

So all operations (addition, multiplication) are done **mod p**.

---

# 2. Keys

* **Private key (d):** a random integer in `[1, n-1]`.
* **Public key (Q):**

  $$
  Q = d \times G
  $$

This is **hard to reverse** because of the **Elliptic Curve Discrete Logarithm Problem**.

---

# 3. Signing with secp256k1

To sign a message `m`:

1. Hash the message with SHA-256 → `z`.
2. Pick a random `k` (nonce, must never repeat).
3. Compute `R = k·G`, take `r = R.x mod n`.

    * If `r = 0`, retry.
4. Compute

   $$
   s = k^{-1}(z + r·d) \ (\text{mod } n)
   $$

    * If `s = 0`, retry.
5. Signature = `(r, s)`.

---

# 4. Verifying

Given `(r, s)`, public key `Q`, and message `m`:

1. Compute `z = SHA256(m)`.
2. Compute `w = s^{-1} mod n`.
3. Compute:

   ```
   u1 = z * w mod n
   u2 = r * w mod n
   X = u1·G + u2·Q
   ```
4. If `X = ∞`, reject.
5. If `X.x mod n == r`, signature is valid.

---

# 5. Python Implementation with `ecdsa`

You don’t need to re-implement point math by hand — the [`ecdsa`](https://pypi.org/project/ecdsa/) library handles secp256k1 directly.

```python
from ecdsa import SigningKey, SECP256k1
import hashlib

# Generate key pair
sk = SigningKey.generate(curve=SECP256k1)  # private key
vk = sk.verifying_key  # public key

print("Private key:", sk.to_string().hex())
print("Public key:", vk.to_string("compressed").hex())

# Message to sign
message = b"Hello, secp256k1!"
z = hashlib.sha256(message).digest()

# Sign
signature = sk.sign(z)
print("Signature:", signature.hex())

# Verify
print("Valid?", vk.verify(signature, z))
```

---

# 6. Example Output

```
Private key: 4b8d...c12a
Public key: 0298...bcf4
Signature: 3045...0221
Valid? True
```

---

# 7. Applications

* **Bitcoin/Ethereum wallets**:
  Your private key = `d`.
  Public key `Q` → hashed → address.
  Transactions are signed with ECDSA on secp256k1.

* **Blockchain consensus**:
  Nodes verify signatures to ensure authenticity of messages.

---
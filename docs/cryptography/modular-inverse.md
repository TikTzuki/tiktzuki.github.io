---
sidebar_position: 1
---

# Modular Inverse & Extended Euclidean Algorithm

For integers $a$ and $m$:

* The **modular inverse** of $a$ modulo $m$ is an integer $x$ such that:

$$
a \cdot x \equiv 1 \pmod{m}
$$

* This means when you multiply $a$ by $x$, divide by $m$, the remainder is **1**.

* Not all numbers have inverses.
  $a$ has an inverse modulo $m$ **only if** $\gcd(a, m) = 1$ (they are coprime).

---

## Example

Find the inverse of $3 \pmod{7}$:

We need $3 \cdot x \equiv 1 \pmod{7}$.

Try values of $x$:

* $3 \times 5 = 15 \equiv 1 \pmod{7}$ ✅

So the inverse is:

$$
3^{-1} \equiv 5 \pmod{7}
$$

---

## Extended Euclidean algorithm

The **Euclidean Algorithm** finds the greatest common divisor (gcd) of two integers $a$ and $b$:

$$
\gcd(a, b)
$$

It repeatedly divides and takes remainders until the remainder is 0.

The **Extended Euclidean Algorithm** goes further: it finds integers $x, y$ such that:

$$
a \cdot x + b \cdot y = \gcd(a, b)
$$

These integers $x$ and $y$ are called **Bezout coefficients**.

👉 When $\gcd(a, m) = 1$, the coefficient $x$ is the **modular inverse** of $a \pmod{m}$.

---

### 2. Algorithm (Step-by-Step)

Given $a$ and $b$:

1. Perform Euclidean Algorithm (repeated division):

   $$
   a = q \cdot b + r
   $$

   Keep track of quotients and remainders.

2. Work backwards (substitution) to express gcd as a combination of $a$ and $b$.

3. The coefficient in front of $a$ is its modular inverse (mod $b$), if gcd = 1.

---

### 3. Example: Find inverse of $3 \pmod{7}$

We want $x$ such that:

$$
3x \equiv 1 \pmod{7}
$$

That means solve:

$$
3x + 7y = 1
$$

#### Step 1: Euclidean Algorithm

$$
7 = 2 \cdot 3 + 1
$$

$$
3 = 3 \cdot 1 + 0
$$

So $\gcd(3, 7) = 1$.

#### Step 2: Work backwards

From first step:

$$
1 = 7 - 2 \cdot 3
$$

So:

$$
1 = (-2) \cdot 3 + 1 \cdot 7
$$

Here:

* $x = -2$
* $y = 1$

#### Step 3: Modular inverse

So:

$$
3 \cdot (-2) + 7 \cdot (1) = 1
$$

$-2$ is the coefficient of $3$.
Modulo 7:

$$
-2 \equiv 5 \pmod{7}
$$

✅ Therefore, the inverse is:

$$
3^{-1} \equiv 5 \pmod{7}
$$

---

## 4. General Algorithm (Compact Form)

```
function extended_gcd(a, b):
    if b == 0:
        return (a, 1, 0)   # gcd, x, y
    gcd, x1, y1 = extended_gcd(b, a mod b)
    x = y1
    y = x1 - (a // b) * y1
    return (gcd, x, y)
```

If gcd = 1, then `x` is the modular inverse of `a mod b`.

---

Do you want me to also **draw a tree-style diagram** that shows how the substitutions work step by step (kind of like a flowchart), so it’s easier to see the backward substitution?

---


Generate private key in secure way:

Using deno we add additional security layer (no net and unfiltered disk access).
Using minimal dependencies (ethers 6.14.4), code safer to run.
Malicious code would have hard time to breach additional deno defenses.

### 1. Install deno if you don't have it yet: 

https://deno.land/manual/getting_started/installation

### 2. In this folder run ```deno install```

### 3. Optionally set password in env:

you can generate password using:

```
deno --allow-env random.ts
```

or any other method, but it has to be at least 10 characters long and contain 
at least one uppercase letter, one lowercase letter, one digit.

linux:
```
export KEYSTORE_PASSWORD=your_password
```
windows:
```
set KEYSTORE_PASSWORD=your_password
```

### 4. Run the following command to generate private key and public key files:

Script tested in windows and linux environments.
```
deno --allow-env --allow-write=generated.private,../generated.pub generate.ts
```

### 5. Use generated key for vanity address generation (cli)

### 6. Revealing keys

To reveal the generated private key, you can use the following command:

```
deno --allow-env --allow-read=generated.private,../results.json --allow-write=keys reveal.ts
```

Your private keys will be ready in form of keystore files encrypted with the password given before.







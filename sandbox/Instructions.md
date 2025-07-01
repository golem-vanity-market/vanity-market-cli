## Run Yagna for development

### 1. Run python prepare script to set up the environment and download yagna binaries

```
python prepare.py
```

or for golem base

```
python prepare-glm-base.py
```

yagna (or base) folder should be created and binaries and .env files placed there.

### 2. Open terminal window 1 in folder yagna (or base) and run the following command
Make sure that no other yagna instance is running on your machine.

```
./yagna service run
```

### 3. Open terminal window 2 in folder yagna (or base) and run the following command

```
./yagna payment status --network polygon
```

You should get something like this

```
Status for account: 0x2dadd439ae713c09396b81f43373e87cd9c5e129
Payment Driver status: OK

┌────────────────────┬────────────────┬────────────┬─────────────┬────────────┬────────────┬──────────────┐
│  platform          │  total amount  │  reserved  │  amount     │  incoming  │  outgoing  │  gas         │
├────────────────────┼────────────────┼────────────┼─────────────┼────────────┼────────────┼──────────────┤
│  driver: erc20     │  20.0000 GLM   │  0 GLM     │  accepted   │  0 GLM     │  0 GLM     │  2.0000 POL  │
│  network: polygon  │                │            │  confirmed  │  0 GLM     │  0 GLM     │              │
│  token: GLM        │                │            │  requested  │  0 GLM     │  0 GLM     │              │
└────────────────────┴────────────────┴────────────┴─────────────┴────────────┴────────────┴──────────────┘
```

### 4. That means your yagna is running and funded on polygon network.
Account 0x2dadd439ae713c09396b81f43373e87cd9c5e129 is used only for demonstration and testing,
only one yagna at the time can use it. Later we migrate to a different account and forfeit this address

### 5. Run cruncher client in folder `cruncher-client`. Note .env file is set up from prepare.py script

```
npm install
npm run crunch
```

### 6. To full-fill payments run. Yagna wil gather all pending payments and start processing them immediately.

```
./yagna payment process now --network polygon
```

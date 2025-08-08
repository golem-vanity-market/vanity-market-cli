# Vanity manual Setup Guide

## 1. Directory and User
- **Data directory**: `/vanity-node-0`
- **User running the service**: `ubuntu`

Make sure the `ubuntu` user owns the directory and its contents:

```bash
sudo chown -R ubuntu:ubuntu /vanity-node-0
```

---

## 2. Yagna Binary
- Yagna should be placed in:
  ```
  /vanity-node-0/yagna
  ```
- You only need the `yagna` binary. Place it in the above directory.

---

## 3. Yagna Configuration
Create the `.env` file:
```
/vanity-node-0/yagna/.env
```

### Example `.env` file:
```env
YAGNA_DATADIR=yagnadir
YAGNA_API_URL=http://127.0.0.1:7600
GSB_URL=unix:/vanity-node-0/yagna/yagna.sock
YA_NET_BIND_URL=udp://0.0.0.0:11600
NODE_NAME=VanityNode0
YAGNA_API_ALLOW_ORIGIN=*
YAGNA_APPKEY=secretND_0
YAGNA_AUTOCONF_APPKEY=secretND_0
YAGNA_AUTOCONF_ID_SECRET=...
```

---

## 4. Firewall Configuration
Open ports **7600** and **11600** on your firewall:

```bash
sudo ufw allow 7600
sudo ufw allow 11600
```

---

## 5. Systemd Service
Create the service file:
```
/etc/systemd/system/yagna-node-0.service
```

### Example service file:
```ini
[Unit]
Description=Yagna node 0
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/vanity-node-0/yagna/yagna service run
WorkingDirectory=/vanity-node-0/yagna
CPUQuota=200%
Environment=YAGNA_METRICS_JOB_NAME=vanity-node-0
Environment=YAGNA_METRICS_URL=https://metrics.golem.network:9092/
Restart=no
RestartSec=120

[Install]
WantedBy=multi-user.target
```

---

### Quick reference for systemd commands:
1. Reload systemd:
   ```bash
   sudo systemctl daemon-reload
   ```
2. Enable the service:
   ```bash
   sudo systemctl enable yagna-node-0
   ```
3. Start the service:
   ```bash
   sudo systemctl start yagna-node-0
   ```
4. Check the service status:
   ```bash
   sudo systemctl status yagna-node-0
   ```

### Vanity Node 0 Cli Setup Guide

clone git repository:

```bash
git clone git@github.com:Unoperate/golem-vanity.market.git
```

Configuration goes into:


/vanity-node-0/golem-vanity.market/cli/.env

```
YAGNA_APPKEY=secretND_0
YAGNA_API_URL=http://127.0.0.1:7600
YAGNA_API_BASEPATH=http://127.0.0.1:7600
STATUS_SERVER=http://0.0.0.0:8600

EFFICIENCY_LOWER_THRESHOLD=1.0
SPEED_LOWER_THRESHOLD=1000000
SPEED_ESTIMATION_TIMEFRAME=600

MINIMUM_CPU_CORES=8
GOLEM_PINO_LOG_LEVEL=info
```


### Generate keys

Navigate to golem-vanity.market/tools and run:

```
deno generate.ts
```

That will generate the public key `generated.pub` to use in the service.


/etc/systemd/system/vanity-node-0.service


```
[Unit]
Description=Vanity Node.js Server using TypeScript
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/vanity-node-0/golem-vanity.market/cli
ExecStart=/home/ubuntu/.nvm/versions/node/v24.4.1/bin/bun src/index.ts generate --public-key generated.pub --vanity-address-prefix 0x44448888888 --processing-unit cpu --budget-limit 10 --num-workers 10 --num-results 10000000 --results-file results.json
Restart=on-failure
Environment=NODE_ENV=production
Environment=PATH=/home/ubuntu/.nvm/versions/node/v24.4.1/bin:/usr/bin:/bin

Restart=no

[Install]
WantedBy=multi-user.target

```

If you have different node version, change the node paths accordingly.


These two services work together.
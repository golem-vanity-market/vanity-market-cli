# Semi automatic Setup Guide

- Deployment helper using systemd
- It downloads proper version of yagna.
- Prepares systemd service files and environment variables.
- Generates app keys for the node.

Before running the script install nvm and Node.js using nvm (also install bun):

Arguments needed (ports have to be unique for every node):

```bash
python generate.py \
        --node-name example-1 \
        --overwrite \
        --install-services \
        --clone-repo \
        --prepare-yagna \
        --api-port 6105 \
        --udp-port 22322 \
        --status-port 8956 \
        --private-key PRIVATE_KEY_HERE  \
        --yagna-id YAGNA_ID_HERE \
```

All the files will be generated in the `services` folder.

Additional steps after running the script:

- fund the node with tokens
- prepare nginx configuration for dashboard
- open udp port for yagna in ufw
- fix node path in service templates if needed

Add full_restart.sh to cron

```
22 2 * * * cd %%SERVICEDIR%% && ./full_restart.sh >> "./full_restart_$(date +\%Y-\%m-\%d_\%H-\%M).log" 2>&1
```

Of course fix it to point to the directory where full_restart.sh is located.



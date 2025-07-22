#!/bin/bash
set -x
sudo systemctl stop vanity-frontend
sudo systemctl stop vanity-server
sudo systemctl stop vanity-keystore
nvm use node
(cd cli && npm install --no-save)
(cd cli && npm run build)
(cd webapp/shared && npm install --no-save)
(cd webapp/backend && npm install --no-save)
(cd webapp/backend && rm db.*)
(cd webapp/backend && npx drizzle-kit push)
(cd webapp/frontend && npm install --no-save)
sudo systemctl start vanity-server
(cd webapp/frontend && npm run build)
sudo systemctl start vanity-keystore
sudo systemctl start vanity-frontend



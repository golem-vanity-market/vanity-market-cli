#!/usr/bin/env bash

set -e
rm -f /root/.local/share/yagna/yagna.lock
/yagna/init_sender.sh &
exec yagna service run

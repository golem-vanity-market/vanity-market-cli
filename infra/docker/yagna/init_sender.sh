#!/usr/bin/env bash

set -eu
sleep 5
yagna payment init --sender --network $YAGNA_PAYMENT_NETWORK --driver $YAGNA_PAYMENT_DRIVER

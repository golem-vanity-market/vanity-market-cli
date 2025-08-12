#!/usr/bin/env bash

set -euo pipefail

# Arguments passed as environment variables.
DRIVER="${DRIVER}"
NETWORK="${NETWORK}"
OUT_FILE="${OUT_FILE}"
DATA_DIR="${DATA_DIR}"
BALANCE_API_DIR="${BALANCE_API_DIR}"

PAYMENT_DB="${DATA_DIR}/payment.db"
RUN_TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${RUN_TMP_DIR:-/tmp/*}"' EXIT
TMP_OUT_FILE="${RUN_TMP_DIR}/out"
TMP_YAGNA_PAYMENT_STATUS_FILE="${RUN_TMP_DIR}/payment_status"
TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE="${RUN_TMP_DIR}/sqlite_payment_agreement_with_invoice"
TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE="${RUN_TMP_DIR}/sqlite_payment_activity_with_invoice"
TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE="${RUN_TMP_DIR}/sqlite_payment_agreement_without_invoice"
TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE="${RUN_TMP_DIR}/sqlite_payment_activity_without_invoice"

function get_raw_value() {
  local file=$1
  local path=$2

  jq --exit-status --raw-output ".$path" "$file"
}

function append() {
  echo "$@" | tee --append "$TMP_OUT_FILE"
}

yagna payment status --network "$NETWORK" --driver "$DRIVER" --json > "$TMP_YAGNA_PAYMENT_STATUS_FILE"
cp "$TMP_YAGNA_PAYMENT_STATUS_FILE" "${BALANCE_API_DIR}/yagna-payment-status.json"

DRIVER="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" driver)"
NETWORK="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" network)"
TOKEN="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" token)"
PLATFORM="$(tr '[:upper:]' '[:lower:]' <<< "${DRIVER}-${NETWORK}-${TOKEN}")"

sqlite3 "$PAYMENT_DB" \
  "select \
    coalesce(sum(total_amount_due), 0) as sum_total_amount_due, \
    coalesce(sum(total_amount_accepted), 0) as sum_total_amount_accepted, \
    coalesce(sum(total_amount_scheduled), 0) as sum_total_amount_scheduled, \
    coalesce(sum(total_amount_paid), 0) as sum_total_amount_paid \
  from pay_agreement \
  where exists (select * from pay_invoice \
    where pay_agreement.id=pay_invoice.agreement_id \
	  and pay_agreement.payment_platform='${PLATFORM}');" \
  --json > "$TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE"

sqlite3 "$PAYMENT_DB" \
  "select \
    coalesce(sum(total_amount_due), 0) as sum_total_amount_due, \
    coalesce(sum(total_amount_accepted), 0) as sum_total_amount_accepted, \
    coalesce(sum(total_amount_scheduled), 0) as sum_total_amount_scheduled, \
    coalesce(sum(total_amount_paid), 0) as sum_total_amount_paid \
  from pay_activity \
  where exists (select * from pay_invoice where pay_activity.agreement_id=pay_invoice.agreement_id) \
    and exists (select * from pay_agreement \
      where pay_activity.agreement_id=pay_agreement.id \
        and pay_agreement.payment_platform='${PLATFORM}');" \
  --json > "$TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE"

sqlite3 "$PAYMENT_DB" \
  "select \
    coalesce(sum(total_amount_due), 0) as sum_total_amount_due, \
    coalesce(sum(total_amount_accepted), 0) as sum_total_amount_accepted, \
    coalesce(sum(total_amount_scheduled), 0) as sum_total_amount_scheduled, \
    coalesce(sum(total_amount_paid), 0) as sum_total_amount_paid \
  from pay_agreement \
  where not exists (select * from pay_invoice \
    where pay_agreement.id=pay_invoice.agreement_id \
	  and pay_agreement.payment_platform='${PLATFORM}');" \
  --json > "$TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE"

sqlite3 "$PAYMENT_DB" \
  "select \
    coalesce(sum(total_amount_due), 0) as sum_total_amount_due, \
    coalesce(sum(total_amount_accepted), 0) as sum_total_amount_accepted, \
    coalesce(sum(total_amount_scheduled), 0) as sum_total_amount_scheduled, \
    coalesce(sum(total_amount_paid), 0) as sum_total_amount_paid \
  from pay_activity \
  where not exists (select * from pay_invoice where pay_activity.agreement_id=pay_invoice.agreement_id) \
    and exists (select * from pay_agreement \
      where pay_activity.agreement_id=pay_agreement.id \
        and pay_agreement.payment_platform='${PLATFORM}');" \
  --json > "$TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE"

GAS_BALANCE="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" gas.balance)"
GAS_CURRENCY="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" gas.currency_short_name)"

BALANCE="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" amount)"
RESERVED="$(get_raw_value "$TMP_YAGNA_PAYMENT_STATUS_FILE" reserved)"

PAYMENT_AGREEMENT_WITH_INVOICE_DUE="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE" "[0].sum_total_amount_due")"
PAYMENT_AGREEMENT_WITH_INVOICE_ACCEPTED="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE" "[0].sum_total_amount_accepted")"
PAYMENT_AGREEMENT_WITH_INVOICE_SCHEDULED="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE" "[0].sum_total_amount_scheduled")"
PAYMENT_AGREEMENT_WITH_INVOICE_PAID="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITH_INVOICE_FILE" "[0].sum_total_amount_paid")"

PAYMENT_ACTIVITY_WITH_INVOICE_DUE="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE" "[0].sum_total_amount_due")"
PAYMENT_ACTIVITY_WITH_INVOICE_ACCEPTED="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE" "[0].sum_total_amount_accepted")"
PAYMENT_ACTIVITY_WITH_INVOICE_SCHEDULED="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE" "[0].sum_total_amount_scheduled")"
PAYMENT_ACTIVITY_WITH_INVOICE_PAID="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITH_INVOICE_FILE" "[0].sum_total_amount_paid")"

PAYMENT_AGREEMENT_WITHOUT_INVOICE_DUE="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_due")"
PAYMENT_AGREEMENT_WITHOUT_INVOICE_ACCEPTED="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_accepted")"
PAYMENT_AGREEMENT_WITHOUT_INVOICE_SCHEDULED="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_scheduled")"
PAYMENT_AGREEMENT_WITHOUT_INVOICE_PAID="$(get_raw_value "$TMP_SQLITE_PAYMENT_AGREEMENT_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_paid")"

PAYMENT_ACTIVITY_WITHOUT_INVOICE_DUE="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_due")"
PAYMENT_ACTIVITY_WITHOUT_INVOICE_ACCEPTED="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_accepted")"
PAYMENT_ACTIVITY_WITHOUT_INVOICE_SCHEDULED="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_scheduled")"
PAYMENT_ACTIVITY_WITHOUT_INVOICE_PAID="$(get_raw_value "$TMP_SQLITE_PAYMENT_ACTIVITY_WITHOUT_INVOICE_FILE" "[0].sum_total_amount_paid")"


append "# HELP yagna_wallet_balance Yagna wallet balance"
append "# Type gauge"
append "yagna_wallet_balance{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\"} $BALANCE"

append "# HELP yagna_wallet_reserved Yagna wallet reserved"
append "# Type gauge"
append "yagna_wallet_reserved{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\"} $RESERVED"

append "# HELP yagna_wallet_gas Yagna wallet gas"
append "# Type gauge"
append "yagna_wallet_gas{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$GAS_CURRENCY\"} $GAS_BALANCE"

# Note that we set the type to be "counter" as it should only be increasing in value.
append "# HELP yagna_db_payment_amount_total Yagna payment amounts read from its internal database"
append "# Type counter"

append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"true\",status=\"due\"} $PAYMENT_AGREEMENT_WITH_INVOICE_DUE"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"true\",status=\"due\"} $PAYMENT_ACTIVITY_WITH_INVOICE_DUE"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"false\",status=\"due\"} $PAYMENT_AGREEMENT_WITHOUT_INVOICE_DUE"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"false\",status=\"due\"} $PAYMENT_ACTIVITY_WITHOUT_INVOICE_DUE"

append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"true\",status=\"accepted\"} $PAYMENT_AGREEMENT_WITH_INVOICE_ACCEPTED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"true\",status=\"accepted\"} $PAYMENT_ACTIVITY_WITH_INVOICE_ACCEPTED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"false\",status=\"accepted\"} $PAYMENT_AGREEMENT_WITHOUT_INVOICE_ACCEPTED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"false\",status=\"accepted\"} $PAYMENT_ACTIVITY_WITHOUT_INVOICE_ACCEPTED"

append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"true\",status=\"scheduled\"} $PAYMENT_AGREEMENT_WITH_INVOICE_SCHEDULED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"true\",status=\"scheduled\"} $PAYMENT_ACTIVITY_WITH_INVOICE_SCHEDULED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"false\",status=\"scheduled\"} $PAYMENT_AGREEMENT_WITHOUT_INVOICE_SCHEDULED"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"false\",status=\"scheduled\"} $PAYMENT_ACTIVITY_WITHOUT_INVOICE_SCHEDULED"

append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"true\",status=\"paid\"} $PAYMENT_AGREEMENT_WITH_INVOICE_PAID"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"true\",status=\"paid\"} $PAYMENT_ACTIVITY_WITH_INVOICE_PAID"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"agreement\",invoice_exists=\"false\",status=\"paid\"} $PAYMENT_AGREEMENT_WITHOUT_INVOICE_PAID"
append "yagna_db_payment_amount_total{driver=\"$DRIVER\",network=\"$NETWORK\",currency=\"$TOKEN\",source=\"activity\",invoice_exists=\"false\",status=\"paid\"} $PAYMENT_ACTIVITY_WITHOUT_INVOICE_PAID"

mv "$TMP_OUT_FILE" "$OUT_FILE"

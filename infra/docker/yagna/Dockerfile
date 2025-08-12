FROM ubuntu:24.04

RUN apt-get update \
  && apt-get install --yes curl nano less jq sqlite3 \
  && apt-get autoremove \
  && rm -rf /var/lib/apt/lists/*

ARG YAGNA_TAG

ENV GOLEM_ACCEPT_TOS="yes"
ENV YA_INSTALLER_BIN="/usr/local/bin"
ENV YA_INSTALLER_CORE=${YAGNA_TAG}
RUN [ -n "$YA_INSTALLER_CORE" ] && curl -sSf https://join.golem.network/as-requestor | bash -

WORKDIR /yagna
# TODO: recheck the scripts, maybe drop some of them if they are unused
COPY init_sender.sh /yagna/
COPY entrypoint.sh /yagna/
COPY export.sh /yagna/

CMD ["/yagna/entrypoint.sh"]

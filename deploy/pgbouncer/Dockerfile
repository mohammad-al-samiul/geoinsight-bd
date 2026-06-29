FROM alpine:3.21

RUN apk add --no-cache pgbouncer su-exec \
  && adduser -D -H -u 70 -s /sbin/nologin pgbouncer

EXPOSE 6432

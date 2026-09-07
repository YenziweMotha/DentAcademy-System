#!/usr/bin/env bash
# Start the local MariaDB instance (user-space, no sudo required).
# Data dir: $HOME/mariadb-data   Socket: $HOME/mariadb-data/mysql.sock
set -e

DATADIR="$HOME/mariadb-data"
SOCK="$DATADIR/mysql.sock"
PIDFILE="$DATADIR/mariadbd.pid"

# If already running, do nothing.
if [ -S "$SOCK" ] && mysql --socket="$SOCK" -u dent -pdentpass -e "SELECT 1" >/dev/null 2>&1; then
  echo "MariaDB already running (socket $SOCK)."
  exit 0
fi

# If a stale pidfile exists but no server, clean up.
if [ -f "$PIDFILE" ] && ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  rm -f "$PIDFILE"
fi

mkdir -p "$DATADIR"
echo "Starting MariaDB..."
nohup mariadbd \
  --datadir="$DATADIR" \
  --socket="$SOCK" \
  --port=3306 \
  --bind-address=127.0.0.1 \
  --pid-file="$PIDFILE" \
  >/tmp/mariadbd.log 2>&1 &

# Wait until it accepts connections (max ~15s).
for i in $(seq 1 15); do
  if mysql --socket="$SOCK" -u dent -pdentpass -e "SELECT 1" >/dev/null 2>&1; then
    echo "MariaDB is up on 127.0.0.1:3306 (socket $SOCK)."
    exit 0
  fi
  sleep 1
done

echo "ERROR: MariaDB did not start. See /tmp/mariadbd.log" >&2
exit 1

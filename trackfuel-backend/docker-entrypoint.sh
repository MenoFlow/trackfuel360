#!/bin/sh
set -e

# Fix ownership of the uploads directory (bind-mounted from host).
# This runs as root so it can chown regardless of the host owner.
chown -R node:node /app/uploads

# Drop privileges and exec the CMD as the 'node' user.
# su-exec is available on Alpine; it replaces the current process (PID 1).
exec su-exec node "$@"

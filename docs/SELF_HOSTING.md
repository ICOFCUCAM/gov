# Running CivicOS on one computer

This guide is for the person who looks after the computers, not for a
software developer. It runs the whole platform on **one computer** (Linux,
macOS or Windows), **without any cloud service**, with sign-in required,
encrypted backups and the platform's scheduled jobs running by themselves.

One command does it:

```bash
cd app
npm run self-host            # or: node scripts/self-host.mjs
```

The script is `app/scripts/self-host.mjs`. When you outgrow one computer,
see [Moving later](#moving-later).

---

## 1. What you need

- A computer with at least 4 GB of memory and 10 GB of free disk
  (more for many backups).
- **Node.js 22** (LTS) from [nodejs.org](https://nodejs.org). Check with
  `node --version`; it must say `v22` or higher.
- **pnpm** (comes with Node: run `corepack enable` once), or npm.
- A copy of this repository (`git clone …`, or an unpacked release).

No database server, no Docker and no internet connection are needed once the
packages are installed. (If you prefer Docker, see [Moving later](#moving-later).)

## 2. Quick start

```bash
cd app
pnpm install --frozen-lockfile     # once, and after every upgrade
npm run self-host
```

The first run:

1. checks Node is version 22 or newer;
2. makes the data folder `app/civicos-data/` with `state/`, `backups/`,
   `tiles/` and `anchors/` inside, readable only by your account;
3. writes **`civicos-data/civicos.env`** once, with new random secrets
   (see [section 4](#4-where-your-data-and-keys-live)), and prints where it is;
4. builds the app if no build exists (several minutes the first time);
5. starts CivicOS on **http://localhost:3000**, answering this computer only;
6. prints the **one-time setup code** for the first administrator;
7. runs the platform's scheduled jobs (backups, the update watchdog, message
   delivery and the rest) itself.

Stop it with **Ctrl-C**; it saves its state before it exits. It does not
restart by itself: to have it start with the computer and come back after a
crash, run it as a service ([section 6](#6-running-it-as-a-service)).

Options (the same after `npm run self-host --`):

| Option | Default | What it does |
|---|---|---|
| `--data <folder>` | `./civicos-data` | Where the data, keys and backups are kept. |
| `--port <number>` | `3000` | The port it answers on. |
| `--host <address>` | `127.0.0.1` | `127.0.0.1` answers this computer only. `0.0.0.0` answers the network (read [section 5](#5-letting-other-computers-reach-it) first). |
| `--url <address>` | `http://localhost:<port>` | The address people will type, written on the first run only. |
| `--no-build` | | Stop instead of building when no build exists. |

Other commands:

```bash
npm run self-host -- status        # running? state, administrator, last backup, scheduled jobs
npm run self-host -- backup        # take an encrypted, verified backup now
npm run self-host -- --print-env   # the settings it runs with (secrets hidden; --show-secrets shows them)
```

`backup` works whether CivicOS is running or not: if it is stopped, it is
started briefly on this computer only, the backup is taken, and it is stopped
again.

## 3. First sign-in

While no administrator exists, the start-up output shows:

```
================ CIVICOS FIRST ADMINISTRATOR ================
No administrator exists yet. Open
    http://localhost:3000/sign-in
The page shows "Create the first official account". Fill it in with this one-time setup code:

    K7QX…(32 characters)

It works once. Keep it private until you have used it.
=============================================================
```

Open that address, fill in your name, office, email and a password of at
least 12 characters, and paste the code. That account is the installation's
administrator. The code then stops working (it is remembered as used), so
nobody else can make themselves administrator. The code is also in
`civicos.env` as `CIVICOS_SETUP_TOKEN` if you missed the message.

Next: `/setup` walks through the nation's profile, and **People › Sign-in
accounts** creates the other officials' accounts. Turn on the second sign-in
step (authenticator app) for administrators there.

## 4. Where your data and keys live

Everything is in the data folder (default `app/civicos-data/`):

| Path | What it is |
|---|---|
| `civicos.env` | The settings and **secrets**. Readable only by your account (mode 600). |
| `state/` | The platform's state: the nation's configuration, accounts, audit chain, records. Saved every few seconds and on stop. |
| `backups/` | Encrypted backups (`BK-….cvb`) and their descriptions (`BK-….json`). |
| `anchors/` | The audit chain's signed heads, an append-only file kept outside the state. |
| `tiles/` | Map tiles made from the registers (rebuilt when missing). |
| `self-host.json`, `scheduler.json` | The running process and each scheduled job's last run (for `status`). |

The secrets in `civicos.env`, each made once and **never replaced** by the
script (edit the file yourself if you must change one):

| Setting | What it is for |
|---|---|
| `CIVICOS_DATA_KEK` | **The data key.** Encrypts every backup and the secrets the platform stores. 32 random bytes, base64. |
| `CIVICOS_SESSION_SECRET` | Signs officials' sign-in sessions. Changing it signs everyone out. |
| `CIVICOS_CRON_SECRET` | Lets the scheduler call the scheduled jobs (`/api/cron/*`) and nothing else. |
| `CIVICOS_SETUP_TOKEN` | The one-time code for the first administrator. |
| `CIVICOS_AUDIT_KEY`, `CIVICOS_EXCHANGE_KEY`, `CIVICOS_TOKEN_KEY`, `CIVICOS_DECISION_KEY` | Ed25519 keys that sign the audit chain, records exchanged with other installations, access tokens, and legal decisions and certificates (keep a safe copy of the decision key: certificates are checked against it). |
| `CIVICOS_CITIZEN_OIDC_SECRET` | Not generated: the client secret the national identity service gave this platform, if it needs one, for citizens' sign-in (`deployment.identity.citizens` in setup). Add it to the file yourself. |

It also sets `CIVICOS_MODE=production` (a real installation: no sample
records, no demo citizen; start the first run with `--demo` for a
demonstration with samples and a banner on every page), `CIVICOS_AUTH=enforce` (sign-in required), `CIVICOS_STATE=file`
with `CIVICOS_STATE_DIR`, `CIVICOS_BACKUP_TARGET=dir` with
`CIVICOS_BACKUP_DIR`, `CIVICOS_TILES_DIR`, `CIVICOS_AUDIT_ANCHOR_FILE` and
`CIVICOS_PUBLIC_URL`. A variable set in the shell when you start wins over
the file (the script says so when that happens).

### Keep the data key safe

> **If you lose `CIVICOS_DATA_KEK`, every backup and every secret the
> platform encrypted is lost for good. Nobody, including the publisher, can
> recover it.**

On the day you install, copy `civicos.env` (or at least the
`CIVICOS_DATA_KEK=` line) to a place **away from this computer**: a USB key
in a safe, a sealed envelope, or two halves held by two people. Keep the
copy as private as the data itself. Do the same again if you ever change the
key (put the old one in `CIVICOS_DATA_KEK_PREVIOUS` until the backups made
with it have expired). See `docs/DISASTER_RECOVERY.md` §5.

### Backups

- The scheduled job takes a backup **every day** (it checks every hour),
  verifies it (reads it back, decrypts it, checks every part, and tries a
  restore into a scratch copy) and removes old ones by the retention policy
  (7 daily, 4 weekly, 12 monthly by default; **Platform › Backups**).
- `npm run self-host -- backup` takes one now, the same way. Retention keeps
  the newest backup of each day, so a second backup on the same day replaces
  the first; copy a backup elsewhere if you need to keep that exact one.
- Backups in `backups/` protect you against mistakes, **not** against losing
  the computer. Copy the `backups/` folder to another disk or computer
  regularly (they are encrypted; the copy is safe without the key). For
  automatic off-site copies, set `CIVICOS_BACKUP_TARGET=s3` with the
  nation's own S3-compatible storage (`docs/DISASTER_RECOVERY.md` §3).
- Restoring is done in **Platform › Backups** by an administrator and
  confirmed by a second official (`docs/DISASTER_RECOVERY.md` §6). It is
  never automatic.
- Copying the `state/` folder while CivicOS runs is not a backup (it may be
  caught half-written); use the backups.

### Windows

Windows does not use the file modes above. After the first run, limit the
data folder to the account that runs CivicOS (the script prints this too):

```bat
icacls "C:\civicos\app\civicos-data" /inheritance:r /grant:r "%USERNAME%:(OI)(CI)F"
```

## 5. Letting other computers reach it

By default CivicOS answers **this computer only** (127.0.0.1). For people on
the office network, do **not** simply use `--host 0.0.0.0`: passwords and
sessions would then cross the network unencrypted. Put a reverse proxy that
speaks HTTPS in front and keep CivicOS on 127.0.0.1.

[Caddy](https://caddyserver.com) is a single program that does this and gets
certificates by itself. A minimal `Caddyfile`:

```
civicos.example.gov {
    reverse_proxy 127.0.0.1:3000
}
```

On a network without internet access (no public certificate), use Caddy's
own certificate authority and install its root certificate on the office
computers:

```
civicos.office.lan {
    tls internal
    reverse_proxy 127.0.0.1:3000
}
```

Then:

1. Start CivicOS with the address people will use, on the first run:
   `npm run self-host -- --url https://civicos.example.gov`
   (later: change `CIVICOS_PUBLIC_URL` in `civicos.env`).
2. Add `CIVICOS_TRUSTED_PROXIES=1` to `civicos.env`, so per-address limits
   see the visitor's address rather than the proxy's.
3. Open only the proxy's ports (443, and 80 for certificate renewal) in the
   firewall; never port 3000.

`--host 0.0.0.0` (with a warning) is for a closed test network only.

## 6. Running it as a service

The script starts CivicOS and stops it cleanly but never restarts it. Let
the operating system do that. In each example, replace the paths and user.

### Linux (systemd)

`/etc/systemd/system/civicos.service`:

```ini
[Unit]
Description=CivicOS
After=network-online.target
Wants=network-online.target

[Service]
User=civicos
WorkingDirectory=/opt/civicos/app
ExecStart=/usr/bin/node scripts/self-host.mjs --data /var/lib/civicos
Restart=on-failure
RestartSec=10
# Stop: the script passes the signal to the server, which saves its state.
KillMode=mixed
TimeoutStopSec=45
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/civicos /opt/civicos/app/.next
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system --home /var/lib/civicos civicos
sudo mkdir -p /var/lib/civicos && sudo chown civicos: /var/lib/civicos
sudo systemctl daemon-reload && sudo systemctl enable --now civicos
journalctl -u civicos -f            # the output, including the setup code on the first start
```

Build once before enabling the service (`npm run build` as the same user), as
`ProtectSystem=strict` keeps the service from writing the app folder.

### macOS (launchd)

`~/Library/LaunchAgents/gov.civicos.plist` (or `/Library/LaunchDaemons/` with
a `UserName` key, to start without anyone signed in):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>gov.civicos</string>
  <key>WorkingDirectory</key><string>/Users/admin/civicos/app</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>scripts/self-host.mjs</string>
    <string>--data</string><string>/Users/admin/civicos-data</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ExitTimeOut</key><integer>45</integer>
  <key>StandardOutPath</key><string>/Users/admin/civicos-data/civicos.log</string>
  <key>StandardErrorPath</key><string>/Users/admin/civicos-data/civicos.log</string>
</dict>
</plist>
```

```bash
launchctl load -w ~/Library/LaunchAgents/gov.civicos.plist
```

(`which node` gives the right path to node; on Apple silicon with Homebrew
it is `/opt/homebrew/bin/node`.)

### Windows

**NSSM** ([nssm.cc](https://nssm.cc)) runs any program as a Windows service
and restarts it:

```bat
nssm install CivicOS "C:\Program Files\nodejs\node.exe" "scripts\self-host.mjs --data C:\civicos-data"
nssm set CivicOS AppDirectory C:\civicos\app
nssm set CivicOS AppStdout C:\civicos-data\civicos.log
nssm set CivicOS AppStderr C:\civicos-data\civicos.log
nssm set CivicOS AppStopMethodConsole 30000
nssm start CivicOS
```

Without NSSM, **Task Scheduler** can start it at boot: create a task that
runs whether the user is signed in or not, trigger *At startup*, action
*Start a program* `C:\Program Files\nodejs\node.exe` with arguments
`scripts\self-host.mjs --data C:\civicos-data` and *Start in*
`C:\civicos\app`; under Settings tick *If the task fails, restart every 1
minute*. Task Scheduler stops a task abruptly, so the last few seconds of
changes before a stop may be lost; NSSM's console stop avoids that.

## 7. Upgrading

The **Update Center** (`/updates`) tells you about new releases, security
advisories and end-of-life dates, and records who approved an install. On one
computer the install itself is done by hand:

1. `npm run self-host -- backup` (or let the Update Center take its restore point).
2. Stop CivicOS (Ctrl-C, or stop the service).
3. Get the new version: `git pull` (or unpack the new release over the old one;
   keep `civicos-data/`).
4. `pnpm install --frozen-lockfile` and `npm run build` in `app/`.
5. Start CivicOS again. The data, keys and accounts are kept.

If something is wrong after an upgrade, go back to the previous version
(`git checkout <previous tag>`, install, build, start). The data is kept;
restore a backup only if the data itself was damaged.

## 8. Checking on it

- `npm run self-host -- status` — whether it runs, its health, the state,
  whether an administrator exists, the last backup and failing jobs. It exits
  with 1 when CivicOS is not running or is down, so a monitoring tool can use it.
- `http://localhost:3000/api/health` — the same health, as JSON.
- Each scheduled job's first run and every failure is printed in the output;
  `civicos-data/scheduler.json` records every job's last run. Jobs that need
  the Supabase substrate are skipped when it is not configured.

## 9. Moving later

One computer is a good start for a small institution or a pilot. When you
need more:

- **Docker compose** (`infra/docker/docker-compose.yml`): the same file state
  on a volume. Stop the self-hosted server, copy `civicos-data/state/` into the
  volume (`/data`), and give the container the same values from
  `civicos.env` (at least `CIVICOS_DATA_KEK`, `CIVICOS_SESSION_SECRET`,
  `CIVICOS_CRON_SECRET` and the three signing keys; the compose file does not
  list the data and signing keys yet, so add them to its `app` service). The
  compose file does not run the scheduled jobs: call them from the host's own
  scheduler (cron or Task Scheduler) with the cron secret, on the schedules
  in `app/scripts/cron-jobs.json`.
- **Kubernetes (Helm)** (`infra/README.md`, `infra/helm/civicos`): several
  servers, `cron.enabled: true` runs the same scheduled jobs
  (`app/scripts/cron-jobs.json` is the one list both use).
- **Postgres state** (`CIVICOS_STATE=postgres`): needed for more than one
  application server. Move by restoring a backup into a fresh installation
  with the same release, key and backup target (`docs/DISASTER_RECOVERY.md`
  §6.3); a backup restores into the same state mode it was taken in, so a
  move from file to postgres state is a planned migration with the
  publisher's help.

## 10. What this does not do

- It is one server: if the computer fails, CivicOS is down until it is
  repaired or a backup is restored on another one.
- It does not make HTTPS itself (use the reverse proxy in section 5).
- It does not restart itself (use a service, section 6).
- It does not copy backups off the computer unless you set an S3 target.

The deployment entry in `docs/INTEGRATION_REGISTER.md` (1.45) records what was
tested and what was not.

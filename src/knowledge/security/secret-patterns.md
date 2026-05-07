# Secret Detection Patterns

## Accidentally Committed Secrets

Scan for these categories of secrets in source code and configuration:

- API keys and tokens (AWS, GitHub, Stripe, Google, Azure, etc.)
- Passwords and credentials in source or config files
- Private keys (PEM, PKCS, SSH — `id_rsa`, `*.pem`, `*.key`)
- Database connection strings containing credentials
- OAuth client secrets and refresh tokens
- Encryption keys and salts

## File Patterns to Check

These files commonly contain secrets:

- `.env`, `.env.local`, `.env.production`
- `config.local.*`, `config.secret.*`
- `secrets.json`, `credentials.json`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `id_rsa`, `id_ed25519`
- Database backup files (`.sql`, `.dump`)
- `.npmrc`, `.pypirc` (registry credentials)
- `docker-compose.override.yml` (often contains real credentials)

## Common API Key Patterns

| Provider | Pattern |
|----------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| AWS Secret Key | 40-character base64 string |
| GitHub Token | `ghp_[A-Za-z0-9]{36}`, `gho_*`, `ghu_*`, `ghs_*` |
| Stripe | `sk_live_[A-Za-z0-9]{24,}`, `rk_live_*` |
| Google API Key | `AIza[0-9A-Za-z\-_]{35}` |
| Google OAuth | `[0-9]+-[a-z0-9_]{32}.apps.googleusercontent.com` |
| Azure | Subscription keys, SAS tokens, connection strings with `AccountKey=` |
| Slack | `xoxb-`, `xoxp-`, `xoxs-` prefixed tokens |
| Twilio | `SK[a-f0-9]{32}` (API key), `AC[a-f0-9]{32}` (Account SID) |
| SendGrid | `SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}` |
| Mailgun | `key-[a-f0-9]{32}` |
| Firebase | `AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}` |
| Private Key Header | `-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----` |
| Generic Password | `password\s*[:=]\s*['"][^'"]+['"]` (high false positive rate — check context) |

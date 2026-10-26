# Security

## Reporting a vulnerability

E-mail **security@cubrik.ai** (or help@cubrik.ai) with the details and, if you can, steps to
reproduce. Please do not open a public issue for a vulnerability. We answer within three working
days.

## How the connection is protected

- **OAuth 2.1 with PKCE (S256).** Apps register themselves (RFC 7591) or present a client metadata
  document; codes are only ever sent to callbacks on a fixed list (Claude, ChatGPT, the editors,
  the user's own machine) and are spent once.
- **Opaque tokens, stored hashed.** Access tokens last an hour; refresh tokens rotate on every use,
  and a reused one ends the whole connection.
- **Permissions chosen by the user** at sign-in: read, manage agents, trade. A tool needing a
  permission the connection lacks is refused.
- **No money movement.** No tool deposits, withdraws or transfers funds, on any door.
- **Broker credentials never leave cubrik.** The AI app receives a cubrik token, not a broker key.
- **Instant revocation.** Disconnecting in cubrik → Settings → AI apps ends the connection at once.

This repository holds only configuration and skills (Markdown): no code that runs on your machine.

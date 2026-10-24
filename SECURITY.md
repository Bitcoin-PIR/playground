# Security policy

The playground (sdk.bitcoinpir.org) is a static site that vendors the
Bitcoin PIR browser client (`vendor/`) and runs real queries against the
live servers from the visitor's browser. Anything that could make the
site learn or leak which addresses a visitor looked up is a security
vulnerability here.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a
security problem.

Report it privately through GitHub: **Security → Report a vulnerability**
on this repository
(<https://github.com/Bitcoin-PIR/playground/security/advisories/new>).
The report reaches the maintainer only.

If the problem is in the PIR protocol, the servers or the vendored client
itself, report it to
[Bitcoin-PIR/Bitcoin-PIR](https://github.com/Bitcoin-PIR/Bitcoin-PIR/security/advisories/new)
instead; if you are not sure, report it here and we will route it.

Include what you can: the page or component, the steps that show the
problem, its impact, and the browser you used. Reproduce against a local
build (`npm run dev`) where you can.

## What to expect

The project is maintained by one person.

- Acknowledgement within 7 days.
- An assessment and a fix plan within 30 days.
- Coordinated disclosure: the fix ships with a GitHub advisory that
  credits you unless you ask otherwise. If a fix needs more than 90 days
  we agree a disclosure date with you.

## Scope

In scope:

- The site's own code (`app/`, `components/`, `lib/`, `content/`,
  `scripts/`), its dependencies, build and deployment.
- Any path by which the site, a third-party script, analytics or logging
  could observe a visitor's queried addresses or query results.
- Cross-site scripting, dependency or supply-chain compromise of the
  deployed site.
- A vendored client (`vendor/`) that no longer verifies the current
  production pins, or documentation that tells integrators to skip a
  verification step.

Out of scope:

- The PIR protocol, the servers and the browser client's own logic
  (Bitcoin-PIR/Bitcoin-PIR), and the credit issuer and mint
  (Bitcoin-PIR/issuer).
- Volume denial of service against the live servers the playground
  queries; they are rate-limited by design.
- Vulnerabilities in upstream frameworks and hosting. Report those
  upstream, and tell us if they affect this site.

## Supported versions

Only the `main` branch and the deployed site receive fixes.

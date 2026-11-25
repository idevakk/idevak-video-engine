# Asset Sources

- `assets/webref/ignis-repo.png`
  - Source URL: `https://github.com/gpillon/ignis`
  - Publisher: GitHub (`gpillon/ignis`)
  - Description: Repository overview page showing the About sidebar ("An inference engine for NVIDIA RTX...")
  - Native dimensions: `2560x1480` (`1280x740` viewport at `2x` DPR)
  - Capture method: `node scripts/capture_webref.mjs --url "https://github.com/gpillon/ignis" --out "assets/webref/ignis-repo.png" --highlight "An inference engine for NVIDIA RTX" --color-scheme dark`

- `assets/webref/aws-backoff.png`
  - Source URL: `https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/`
  - Publisher: Amazon Web Services (AWS Builders Library)
  - Description: Section discussing exponential backoff and capped backoff behavior
  - Native dimensions: `2560x1480` (`1280x740` viewport at `2x` DPR)
  - Capture method: `node scripts/capture_webref.mjs --url "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" --out "assets/webref/aws-backoff.png" --highlight "Exponential backoff can lead to very long backoff times, because exponential functions grow quickly." --color-scheme dark`

- `assets/webref/rfc6749.png`
  - Source URL: `https://datatracker.ietf.org/doc/html/rfc6749#section-4.1`
  - Publisher: IETF Datatracker (RFC 6749)
  - Description: OAuth 2.0 Authorization Framework Section 1.3.1 (Authorization Code)
  - Native dimensions: `2560x1480` (`1280x740` viewport at `2x` DPR)
  - Capture method: `node scripts/capture_webref.mjs --url "https://datatracker.ietf.org/doc/html/rfc6749#section-4.1" --out "assets/webref/rfc6749.png" --highlight "authorization code" --color-scheme light`

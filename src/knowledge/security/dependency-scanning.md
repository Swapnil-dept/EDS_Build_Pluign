# Dependency Scanning Reference

## Package Manifest Files by Ecosystem

| Ecosystem | Manifest | Lockfile |
|-----------|----------|----------|
| npm / yarn | `package.json` | `package-lock.json`, `yarn.lock` |
| pnpm | `package.json` | `pnpm-lock.yaml` |
| Maven | `pom.xml` | — |
| Gradle | `build.gradle`, `build.gradle.kts` | `gradle.lockfile` |
| Python (pip) | `requirements.txt` | — |
| Python (Pipenv) | `Pipfile` | `Pipfile.lock` |
| Python (Poetry) | `pyproject.toml` | `poetry.lock` |
| NuGet | `*.csproj`, `packages.config` | `Directory.Packages.props` |
| Go | `go.mod` | `go.sum` |
| Rust | `Cargo.toml` | `Cargo.lock` |
| Ruby | `Gemfile` | `Gemfile.lock` |
| PHP | `composer.json` | `composer.lock` |

## Vulnerability Databases

Cross-reference dependencies against these sources:

- **NVD** (National Vulnerability Database) — nvd.nist.gov
- **GitHub Advisory Database** — github.com/advisories
- **OSV** (Open Source Vulnerabilities) — osv.dev
- **Snyk Vulnerability Database** — snyk.io/vuln
- **npm audit** — built into npm CLI
- **pip-audit** — PyPI vulnerability scanning
- **OWASP Dependency-Check** — owasp.org/www-project-dependency-check

## What to Report Per Vulnerable Dependency

For each vulnerable dependency found:

- **Library name** and **current version**
- **Patched version** (minimum version that fixes the vulnerability)
- **CVE identifier(s)**
- **Severity** (CVSS score and qualitative rating)
- **Migration notes** — is the upgrade a breaking change? What API changes are needed?
- **Transitive vs direct** — is this a direct dependency or pulled in transitively?

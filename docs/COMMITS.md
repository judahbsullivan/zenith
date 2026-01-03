## TL;DR
***If you find that this is tanking your productivity just use `feat` or `fix` and always apply `!` if pushing breaking changes***

## Why bother with conventional commits?
- _The most important reason for us is to simplify/automate SemVer and our Release strategy_
- For this reason, please prefix all commits with one of the below [Prefixes](#prefixes)

## How does this relate to SemVer?
- `fix` type commits should be translated to `PATCH` releases.
- `feat` type commits should be translated to `MINOR` releases.
- Commits with `BREAKING CHANGE` or `!` (e.g. `feat!: extend parser`) in the commits, regardless of type, should be translated to `MAJOR` releases.

## Prefixes
| Commit Prefix   | SemVer Equivalent | Example                              |
| --------------- | ----------------- | ------------------------------------ |
| fix:            | PATCH - 0.0.n     | fix: html not recognizing state      |
| feat:           | MINOR - 0.n.0     | feat: phase 2 event loop             |
| fix!:           | MAJOR - n.0.0     | fix!: html not recognizing state     |
| feat!:          | MAJOR - n.0.0     | feat!: phase 2 event loop            |
| BREAKING CHANGE | MAJOR - n.0.0     | fix: BREAKING CHANGE component state |
| BREAKING-CHANGE | MAJOR - n.0.0     | feat: BREAKING-CHANGE build phase 2  |
| docs:           | CHANGELOG         | ...                                  |
| chore:          | CHANGELOG         | ...                                  |
| style:          | CHANGELOG         | ...                                  |
| test:           | CHANGELOG         | ...                                  |
| refactor:       | CHANGELOG         | ...                                  |

### Glossary

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
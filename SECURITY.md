# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an e-mail to the project maintainers. All security vulnerabilities will be promptly addressed.

### Secrets

**NEVER** commit secrets (API keys, passwords, etc.) to the repository.
- Use `.env.local` for local development secrets.
- Ensure `.env.local` is in `.gitignore`.
- Use environment variables in production.

### Best Practices

- Keep dependencies up to date.
- Review code for injection vulnerabilities before merging.
- Do not use `dangerouslySetInnerHTML` without sanitization.

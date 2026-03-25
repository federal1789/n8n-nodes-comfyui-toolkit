# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

To report a vulnerability, open a [GitHub Security Advisory](https://github.com/federal1789/n8n-nodes-comfyui-toolkit/security/advisories/new) (private). You will receive a response within 5 business days.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested fix if you have one

## Security Considerations

This package runs inside n8n as a community node and communicates with a locally reachable ComfyUI instance.

- **ComfyUI URL is not authenticated by default.** Ensure your ComfyUI instance is not exposed to the public internet without authentication.
- **Workflow JSON is executed as-is** on ComfyUI. Only load workflows from trusted sources.
- **Generated files are returned as base64** inside n8n. Do not pass untrusted filenames directly to filesystem operations downstream.

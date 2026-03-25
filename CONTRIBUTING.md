# Contributing to n8n-nodes-comfyui-toolkit

Thank you for your interest in contributing! Here's how to get started.

## Reporting Issues

- Search [existing issues](https://github.com/federal1789/n8n-nodes-comfyui-toolkit/issues) before opening a new one.
- Use the **Bug Report** template for bugs and the **Feature Request** template for ideas.
- Include your n8n version, ComfyUI version, and the full error message when reporting bugs.

## Development Setup

```bash
git clone https://github.com/federal1789/n8n-nodes-comfyui-toolkit.git
cd n8n-nodes-comfyui-toolkit
npm install
```

## Making Changes

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes.
3. Add or update tests in `tests/` to cover your changes.
4. Run the full check before committing:
   ```bash
   npm run lint && npm run build && npm test
   ```
   All three must pass.
5. Open a Pull Request against `main`.

## Adding a New Node

- Place each node in its own directory under `nodes/` (e.g. `nodes/ComfyUIMyNode/`).
- Include a `.ts` source file and a `comfyui.svg` icon.
- Register the compiled path in `package.json` under `n8n.nodes`.
- Add at least one test file under `tests/nodes/`.

## Commit Style

Use short, imperative commit messages:

```
feat: add ComfyUI Inpainting node
fix: handle empty subfolder in GetResults
chore: bump dependencies
```

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Link the related issue in the PR description (`Closes #123`).
- Make sure CI passes before requesting a review.
- Add an entry to [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]`.

## Code Style

- TypeScript strict mode is enabled — avoid `any`.
- Follow the patterns established in existing nodes (see `nodes/shared/` for shared utilities).
- Run `npm run lint` to check for style issues.

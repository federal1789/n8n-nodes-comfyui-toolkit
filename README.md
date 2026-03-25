# n8n-nodes-comfyui-toolkit

[![npm version](https://img.shields.io/npm/v/n8n-nodes-comfyui-toolkit)](https://www.npmjs.com/package/n8n-nodes-comfyui-toolkit)
[![CI](https://github.com/federal1789/n8n-comfyui-nodes/actions/workflows/ci.yml/badge.svg)](https://github.com/federal1789/n8n-comfyui-nodes/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Connect [ComfyUI](https://github.com/comfyanonymous/ComfyUI) to your n8n workflows. Generate images and videos, upload reference images, poll for results, and download outputs — all without leaving n8n.

## Nodes

| Node | Description |
|------|-------------|
| **ComfyUI Upload Image** | Uploads a binary or base64 image to ComfyUI's input directory. Returns `filename` for use in workflow JSON. |
| **ComfyUI Text to Image** | Submits a text-to-image workflow to ComfyUI and returns `prompt_id`. |
| **ComfyUI Image to Image** | Submits an image-to-image workflow to ComfyUI and returns `prompt_id`. |
| **ComfyUI Text to Video** | Submits a text-to-video workflow to ComfyUI and returns `prompt_id`. |
| **ComfyUI Image to Video** | Submits an image-to-video workflow to ComfyUI and returns `prompt_id`. |
| **ComfyUI Wait Until Result** | Polls `/history` until the job completes. Outputs one item per generated file. |
| **ComfyUI Get Results** | Downloads all generated files from ComfyUI and returns base64-encoded data. |

## Typical Workflow

```
[Trigger] ──► [Text to Image] ──► [Wait Until Result] ──► [Get Results]
```

For image-to-image or image-to-video, prepend an **Upload Image** node:

```
[Trigger] ──► [Upload Image] ──► [Image to Image] ──► [Wait Until Result] ──► [Get Results]
```

## Prerequisites

- **n8n** ≥ 1.0.0 (self-hosted)
- **ComfyUI** running and reachable from your n8n instance
- A ComfyUI workflow exported in **API format** (enable *Dev Mode* in ComfyUI settings, then use *Save (API Format)*)

## Installation

### Via n8n Community Nodes UI (recommended)

1. Open n8n → **Settings → Community Nodes**
2. Click **Install** and enter: `n8n-nodes-comfyui-toolkit`
3. Confirm and restart n8n when prompted

### Via Docker (manual)

```bash
docker exec -it n8n sh -c "cd /home/node/.n8n/nodes && npm install n8n-nodes-comfyui-toolkit"
docker restart n8n
```

### Local development deploy (Windows)

Run `deploy-to-n8n.bat` — builds, packs, and installs into your Docker n8n container automatically.

## Node Reference

### ComfyUI Upload Image

| Parameter | Type | Description |
|-----------|------|-------------|
| ComfyUI URL | string | Base URL of your ComfyUI instance |
| Image Source | options | `Binary Field` — from an n8n binary property; `Base64 String` — from a JSON field |
| Binary Property | string | Binary property name (when source = Binary Field) |
| Base64 JSON Field | string | Dot-separated JSON path to the base64 string (when source = Base64 String) |
| Subfolder | string | Optional subfolder inside ComfyUI's `input/` directory |
| Overwrite | boolean | Overwrite an existing file with the same name |

**Output:** all input JSON fields plus `filename`, `subfolder`, `type`, `comfyui_url`.

---

### ComfyUI Text to Image / Image to Image / Text to Video / Image to Video

All four generation nodes share the same parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| ComfyUI URL | string | Base URL of your ComfyUI instance |
| Session ID | string | Identifier to correlate this job with a conversation or request |
| Workflow JSON | string | ComfyUI API-format workflow. Accepts both `{"prompt":{…}}` and the bare `{…}` prompt object. n8n expressions supported. |

**Output:** `prompt_id`, `session_id`, `submitted: true`, `comfyui_url`.

---

### ComfyUI Wait Until Result

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| ComfyUI URL | string | `http://host.docker.internal:8188` | Base URL |
| Prompt ID | string | `={{ $json.prompt_id }}` | `prompt_id` returned by an upstream gen-AI node |
| Session ID | string | `={{ $json.session_id }}` | Passed through to output |
| Timeout (Seconds) | number | 120 | Throws if the job does not complete within this time |
| Poll Interval (Seconds) | number | 5 | How often to check ComfyUI's `/history` endpoint |

**Output (one item per file):** `filename`, `type`, `subfolder`, `media_type`, `node_id`, `file_index`, `total_files`, `duration_ms`, `prompt_id`, `session_id`, `completed: true`, `comfyui_url`.

> **Note:** If ComfyUI completes a job in 0.00 s (identical workflow submitted twice with the same seed), this node throws immediately with a descriptive error rather than waiting for the full timeout. Use a random seed in your workflow to prevent deduplication.

---

### ComfyUI Get Results

| Parameter | Type | Description |
|-----------|------|-------------|
| ComfyUI URL | string | Base URL of your ComfyUI instance |

Accepts all items output by **Wait Until Result** and aggregates them into a single output item.

**Output:** `success`, `prompt_id`, `unique_id`, `total_files`, `imageUrl[]`.

Each entry in `imageUrl`: `filename`, `type`, `subfolder`, `media_type`, `data` (base64-encoded file content).

## Development

```bash
git clone https://github.com/federal1789/n8n-comfyui-nodes.git
cd n8n-comfyui-nodes
npm install

npm run build   # compile TypeScript → dist/
npm test        # run Jest tests
npm run lint    # ESLint
```

## Publishing a new version

1. Bump the version in `package.json`
2. Commit and push
3. Create a git tag:
   ```bash
   git tag v1.x.x
   git push --tags
   ```

GitHub Actions will build, test, and publish to npm automatically.

To configure publishing, add your npm token as a repository secret named **`NPM_TOKEN`** in GitHub → Settings → Secrets and variables → Actions.

## Contributing

Pull requests are welcome. For significant changes, please open an issue first.

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run `npm test && npm run lint` — both must pass
5. Open a Pull Request

## License

MIT © [Ilker Umut](https://github.com/federal1789)

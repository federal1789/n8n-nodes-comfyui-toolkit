import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

interface ComfyFile {
  filename: string;
  type: string;
  subfolder: string;
}

type HistoryResponse = Record<
  string,
  {
    outputs?: Record<
      string,
      {
        images?: ComfyFile[];
        gifs?: ComfyFile[];
        videos?: ComfyFile[];
      }
    >;
    status?: { completed?: boolean };
  }
>;

type HistoryResult =
  | { status: 'found'; files: Array<ComfyFile & { node_id: string; media_type: string }> }
  | { status: 'completed_no_output' }
  | { status: 'not_found' };

export class ComfyUIWaitUntilResult implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComfyUI Wait Until Result',
    name: 'comfyUiWaitUntilResult',
    icon: 'file:comfyui.svg',
    group: ['transform'],
    version: 1,
    description:
      'Polls ComfyUI until the submitted job completes. Connect after a gen-AI node. Outputs one item per generated file.',
    defaults: { name: 'ComfyUI Wait Until Result' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'ComfyUI URL',
        name: 'comfyuiUrl',
        type: 'string',
        default: 'http://host.docker.internal:8188',
        description: 'Base URL of your ComfyUI instance',
        noDataExpression: false,
      },
      {
        displayName: 'Prompt ID',
        name: 'promptId',
        type: 'string',
        default: '={{ $json.prompt_id }}',
        description: 'The prompt_id returned by a gen-AI node',
        noDataExpression: false,
      },
      {
        displayName: 'Session ID',
        name: 'sessionId',
        type: 'string',
        default: '={{ $json.session_id }}',
        description: 'Session identifier passed through from the gen-AI node',
        noDataExpression: false,
      },
      {
        displayName: 'Timeout (Seconds)',
        name: 'timeout',
        type: 'number',
        default: 120,
        description: 'Maximum seconds to wait before throwing a timeout error',
      },
      {
        displayName: 'Poll Interval (Seconds)',
        name: 'pollInterval',
        type: 'number',
        default: 5,
        description: 'How often to check /history for completion',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const comfyuiUrl = (this.getNodeParameter('comfyuiUrl', 0) as string).replace(/\/$/, '');
    const promptId = this.getNodeParameter('promptId', 0) as string;
    const sessionId = this.getNodeParameter('sessionId', 0) as string;
    const timeoutSeconds = this.getNodeParameter('timeout', 0, 120) as number;
    const pollIntervalSeconds = this.getNodeParameter('pollInterval', 0, 5) as number;

    const startTime = Date.now();
    const maxAttempts = Math.ceil(timeoutSeconds / pollIntervalSeconds);

    const checkHistory = async (): Promise<HistoryResult> => {
      try {
        const resp = (await this.helpers.httpRequest({
          method: 'GET',
          url: `${comfyuiUrl}/history/${promptId}`,
          json: true,
        })) as HistoryResponse;

        const entry = resp[promptId];

        // No entry at all — job not in history yet (still in queue or not submitted)
        if (!entry) return { status: 'not_found' };

        // Entry exists — job has been processed by ComfyUI (even if 0.00s cached)
        const files: Array<ComfyFile & { node_id: string; media_type: string }> = [];

        for (const [nodeId, nodeOutput] of Object.entries(entry.outputs ?? {})) {
          const sources = [
            { items: nodeOutput.images, media: 'image' },
            { items: nodeOutput.gifs, media: 'video' },
            { items: nodeOutput.videos, media: 'video' },
          ];
          for (const src of sources) {
            for (const f of src.items ?? []) {
              files.push({ ...f, node_id: nodeId, media_type: src.media });
            }
          }
        }

        if (files.length > 0) return { status: 'found', files };

        // History entry exists but no output files — ComfyUI ran the job in 0.00s
        // (duplicate/cached result). No new files were written.
        return { status: 'completed_no_output' };
      } catch {
        return { status: 'not_found' };
      }
    };

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      const result = await checkHistory();

      if (result.status === 'found') {
        const durationMs = Date.now() - startTime;
        return [
          result.files.map((f, fi) => ({
            json: {
              prompt_id: promptId,
              session_id: sessionId,
              completed: true,
              filename: f.filename,
              type: f.type,
              subfolder: f.subfolder ?? '',
              node_id: f.node_id,
              media_type: f.media_type,
              file_index: fi,
              total_files: result.files.length,
              duration_ms: durationMs,
              comfyui_url: comfyuiUrl,
            },
          })),
        ];
      }

      if (result.status === 'completed_no_output') {
        throw new NodeOperationError(
          this.getNode(),
          'ComfyUI completed the job in 0.00s with no new output files. ' +
            'This typically means the workflow was deduplicated (same seed + same inputs). ' +
            'Use a random seed in your workflow to force a new generation.',
        );
      }

      // status === 'not_found' — still in queue, wait and retry
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalSeconds * 1000));
      }
    }

    throw new NodeOperationError(
      this.getNode(),
      `Timeout: generation did not complete within ${timeoutSeconds}s`,
    );
  }
}

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

function getMimeType(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return map[ext] ?? 'application/octet-stream';
}

export class ComfyUIGetResults implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComfyUI Get Results',
    name: 'comfyUiGetResults',
    icon: 'file:comfyui.svg',
    group: ['output'],
    version: 1,
    description:
      'Downloads all generated files from ComfyUI (/view) and outputs a single aggregated item with base64-encoded data. Connect after "ComfyUI Wait Until Result".',
    defaults: { name: 'ComfyUI Get Results' },
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
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

    if (items.length === 0) {
      return [[{ json: { success: false, total_files: 0, imageUrl: [] } }]];
    }

    const comfyuiUrl = (this.getNodeParameter('comfyuiUrl', 0) as string).replace(/\/$/, '');

    let promptId: string | null = null;
    let uniqueId: string | null = null;

    const imageUrl: Array<{
      filename: string;
      type: string;
      subfolder: string;
      media_type: string;
      data: string;
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i].json;
      const filename = item.filename as string | undefined;

      if (!filename) continue;

      if (promptId === null) {
        promptId = (item.prompt_id as string | undefined) ?? null;
        uniqueId = (item.session_id as string | undefined) ?? null;
      }

      const fileType = (item.type as string | undefined) ?? 'output';
      const subfolder = (item.subfolder as string | undefined) ?? '';

      let rawData: Buffer;
      try {
        const response = await this.helpers.httpRequest({
          method: 'GET',
          url: `${comfyuiUrl}/view`,
          qs: { filename, type: fileType, subfolder },
          encoding: 'arraybuffer',
          returnFullResponse: false,
        });
        rawData = Buffer.isBuffer(response) ? response : Buffer.from(response as ArrayBuffer);
      } catch (err) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to download "${filename}" from ComfyUI: ${(err as Error).message}`,
          { itemIndex: i },
        );
      }

      imageUrl.push({
        filename,
        type: fileType,
        subfolder,
        media_type: (item.media_type as string | undefined) ?? getMimeType(filename),
        data: rawData.toString('base64'),
      });
    }

    return [
      [
        {
          json: {
            success: imageUrl.length > 0,
            prompt_id: promptId,
            unique_id: uniqueId,
            total_files: imageUrl.length,
            imageUrl,
          },
        },
      ],
    ];
  }
}

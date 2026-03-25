import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import FormData from 'form-data';

function normalizeMime(raw: string | undefined | null): string {
  if (!raw) return '';
  const clean = raw.replace(/^=+/, '').toLowerCase().trim();
  if (!clean) return '';
  if (!clean.includes('/')) {
    const short: Record<string, string> = {
      jpeg: 'image/jpeg', jpg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
      gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
    };
    return short[clean] ?? `image/${clean}`;
  }
  return clean === 'image/jpg' ? 'image/jpeg' : clean;
}

function detectMimeFromBuffer(buf: Buffer): string {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  if (buf[0] === 0x42 && buf[1] === 0x4D) return 'image/bmp';
  if (
    buf.length > 11 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return 'image/jpeg';
}

function fixExtension(name: string, mime: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
    'image/bmp': 'bmp', 'image/tiff': 'tiff',
  };
  const ext = mimeToExt[mime];
  if (!ext) return name;
  const base = name.replace(/\.[^.]+$/, '');
  return `${base}.${ext}`;
}

export class ComfyUIUploadImage implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComfyUI Upload Image',
    name: 'comfyUiUploadImage',
    icon: 'file:comfyui.svg',
    group: ['input'],
    version: 1,
    description:
      'Uploads an image to ComfyUI (/upload/image). Returns filename for use in Workflow JSON via {{ $json.filename }}.',
    defaults: { name: 'ComfyUI Upload Image' },
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
        displayName: 'Image Source',
        name: 'imageSource',
        type: 'options',
        options: [
          {
            name: 'Binary Field',
            value: 'binary',
            description: 'Image is in an n8n binary property (e.g. from HTTP Request, Edit Image)',
          },
          {
            name: 'Base64 String (JSON field)',
            value: 'base64',
            description: 'Image is a base64 string stored in a JSON field (e.g. from Webhook body)',
          },
        ],
        default: 'binary',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property containing the image',
        noDataExpression: true,
        displayOptions: { show: { imageSource: ['binary'] } },
      },
      {
        displayName: 'Base64 JSON Field',
        name: 'base64Field',
        type: 'string',
        default: 'data',
        description: 'Name of the JSON field containing the base64 image string',
        noDataExpression: true,
        displayOptions: { show: { imageSource: ['base64'] } },
      },
      {
        displayName: 'Subfolder',
        name: 'subfolder',
        type: 'string',
        default: '',
        description: 'Optional subfolder inside ComfyUI input directory',
        noDataExpression: false,
      },
      {
        displayName: 'Overwrite',
        name: 'overwrite',
        type: 'boolean',
        default: true,
        description: 'Whether to overwrite if a file with the same name already exists',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const comfyuiUrl = (this.getNodeParameter('comfyuiUrl', i) as string).replace(/\/$/, '');
      const imageSource = this.getNodeParameter('imageSource', i) as string;
      const subfolder = this.getNodeParameter('subfolder', i) as string;
      const overwrite = this.getNodeParameter('overwrite', i) as boolean;

      let binaryBuffer: Buffer;
      let mimeType: string;
      let fileName: string;

      if (imageSource === 'base64') {
        const base64Field = this.getNodeParameter('base64Field', i) as string;
        const base64Raw = (
          base64Field.split('.').reduce(
            (obj: unknown, key: string) =>
              obj && typeof obj === 'object'
                ? (obj as Record<string, unknown>)[key]
                : undefined,
            items[i].json as unknown,
          ) as string | undefined
        ) ?? '';

        if (!base64Raw) {
          throw new NodeOperationError(
            this.getNode(),
            `JSON field "${base64Field}" is empty or missing.`,
            { itemIndex: i },
          );
        }

        const dataUriMatch = base64Raw.match(/^data:([^;,]+);base64,/);
        const base64Clean = base64Raw.replace(/^=+/, '').replace(/^data:[^,]+,/, '');
        binaryBuffer = Buffer.from(base64Clean, 'base64');
        mimeType = dataUriMatch ? dataUriMatch[1] : detectMimeFromBuffer(binaryBuffer);
        fileName = fixExtension('image', mimeType);
      } else {
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
        binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
        mimeType = normalizeMime(binaryData.mimeType ?? 'image/png');
        fileName = fixExtension(binaryData.fileName ?? 'image', mimeType);
      }

      const formData = new FormData();
      formData.append('image', binaryBuffer, { filename: fileName, contentType: mimeType });
      if (subfolder) formData.append('subfolder', subfolder);
      formData.append('type', 'input');
      formData.append('overwrite', String(overwrite));

      const bodyBuffer = formData.getBuffer();
      const bodyHeaders = {
        ...formData.getHeaders(),
        'Content-Length': String(bodyBuffer.length),
      };

      let uploadResponse: { name: string; subfolder: string; type: string };
      try {
        uploadResponse = (await this.helpers.httpRequest({
          method: 'POST',
          url: `${comfyuiUrl}/upload/image`,
          body: bodyBuffer,
          headers: bodyHeaders,
        })) as { name: string; subfolder: string; type: string };
      } catch (err) {
        throw new NodeOperationError(
          this.getNode(),
          `Failed to upload image to ComfyUI: ${(err as Error).message}`,
          { itemIndex: i },
        );
      }

      returnData.push({
        json: {
          ...items[i].json,
          filename: uploadResponse.name,
          subfolder: uploadResponse.subfolder ?? '',
          type: uploadResponse.type ?? 'input',
          comfyui_url: comfyuiUrl,
        },
        binary: items[i].binary,
      });
    }

    return [returnData];
  }
}

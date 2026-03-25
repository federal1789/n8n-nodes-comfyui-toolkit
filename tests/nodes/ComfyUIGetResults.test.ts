import type { IExecuteFunctions } from 'n8n-workflow';
import { ComfyUIGetResults } from '../../nodes/ComfyUIGetResults/ComfyUIGetResults.node';

function makeCtx(items: unknown[], httpResp: unknown = Buffer.from('fake')) {
  return {
    getInputData: () => items,
    getNodeParameter: (name: string, _i: number, def?: unknown) => {
      if (name === 'comfyuiUrl') return 'http://localhost:8188';
      return def;
    },
    getNode: () => ({
      name: 'GetResults',
      type: 'n8n-nodes-base.test',
      typeVersion: 1,
      position: [0, 0] as [number, number],
      id: '1',
      parameters: {},
    }),
    helpers: {
      httpRequest: jest.fn().mockResolvedValue(httpResp),
    },
  } as unknown as IExecuteFunctions;
}

describe('ComfyUIGetResults', () => {
  const node = new ComfyUIGetResults();

  it('returns empty result when there are no input items', async () => {
    const ctx = makeCtx([]);
    const result = await node.execute.call(ctx);
    expect(result[0][0].json.success).toBe(false);
    expect(result[0][0].json.total_files).toBe(0);
  });

  it('downloads file and returns base64-encoded data', async () => {
    const fileData = Buffer.from('png-bytes');
    const ctx = makeCtx(
      [
        {
          json: {
            prompt_id: 'pid',
            session_id: 'sid',
            filename: 'out.png',
            type: 'output',
            subfolder: '',
            media_type: 'image',
          },
        },
      ],
      fileData,
    );
    const result = await node.execute.call(ctx);
    expect(result[0][0].json.success).toBe(true);
    expect(result[0][0].json.total_files).toBe(1);
    expect(result[0][0].json.prompt_id).toBe('pid');
    const imageUrl = result[0][0].json.imageUrl as Array<{ data: string; filename: string }>;
    expect(imageUrl[0].data).toBe(fileData.toString('base64'));
    expect(imageUrl[0].filename).toBe('out.png');
  });

  it('skips items without a filename', async () => {
    const ctx = makeCtx([{ json: { prompt_id: 'pid' } }]);
    const result = await node.execute.call(ctx);
    expect(result[0][0].json.total_files).toBe(0);
    expect(result[0][0].json.success).toBe(false);
  });

  it('aggregates multiple files into a single output item', async () => {
    const ctx = makeCtx([
      { json: { filename: 'a.png', type: 'output', subfolder: '', media_type: 'image' } },
      { json: { filename: 'b.png', type: 'output', subfolder: '', media_type: 'image' } },
    ]);
    const result = await node.execute.call(ctx);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json.total_files).toBe(2);
    const imageUrl = result[0][0].json.imageUrl as Array<{ filename: string }>;
    expect(imageUrl.map((f) => f.filename)).toEqual(['a.png', 'b.png']);
  });
});

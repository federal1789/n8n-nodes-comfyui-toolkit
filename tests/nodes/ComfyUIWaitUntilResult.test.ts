import type { IExecuteFunctions } from 'n8n-workflow';
import { ComfyUIWaitUntilResult } from '../../nodes/ComfyUIWaitUntilResult/ComfyUIWaitUntilResult.node';

const PROMPT_ID = 'test-prompt-id';

function makeCtx(responses: unknown[], extra: Record<string, unknown> = {}) {
  let call = 0;
  return {
    getNodeParameter: (name: string, _i: number, def?: unknown) => {
      const p: Record<string, unknown> = {
        comfyuiUrl: 'http://localhost:8188',
        promptId: PROMPT_ID,
        sessionId: 'test-session',
        timeout: 1,
        pollInterval: 0.01,
        ...extra,
      };
      return name in p ? p[name] : def;
    },
    getNode: () => ({
      name: 'WaitUntilResult',
      type: 'n8n-nodes-base.test',
      typeVersion: 1,
      position: [0, 0] as [number, number],
      id: '1',
      parameters: {},
    }),
    helpers: {
      httpRequest: jest.fn().mockImplementation(() =>
        Promise.resolve(responses[Math.min(call++, responses.length - 1)]),
      ),
    },
  } as unknown as IExecuteFunctions;
}

function historyWith(files: object) {
  return { [PROMPT_ID]: { outputs: { '1': files } } };
}

describe('ComfyUIWaitUntilResult', () => {
  const node = new ComfyUIWaitUntilResult();

  it('returns one item per image when history has output', async () => {
    const ctx = makeCtx([
      historyWith({ images: [{ filename: 'out.png', type: 'output', subfolder: '' }] }),
    ]);
    const result = await node.execute.call(ctx);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].json.filename).toBe('out.png');
    expect(result[0][0].json.completed).toBe(true);
    expect(result[0][0].json.media_type).toBe('image');
  });

  it('classifies gifs and videos as media_type video', async () => {
    const ctx = makeCtx([
      historyWith({ gifs: [{ filename: 'clip.gif', type: 'output', subfolder: '' }] }),
    ]);
    const result = await node.execute.call(ctx);
    expect(result[0][0].json.media_type).toBe('video');
  });

  it('returns multiple items for multiple output files', async () => {
    const ctx = makeCtx([
      historyWith({
        images: [
          { filename: 'a.png', type: 'output', subfolder: '' },
          { filename: 'b.png', type: 'output', subfolder: '' },
        ],
      }),
    ]);
    const result = await node.execute.call(ctx);
    expect(result[0]).toHaveLength(2);
    expect(result[0][0].json.file_index).toBe(0);
    expect(result[0][1].json.file_index).toBe(1);
    expect(result[0][0].json.total_files).toBe(2);
  });

  it('retries when prompt is not in history yet', async () => {
    const ctx = makeCtx([
      {},
      historyWith({ images: [{ filename: 'late.png', type: 'output', subfolder: '' }] }),
    ]);
    const result = await node.execute.call(ctx);
    expect(result[0][0].json.filename).toBe('late.png');
  });

  it('throws immediately when job completed with no output (0.00s cached)', async () => {
    const ctx = makeCtx([{ [PROMPT_ID]: { outputs: {} } }]);
    await expect(node.execute.call(ctx)).rejects.toThrow('0.00s');
  });

  it('throws timeout error when job never appears in history', async () => {
    const ctx = makeCtx([{}], { timeout: 0.02, pollInterval: 0.01 });
    await expect(node.execute.call(ctx)).rejects.toThrow('Timeout');
  });
});

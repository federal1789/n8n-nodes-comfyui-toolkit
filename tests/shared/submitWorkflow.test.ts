import type { IExecuteFunctions } from 'n8n-workflow';
import { submitWorkflow } from '../../nodes/shared/submitWorkflow';

function makeCtx(
  params: Record<string, unknown>,
  httpResp: unknown = { prompt_id: 'test-123' },
) {
  return {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string, _i: number, def?: unknown) =>
      name in params ? params[name] : def,
    getNode: () => ({
      name: 'Test',
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

const BASE = {
  comfyuiUrl: 'http://localhost:8188',
  sessionId: 'session-1',
  workflowJson: '{"1":{"inputs":{},"class_type":"KSampler"}}',
};

describe('submitWorkflow', () => {
  it('submits workflow and returns prompt_id', async () => {
    const result = await submitWorkflow(makeCtx(BASE));
    expect(result[0][0].json.prompt_id).toBe('test-123');
    expect(result[0][0].json.submitted).toBe(true);
    expect(result[0][0].json.session_id).toBe('session-1');
  });

  it('unwraps {"prompt":{…}} envelope format', async () => {
    const wrapped = JSON.stringify({ prompt: JSON.parse(BASE.workflowJson) });
    const result = await submitWorkflow(makeCtx({ ...BASE, workflowJson: wrapped }));
    expect(result[0][0].json.submitted).toBe(true);
  });

  it('throws when workflowJson is empty', async () => {
    await expect(submitWorkflow(makeCtx({ ...BASE, workflowJson: '  ' }))).rejects.toThrow(
      'Workflow JSON is empty',
    );
  });

  it('throws when workflowJson is invalid JSON', async () => {
    await expect(
      submitWorkflow(makeCtx({ ...BASE, workflowJson: '{bad json}' })),
    ).rejects.toThrow('not valid JSON');
  });

  it('throws when ComfyUI returns no prompt_id', async () => {
    await expect(submitWorkflow(makeCtx(BASE, {}))).rejects.toThrow('prompt_id');
  });

  it('strips trailing slash from comfyuiUrl', async () => {
    const ctx = makeCtx({ ...BASE, comfyuiUrl: 'http://localhost:8188/' });
    const httpMock = (ctx.helpers.httpRequest as jest.Mock);
    await submitWorkflow(ctx);
    expect(httpMock.mock.calls[0][0].url).toBe('http://localhost:8188/prompt');
  });
});

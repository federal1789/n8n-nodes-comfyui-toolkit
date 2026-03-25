import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function submitWorkflow(
  context: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
  const items = context.getInputData();
  const result: INodeExecutionData[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const comfyuiUrl = context.getNodeParameter('comfyuiUrl', i) as string;
      const sessionId = context.getNodeParameter('sessionId', i) as string;
      const workflowJsonRaw = context.getNodeParameter('workflowJson', i) as string;

      if (!workflowJsonRaw?.trim()) {
        throw new NodeOperationError(context.getNode(), 'Workflow JSON is empty.', {
          itemIndex: i,
        });
      }

      let workflow: object;
      try {
        const parsed = JSON.parse(workflowJsonRaw) as Record<string, unknown>;
        workflow =
          parsed['prompt'] && typeof parsed['prompt'] === 'object'
            ? (parsed['prompt'] as object)
            : parsed;
      } catch {
        throw new NodeOperationError(
          context.getNode(),
          'Workflow JSON is not valid JSON. Check the field for syntax errors.',
          { itemIndex: i },
        );
      }

      const submitResponse = (await context.helpers.httpRequest({
        method: 'POST',
        url: `${comfyuiUrl.replace(/\/$/, '')}/prompt`,
        body: { prompt: workflow },
        json: true,
      })) as { prompt_id: string };

      const { prompt_id } = submitResponse;
      if (!prompt_id) {
        throw new NodeOperationError(
          context.getNode(),
          'ComfyUI did not return a prompt_id. Make sure the Workflow JSON is in API format.',
          { itemIndex: i },
        );
      }

      result.push({
        json: {
          prompt_id,
          session_id: sessionId,
          submitted: true,
          comfyui_url: comfyuiUrl,
        },
      });
    } catch (error) {
      if (error instanceof NodeOperationError) throw error;
      throw new NodeOperationError(context.getNode(), (error as Error).message, { itemIndex: i });
    }
  }

  return [result];
}

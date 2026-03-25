import type { INodeProperties } from 'n8n-workflow';

export const GEN_AI_PROPERTIES: INodeProperties[] = [
  {
    displayName: 'ComfyUI URL',
    name: 'comfyuiUrl',
    type: 'string',
    default: 'http://host.docker.internal:8188',
    description: 'Base URL of your ComfyUI instance',
    noDataExpression: false,
  },
  {
    displayName: 'Session ID',
    name: 'sessionId',
    type: 'string',
    default: '',
    description:
      'Unique identifier for this conversation or request (e.g. webhook body field). Stored alongside prompt_id.',
    noDataExpression: false,
  },
  {
    displayName: 'Workflow JSON',
    name: 'workflowJson',
    type: 'string',
    typeOptions: { rows: 12 },
    default: '',
    description:
      'ComfyUI API-format workflow. Accepts {"prompt":{…}} (full export) or {…} (prompt object only). n8n expressions are supported.',
    noDataExpression: false,
  },
];

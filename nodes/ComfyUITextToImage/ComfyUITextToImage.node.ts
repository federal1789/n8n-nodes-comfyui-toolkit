import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { GEN_AI_PROPERTIES } from '../shared/genAiProperties';
import { submitWorkflow } from '../shared/submitWorkflow';

export class ComfyUITextToImage implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComfyUI Text to Image',
    name: 'comfyUiTextToImage',
    icon: 'file:comfyui.svg',
    group: ['transform'],
    version: 1,
    description:
      'Submits a text-to-image ComfyUI workflow. Returns a prompt_id. Connect to "ComfyUI Wait Until Result" to poll for completion.',
    defaults: { name: 'ComfyUI Text to Image' },
    inputs: ['main'],
    outputs: ['main'],
    properties: GEN_AI_PROPERTIES,
  };

  async execute(this: IExecuteFunctions) {
    return submitWorkflow(this);
  }
}

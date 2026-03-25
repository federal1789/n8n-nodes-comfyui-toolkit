import type { IExecuteFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { GEN_AI_PROPERTIES } from '../shared/genAiProperties';
import { submitWorkflow } from '../shared/submitWorkflow';

export class ComfyUIImageToImage implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'ComfyUI Image to Image',
    name: 'comfyUiImageToImage',
    icon: 'file:comfyui.svg',
    group: ['transform'],
    version: 1,
    description:
      'Submits an image-to-image ComfyUI workflow. Returns a prompt_id. Use "ComfyUI Upload Image" first to upload your input image and reference the filename in the Workflow JSON.',
    defaults: { name: 'ComfyUI Image to Image' },
    inputs: ['main'],
    outputs: ['main'],
    properties: GEN_AI_PROPERTIES,
  };

  async execute(this: IExecuteFunctions) {
    return submitWorkflow(this);
  }
}

export type ToolInputSchema = {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: ToolInputSchema;
};

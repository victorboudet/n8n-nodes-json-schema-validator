import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import Ajv from 'ajv';

export class JsonSchemaValidator implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'JSON Schema Validator',
        name: 'jsonSchemaValidator',
        group: ['transform'],
        version: 1,
        description: 'Validates a JSON object against a JSON schema',
        defaults: {
            name: 'JSON Schema Validator',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        properties: [
            {
                displayName: 'JSON Object',
                name: 'jsonObject',
                type: 'json',
                default: '',
                placeholder: '{"key": "value"}',
                description: 'The JSON object to validate',
            },
            {
                displayName: 'JSON Schema',
                name: 'jsonSchema',
                type: 'json',
                default: '',
                placeholder: '{"type": "object", "properties": {"key": {"type": "string"}}}',
                description: 'The JSON schema to validate against',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const ajv = new Ajv();

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                // Get parameters
                const jsonObject = this.getNodeParameter('jsonObject', itemIndex, {}) as object;
                const jsonSchema = this.getNodeParameter('jsonSchema', itemIndex, {}) as object;

                // Validate JSON against schema
                const validate = ajv.compile(jsonSchema);
                const isValid = validate(jsonObject);

                // Add validation result to the output
                items[itemIndex].json = {
                    ...items[itemIndex].json,
                    isValid,
                    errors: validate.errors || [],
                };
            } catch (error) {
                if (this.continueOnFail()) {
                    items[itemIndex] = {
                        json: {
                            error: error.message,
                        },
                    };
                } else {
                    throw new NodeOperationError(this.getNode(), error, { itemIndex });
                }
            }
        }

        return [items];
    }
}
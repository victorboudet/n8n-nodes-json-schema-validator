import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonTypeGen } from 'json_typegen_wasm';

export class JsonSchemaValidator implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'JSON Schema Generator',
        name: 'jsonSchemaGenerator',
        group: ['transform'],
        version: 1,
        description: 'Generates a JSON schema from a JSON sample',
        defaults: {
            name: 'JSON Schema Generator',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'JSON Sample',
                name: 'jsonSample',
                type: 'json',
                default: '',
                placeholder: '{"key": "value"}',
                description: 'The JSON sample to generate a schema from',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                // Get JSON sample
                const jsonSample = this.getNodeParameter('jsonSample', itemIndex, {}) as string;

                // Generate schema using json_typegen_wasm
                const schema = jsonTypeGen('GeneratedSchema', JSON.stringify(jsonSample));

                // Add generated schema to the output
                items[itemIndex].json = {
                    ...items[itemIndex].json,
                    schema,
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
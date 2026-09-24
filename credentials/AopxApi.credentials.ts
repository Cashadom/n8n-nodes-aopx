import type {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class AopxApi implements ICredentialType {
  name = 'aopxApi';

  displayName = 'AOPX API';

  documentationUrl = 'https://aopx.fr';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.aopx.fr',
      required: true,
      description: 'Base URL of the AOPX API',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: false,
      description:
        'Optional during the public beta. Keep this field ready for authenticated AOPX access.',
    },
  ];
}

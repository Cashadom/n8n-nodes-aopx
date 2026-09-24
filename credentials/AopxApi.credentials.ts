import type {
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IHttpRequestOptions,
  INodeProperties,
} from 'n8n-workflow';

export class AopxApi implements ICredentialType {
  name = 'aopxApi';

  displayName = 'AOPX API';

  documentationUrl = 'https://aopx.fr';

  icon = 'file:../nodes/Aopx/aopx.svg' as const;

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

  async authenticate(
    credentials: ICredentialDataDecryptedObject,
    requestOptions: IHttpRequestOptions,
  ): Promise<IHttpRequestOptions> {
    requestOptions.headers = requestOptions.headers ?? {};

    const apiKey =
      typeof credentials.apiKey === 'string'
        ? credentials.apiKey.trim()
        : '';

    if (apiKey) {
      requestOptions.headers.Authorization = `Bearer ${apiKey}`;
    }

    return requestOptions;
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/public/stats',
      method: 'GET',
    },
  };
}

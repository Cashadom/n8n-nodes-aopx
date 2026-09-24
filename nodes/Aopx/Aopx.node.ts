import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';

import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from 'n8n-workflow';

type AopxCredentials = {
  baseUrl: string;
};

type SearchProfile = 'FACTUAL' | 'COMPARISON' | 'NEWS';

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}


function evidenceMetadata(profile: SearchProfile): IDataObject {
  if (profile === 'NEWS') {
    return {
      search_profile: 'NEWS',
      evidence_status: 'EXPERIMENTAL',
      evidence_note:
        'LAB-008 ended PIVOT. No provider is currently validated for NEWS CRITICAL.',
      evidence_run_id: 'LAB008-B1946F98CF',
      evidence_scoring: 'search-v4-news',
      production_effect: 'NONE',
    };
  }

  return {
    search_profile: profile,
    evidence_status: 'BETA',
    evidence_note:
      'AOPX recommendation uses the active production policy and available evidence. This label is not a universal provider-quality claim.',
  };
}

export class Aopx implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AOPX',
    name: 'aopx',
    icon: { light: 'file:aopx.svg', dark: 'file:aopx.svg' },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Evidence-based provider selection for software-agent search workflows',
    defaults: {
      name: 'AOPX',
    },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'aopxApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Recommend Provider',
            value: 'recommendProvider',
            action: 'Recommend a search provider',
            description:
              'Ask AOPX which supported provider path to use for a search task',
          },
          {
            name: 'Report Outcome',
            value: 'reportOutcome',
            action: 'Report a production outcome',
            description:
              'Report what actually happened after executing an AOPX recommendation',
          },
          {
            name: 'Get Public Stats',
            value: 'getPublicStats',
            action: 'Get public evidence stats',
            description:
              'Read aggregated public production-outcome statistics',
          },
        ],
        default: 'recommendProvider',
      },

      {
        displayName: 'Search Profile',
        name: 'searchProfile',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
          },
        },
        options: [
          {
            name: 'Factual',
            value: 'FACTUAL',
            description:
              'Factual or documentation-oriented search task',
          },
          {
            name: 'Comparison',
            value: 'COMPARISON',
            description:
              'Search task comparing products, services, tools, or options',
          },
          {
            name: 'News — Experimental',
            value: 'NEWS',
            description:
              'Experimental. LAB-008 ended PIVOT; no NEWS provider is currently validated for CRITICAL use.',
          },
        ],
        default: 'FACTUAL',
      },
      {
        displayName:
          'NEWS is experimental: LAB-008 ended PIVOT and validated no provider for NEWS CRITICAL. Use only for evaluation until new evidence is available.',
        name: 'newsNotice',
        type: 'notice',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
            searchProfile: ['NEWS'],
          },
        },
        default: '',
      },
      {
        displayName: 'Allow Experimental NEWS',
        name: 'allowExperimentalNews',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
            searchProfile: ['NEWS'],
          },
        },
        default: false,
        description:
          'Whether to allow a recommendation request for NEWS despite its experimental evidence status',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
          },
        },
        default: '',
        required: true,
        placeholder:
          'e.g. PostgreSQL logical replication official documentation',
        description:
          'The real search task. AOPX recommends a provider path; it does not execute the provider search in this beta.',
      },
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
          },
        },
        options: [
          {
            name: 'Economy',
            value: 'ECONOMY',
            description:
              'Favor the active lower-cost production policy',
          },
          {
            name: 'Critical',
            value: 'CRITICAL',
            description:
              'Use the active critical policy, including fallback behavior where supported',
          },
        ],
        default: 'CRITICAL',
      },
      {
        displayName: 'Maximum Latency (Ms)',
        name: 'maxLatencyMs',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
        },
        description:
          'Optional latency constraint. Use 0 to omit the constraint.',
      },
      {
        displayName: 'Region',
        name: 'region',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['recommendProvider'],
          },
        },
        default: '',
        placeholder: 'e.g. EU',
        description:
          'Optional routing region. Leave empty if not required.',
      },

      {
        displayName: 'Recommendation ID',
        name: 'recommendationId',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: '={{$json.recommendation_id}}',
        required: true,
        description:
          'The recommendation_id returned by Recommend Provider',
      },
      {
        displayName: 'Provider ID',
        name: 'outcomeProviderId',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: '={{$json.provider_id}}',
        required: true,
        description:
          'Provider actually executed for this attempt',
      },
      {
        displayName: 'Success',
        name: 'success',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: true,
        description:
          'Whether the externally executed recommendation achieved the intended task',
      },
      {
        displayName: 'Include Latency',
        name: 'includeLatency',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: true,
        description:
          'Whether to send latency_ms. Turn off when latency was not measured.',
      },
      {
        displayName: 'Latency (Ms)',
        name: 'latencyMs',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            includeLatency: [true],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
        },
      },
      {
        displayName: 'Cost (EUR)',
        name: 'costEur',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
          numberPrecision: 6,
        },
      },
      {
        displayName: 'Include Quality Score',
        name: 'includeQualityScore',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: true,
        description:
          'Whether to send quality_score. Turn off when no independent quality measurement exists.',
      },
      {
        displayName: 'Quality Score',
        name: 'qualityScore',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            includeQualityScore: [true],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
          maxValue: 1,
          numberPrecision: 4,
        },
        description:
          'Caller-reported quality value between 0 and 1',
      },
      {
        displayName: 'Report Fallback Sequence',
        name: 'reportFallbackSequence',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
          },
        },
        default: false,
        description:
          'Whether to send two attempts in one outcome: primary failed, fallback executed',
      },
      {
        displayName: 'Primary Provider ID',
        name: 'primaryProviderId',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            reportFallbackSequence: [true],
          },
        },
        default: '={{$node["AOPX"].json["provider_id"]}}',
        required: true,
        description:
          'The originally recommended provider',
      },
      {
        displayName: 'Fallback Provider ID',
        name: 'fallbackProviderId',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            reportFallbackSequence: [true],
          },
        },
        default: '={{$node["AOPX"].json["fallback_provider_id"]}}',
        required: true,
        description:
          'The provider actually executed after the primary attempt failed',
      },
      {
        displayName: 'Primary Cost (EUR)',
        name: 'primaryCostEur',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            reportFallbackSequence: [true],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
          numberPrecision: 6,
        },
        description:
          'Cost incurred by the failed primary attempt',
      },
      {
        displayName: 'Fallback Cost (EUR)',
        name: 'fallbackCostEur',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            reportFallbackSequence: [true],
          },
        },
        default: 0,
        typeOptions: {
          minValue: 0,
          numberPrecision: 6,
        },
        description:
          'Cost incurred by the fallback attempt',
      },
      {
        displayName: 'Fallback Success',
        name: 'fallbackSuccess',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            reportFallbackSequence: [true],
          },
        },
        default: true,
        description:
          'Whether the fallback attempt achieved the intended task',
      },
      {
        displayName: 'Error Type',
        name: 'errorType',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['reportOutcome'],
            success: [false],
          },
        },
        default: '',
        placeholder: 'e.g. TIMEOUT',
      },

      {
        displayName: 'Mode Filter',
        name: 'statsMode',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['getPublicStats'],
          },
        },
        options: [
          {
            name: 'All',
            value: '',
          },
          {
            name: 'Economy',
            value: 'ECONOMY',
          },
          {
            name: 'Critical',
            value: 'CRITICAL',
          },
        ],
        default: '',
      },
    ],
  };

  async execute(
    this: IExecuteFunctions,
  ): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = (await this.getCredentials(
      'aopxApi',
    )) as AopxCredentials;

    const baseUrl = trimBaseUrl(
      String(credentials.baseUrl || 'https://api.aopx.fr'),
    );
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const operation = this.getNodeParameter(
          'operation',
          itemIndex,
        ) as string;

        let response: IDataObject;

        if (operation === 'recommendProvider') {
          const profile = this.getNodeParameter(
            'searchProfile',
            itemIndex,
          ) as SearchProfile;

          const allowExperimentalNews = this.getNodeParameter(
            'allowExperimentalNews',
            itemIndex,
            false,
          ) as boolean;

          if (
            profile === 'NEWS' &&
            !allowExperimentalNews
          ) {
            throw new NodeOperationError(
              this.getNode(),
              'NEWS is experimental. LAB-008 ended PIVOT and validated no provider for NEWS CRITICAL. Enable "Allow Experimental NEWS" only if you intentionally want to evaluate it.',
              { itemIndex },
            );
          }

          const query = String(
            this.getNodeParameter(
              'query',
              itemIndex,
            ),
          ).trim();

          const mode = String(
            this.getNodeParameter(
              'mode',
              itemIndex,
            ),
          );

          const maxLatencyMs = Number(
            this.getNodeParameter(
              'maxLatencyMs',
              itemIndex,
              0,
            ),
          );

          const region = String(
            this.getNodeParameter(
              'region',
              itemIndex,
              '',
            ),
          ).trim();

          const body: IDataObject = {
            category: 'SEARCH',
            mode,
            query,
          };

          if (maxLatencyMs > 0) {
            body.max_latency_ms = maxLatencyMs;
          }

          if (region) {
            body.region = region;
          }

          const apiResponse = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'aopxApi',
            {
            method: 'POST',
            url: `${baseUrl}/v1/recommend`,
            body,
              json: true,
            },
          )) as IDataObject;

          response = {
            ...apiResponse,
            aopx_n8n_beta: {
              node_version: '0.1.0-beta.6',
              operation: 'recommendProvider',
              ...evidenceMetadata(profile),
              execution_note:
                'This beta recommends the provider path. The calling workflow executes the provider request, then may call Report Outcome.',
            },
          };
        } else if (operation === 'reportOutcome') {
          const recommendationId = String(
            this.getNodeParameter(
              'recommendationId',
              itemIndex,
            ),
          ).trim();

          const outcomeProviderId = String(
            this.getNodeParameter(
              'outcomeProviderId',
              itemIndex,
            ),
          ).trim();

          if (!outcomeProviderId) {
            throw new NodeOperationError(
              this.getNode(),
              'Provider ID is required for Report Outcome.',
              { itemIndex },
            );
          }

          const success = Boolean(
            this.getNodeParameter(
              'success',
              itemIndex,
            ),
          );

          const includeLatency = Boolean(
            this.getNodeParameter(
              'includeLatency',
              itemIndex,
              true,
            ),
          );

          const latencyMs = includeLatency
            ? Number(
                this.getNodeParameter(
                  'latencyMs',
                  itemIndex,
                  0,
                ),
              )
            : undefined;

          const costEur = Number(
            this.getNodeParameter(
              'costEur',
              itemIndex,
              0,
            ),
          );

          const includeQualityScore = Boolean(
            this.getNodeParameter(
              'includeQualityScore',
              itemIndex,
              true,
            ),
          );

          const qualityScore = includeQualityScore
            ? Number(
                this.getNodeParameter(
                  'qualityScore',
                  itemIndex,
                  0,
                ),
              )
            : undefined;

          const reportFallbackSequence = Boolean(
            this.getNodeParameter(
              'reportFallbackSequence',
              itemIndex,
              false,
            ),
          );

          const errorType = success
            ? ''
            : String(
                this.getNodeParameter(
                  'errorType',
                  itemIndex,
                  '',
                ),
              ).trim();

          let body: IDataObject;

          if (reportFallbackSequence) {
            const primaryProviderId = String(
              this.getNodeParameter(
                'primaryProviderId',
                itemIndex,
              ),
            ).trim();

            const fallbackProviderId = String(
              this.getNodeParameter(
                'fallbackProviderId',
                itemIndex,
              ),
            ).trim();

            const primaryCostEur = Number(
              this.getNodeParameter(
                'primaryCostEur',
                itemIndex,
                0,
              ),
            );

            const fallbackCostEur = Number(
              this.getNodeParameter(
                'fallbackCostEur',
                itemIndex,
                0,
              ),
            );

            const fallbackSuccess = Boolean(
              this.getNodeParameter(
                'fallbackSuccess',
                itemIndex,
                true,
              ),
            );

            if (!primaryProviderId || !fallbackProviderId) {
              throw new NodeOperationError(
                this.getNode(),
                'Primary Provider ID and Fallback Provider ID are required for a fallback sequence.',
                { itemIndex },
              );
            }

            const primaryAttempt: IDataObject = {
              provider_id: primaryProviderId,
              success: false,
              cost_eur: primaryCostEur,
              error_type: 'PRIMARY_UNSUCCESSFUL',
            };

            const fallbackAttempt: IDataObject = {
              provider_id: fallbackProviderId,
              success: fallbackSuccess,
              cost_eur: fallbackCostEur,
            };

            if (includeLatency && latencyMs !== undefined) {
              fallbackAttempt.latency_ms = latencyMs;
            }

            if (
              includeQualityScore &&
              qualityScore !== undefined
            ) {
              fallbackAttempt.quality_score = qualityScore;
            }

            body = {
              recommendation_id: recommendationId,
              success: fallbackSuccess,
              cost_eur: primaryCostEur + fallbackCostEur,
              attempts: [primaryAttempt, fallbackAttempt],
            };

            if (includeLatency && latencyMs !== undefined) {
              body.latency_ms = latencyMs;
            }

            if (
              includeQualityScore &&
              qualityScore !== undefined
            ) {
              body.quality_score = qualityScore;
            }

            if (!fallbackSuccess) {
              body.error_type = errorType || 'FALLBACK_UNSUCCESSFUL';
              fallbackAttempt.error_type =
                errorType || 'FALLBACK_UNSUCCESSFUL';
            }
          } else {
            const attempt: IDataObject = {
              provider_id: outcomeProviderId,
              success,
              cost_eur: costEur,
            };

            body = {
              recommendation_id: recommendationId,
              success,
              cost_eur: costEur,
              attempts: [attempt],
            };

            if (includeLatency && latencyMs !== undefined) {
              attempt.latency_ms = latencyMs;
              body.latency_ms = latencyMs;
            }

            if (
              includeQualityScore &&
              qualityScore !== undefined
            ) {
              attempt.quality_score = qualityScore;
              body.quality_score = qualityScore;
            }

            if (errorType) {
              attempt.error_type = errorType;
              body.error_type = errorType;
            }
          }

          const apiResponse = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'aopxApi',
            {
            method: 'POST',
            url: `${baseUrl}/v1/outcome`,
            body,
              json: true,
            },
          )) as IDataObject;

          response = {
            ...apiResponse,
            aopx_n8n_beta: {
              node_version: '0.1.0-beta.6',
              operation: 'reportOutcome',
              evidence_status: 'REPORTED_PRODUCTION_OUTCOME',
              evidence_note:
                'Reported outcomes are not automatically promoted into validated public evidence or production policy.',
            },
          };
        } else if (operation === 'getPublicStats') {
          const statsMode = String(
            this.getNodeParameter(
              'statsMode',
              itemIndex,
              '',
            ),
          );

          const qs: IDataObject = {};
          if (statsMode) {
            qs.mode = statsMode;
          }

          const apiResponse = (await this.helpers.httpRequestWithAuthentication.call(
            this,
            'aopxApi',
            {
            method: 'GET',
            url: `${baseUrl}/v1/public/stats`,
            qs,
              json: true,
            },
          )) as IDataObject;

          response = {
            ...apiResponse,
            aopx_n8n_beta: {
              node_version: '0.1.0-beta.6',
              operation: 'getPublicStats',
              evidence_note:
                'Public stats are production-outcome aggregates. Benchmarks, tests, shadow runs, and replays are separate evidence classes.',
            },
          };
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unsupported AOPX operation: ${operation}`,
            { itemIndex },
          );
        }

        returnData.push({
          json: response,
          pairedItem: {
            item: itemIndex,
          },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
            pairedItem: {
              item: itemIndex,
            },
          });
          continue;
        }

        if (error instanceof NodeOperationError || error instanceof NodeApiError) {
          throw error;
        }

        throw new NodeApiError(
          this.getNode(),
          error as JsonObject,
          { itemIndex },
        );
      }
    }

    return [returnData];
  }
}

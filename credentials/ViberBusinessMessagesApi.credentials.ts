import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Viber Business Messages authenticates requests by whitelisting the partner's
 * server IP addresses against the `service_id` supplied in the request body.
 * There is no API token. The only credential value we need is the numeric
 * Service ID, which the node injects into the `service_id` field of every
 * send_message request.
 *
 * See "Getting Started" and "API Security" in the Business Messages API docs.
 */
export class ViberBusinessMessagesApi implements ICredentialType {
	name = 'viberBusinessMessagesApi';

	displayName = 'Viber Business Messages API';

	documentationUrl = 'https://github.com/andrey0001/n8n-nodes-viber-bm';

	properties: INodeProperties[] = [
		{
			displayName: 'Service ID',
			name: 'serviceId',
			type: 'number',
			default: 0,
			required: true,
			typeOptions: {
				minValue: 1,
			},
			description:
				'Your unique Viber Business Messages account Service ID (sender ID). Requests are authorised by IP whitelisting tied to this ID.',
		},
	];
}

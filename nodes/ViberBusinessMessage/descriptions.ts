import type { INodeProperties } from 'n8n-workflow';

/**
 * Single resource. Operations are content-oriented (Send Text, Send Image, …)
 * so users pick *what* they're sending rather than a cryptic numeric type code.
 */
export const resourceOperations: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [{ name: 'Message', value: 'message' }],
		default: 'message',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Send Text',
				value: 'sendText',
				action: 'Send a text message',
				description: 'Plain text (transactional, promotional or session)',
			},
			{
				name: 'Send Template',
				value: 'sendTemplate',
				action: 'Send a transactional template',
				description: 'A pre-approved transactional / OTP template with variables',
			},
			{
				name: 'Send Image',
				value: 'sendImage',
				action: 'Send an image or GIF',
				description: 'Image or animated GIF, optionally with text and a button',
			},
			{
				name: 'Send File',
				value: 'sendFile',
				action: 'Send a file',
				description: 'A document, PDF or spreadsheet download link',
			},
			{
				name: 'Send Video',
				value: 'sendVideo',
				action: 'Send a video',
				description: 'A video with thumbnail, optional text and button',
			},
			{
				name: 'Send List',
				value: 'sendList',
				action: 'Send a quick replies list',
				description: 'Quick Replies — 2–10 options the user can tap',
			},
			{
				name: 'Send Carousel',
				value: 'sendCarousel',
				action: 'Send a carousel',
				description: 'A scrollable set of 2–5 cards with images and buttons',
			},
		],
		default: 'sendText',
	},
];

/**
 * Fields common to every operation: destination, sequence, label.
 */
export const commonFields: INodeProperties[] = [
	{
		displayName: 'Destination',
		name: 'dest',
		type: 'string',
		default: '',
		required: true,
		placeholder: '972500000000',
		description:
			'Complete phone number, digits only — no spaces, "+" or special characters',
		displayOptions: { show: { resource: ['message'] } },
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'options',
		options: [
			{ name: 'Transaction', value: 'transaction' },
			{ name: 'Promotion', value: 'promotion' },
		],
		default: 'transaction',
		required: true,
		description:
			'Declares the nature of the message for Viber internal purposes. Does not affect billing.',
		displayOptions: { show: { resource: ['message'] } },
	},
];

/**
 * The trailing options shared by every operation: simplify toggle and an
 * "Additional Fields" collection (sequence, tag, ttl, tracking data).
 */
export const sharedOptions: INodeProperties[] = [
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description:
			'Whether to return a simplified response (status, message token, session ID) instead of the full Viber payload',
		displayOptions: { show: { resource: ['message'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				displayName: 'Sequence',
				name: 'seq',
				type: 'number',
				default: 0,
				description:
					'Unique identifier linking this request to the response. Defaults to a timestamp when left at 0. Use an expression such as {{ $itemIndex }} for deterministic values.',
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Free text for generating custom reports',
			},
			{
				displayName: 'TTL (Seconds)',
				name: 'ttl',
				type: 'number',
				default: 0,
				typeOptions: { minValue: 0 },
				description:
					'Time to Live in seconds (30–1209600). Leave 0 for the default (14 days).',
			},
			{
				displayName: 'Tracking Data',
				name: 'trackingData',
				type: 'string',
				default: '',
				description:
					'String returned to your webhook when the user replies. Auto-filled for types that require it; set it here to override.',
			},
		],
	},
];

const showFor = (operation: string) => ({
	show: { resource: ['message'], operation: [operation] },
});

/**
 * Operation-specific fields.
 */
export const operationFields: INodeProperties[] = [
	// ─── Send Text ────────────────────────────────────────────────
	{
		displayName: 'Delivery',
		name: 'textDelivery',
		type: 'options',
		default: 'transactional',
		description: 'How the text message is categorised and billed',
		options: [
			{ name: 'Transactional (Legacy)', value: 'transactional' },
			{ name: 'Promotional', value: 'promotional' },
			{ name: 'Session', value: 'session' },
		],
		displayOptions: showFor('sendText'),
	},
	{
		displayName: 'Message Text',
		name: 'messageText',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		description: 'Text content (max 1000 UTF-8 chars). Supports Viber markdown and "\\n".',
		displayOptions: showFor('sendText'),
	},

	// ─── Send Template ────────────────────────────────────────────
	{
		displayName: 'Reach',
		name: 'templateReach',
		type: 'options',
		default: 'allDevices',
		options: [
			{ name: 'All Devices', value: 'allDevices' },
			{ name: 'Smartphone Only', value: 'smartphone' },
		],
		displayOptions: showFor('sendTemplate'),
	},
	{
		displayName: 'Template ID',
		name: 'templateId',
		type: 'string',
		default: '',
		required: true,
		description: 'The predefined ID of the approved template to send',
		displayOptions: showFor('sendTemplate'),
	},
	{
		displayName: 'Template Language',
		name: 'templateLang',
		type: 'string',
		default: 'en',
		required: true,
		description:
			'Message language. Must match the locales.lang value defined during template creation (e.g. "en", "he").',
		displayOptions: showFor('sendTemplate'),
	},
	{
		displayName: 'Parameters Input',
		name: 'templateParamsMode',
		type: 'options',
		default: 'fields',
		options: [
			{ name: 'Key-Value Pairs', value: 'fields' },
			{ name: 'JSON', value: 'json' },
		],
		displayOptions: showFor('sendTemplate'),
	},
	{
		displayName: 'Template Parameters',
		name: 'templateParamsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Parameter',
		default: {},
		description: 'Variables to substitute. OTP templates must include a non-empty "pin".',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendTemplate'], templateParamsMode: ['fields'] },
		},
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Variable name as defined in the template (e.g. "pin")',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to substitute. Max 125 chars, no URLs.',
					},
				],
			},
		],
	},
	{
		displayName: 'Template Parameters (JSON)',
		name: 'templateParamsJson',
		type: 'json',
		default: '{}',
		description: 'JSON object of template variables, e.g. {"user_name":"John","pin":"1234"}',
		displayOptions: {
			show: { resource: ['message'], operation: ['sendTemplate'], templateParamsMode: ['json'] },
		},
	},

	// ─── Send Image ───────────────────────────────────────────────
	{
		displayName: 'Layout',
		name: 'imageLayout',
		type: 'options',
		default: 'allDevices',
		description: 'Image-only, or image combined with text and a button',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{ name: 'Image Only (All Devices)', value: 'allDevices' },
			{ name: 'Image Only (Smartphone)', value: 'smartphone' },
			{ name: 'Image Only (Session)', value: 'session' },
			{ name: 'Text + Image + Button (All Devices)', value: 'buttonAllDevices' },
			{ name: 'Text + Image + Button (Smartphone)', value: 'buttonSmartphone' },
			{ name: 'Text + Image + Button (Full Screen)', value: 'buttonFullScreen' },
		],
		displayOptions: showFor('sendImage'),
	},
	{
		displayName: 'Image URL',
		name: 'img',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/image.png',
		description:
			'Secured HTTPS URL with a file extension. Formats: PNG, JPEG, GIF. Recommended 800x800.',
		displayOptions: showFor('sendImage'),
	},
	{
		displayName: 'Animated GIF',
		name: 'isGif',
		type: 'boolean',
		default: false,
		description:
			'Whether the image is an animated GIF (sets #imageFormat=gif). Requires Viber 28.1+ on the recipient device.',
		displayOptions: showFor('sendImage'),
	},

	// ─── Send Video ───────────────────────────────────────────────
	{
		displayName: 'Layout',
		name: 'videoLayout',
		type: 'options',
		default: 'videoText',
		options: [
			{ name: 'Video Only', value: 'video' },
			{ name: 'Video + Text', value: 'videoText' },
			{ name: 'Video + Text + Button (Opens Video)', value: 'videoTextButton' },
			{ name: 'Video + Text + Action Button (Opens URL)', value: 'videoTextActionButton' },
		],
		displayOptions: showFor('sendVideo'),
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/video.mp4',
		description:
			'Secured HTTPS URL ending in .mp4. The host must allow HEAD requests and return Content-Length.',
		displayOptions: showFor('sendVideo'),
	},
	{
		displayName: 'Thumbnail URL',
		name: 'thumbnail',
		type: 'string',
		default: '',
		required: true,
		description: 'Static image URL used as the video preview',
		displayOptions: showFor('sendVideo'),
	},
	{
		displayName: 'File Size (Bytes)',
		name: 'fileSize',
		type: 'number',
		default: 0,
		required: true,
		typeOptions: { minValue: 1 },
		description: 'Size of the video file in bytes (max 200 MB)',
		displayOptions: showFor('sendVideo'),
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		default: 0,
		required: true,
		typeOptions: { minValue: 1 },
		description: 'Duration of the video in seconds (max 600)',
		displayOptions: showFor('sendVideo'),
	},
	{
		displayName: 'Message Text',
		name: 'messageText',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Caption text shown with the video',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendVideo'],
				videoLayout: ['videoText', 'videoTextButton', 'videoTextActionButton'],
			},
		},
	},

	// ─── Send File ────────────────────────────────────────────────
	{
		displayName: 'Category',
		name: 'fileCategory',
		type: 'options',
		default: 'transactional',
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{ name: 'Transactional', value: 'transactional' },
			{ name: 'Transactional (No Tracking)', value: 'transactionalNoTracking' },
			{ name: 'Transactional (Smartphone)', value: 'transactionalSmartphone' },
			{ name: 'Session', value: 'session' },
			{ name: 'Session (Smartphone)', value: 'sessionSmartphone' },
		],
		displayOptions: showFor('sendFile'),
	},
	{
		displayName: 'File URL',
		name: 'action',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com/file.pdf',
		description: 'Download URL for the file (sent as #action)',
		displayOptions: showFor('sendFile'),
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the file shown to the user (max 25 chars)',
		displayOptions: showFor('sendFile'),
	},
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'string',
		default: 'pdf',
		required: true,
		placeholder: 'pdf',
		description: 'File extension, e.g. pdf, doc, docx, xls, xlsx, csv',
		displayOptions: showFor('sendFile'),
	},

	// ─── Shared button fields (image-with-button + video-with-button) ─
	{
		displayName: 'Button Caption',
		name: 'caption',
		type: 'string',
		default: '',
		description: 'Text on the action button (max 30 chars). Leave empty to hide the button.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendImage', 'sendVideo'],
			},
			hide: {
				imageLayout: ['allDevices', 'smartphone', 'session'],
				videoLayout: ['video', 'videoText'],
			},
		},
	},
	{
		displayName: 'Button / Action URL',
		name: 'buttonAction',
		type: 'string',
		default: '',
		description: 'URL the user is directed to when pressing the button',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendImage', 'sendVideo'],
			},
			hide: {
				imageLayout: ['allDevices', 'smartphone', 'session'],
				videoLayout: ['video', 'videoText'],
			},
		},
	},

	// ─── Text + Button helper for image button layouts ───────────────
	{
		displayName: 'Message Text',
		name: 'messageText',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'Text shown above the image',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['sendImage'],
				imageLayout: ['buttonAllDevices', 'buttonSmartphone', 'buttonFullScreen'],
			},
		},
	},

	// ─── Send List ────────────────────────────────────────────────
	{
		displayName: 'Category',
		name: 'listCategory',
		type: 'options',
		default: 'transactional',
		options: [
			{ name: 'Transactional', value: 'transactional' },
			{ name: 'Session', value: 'session' },
		],
		displayOptions: showFor('sendList'),
	},
	{
		displayName: 'List Title',
		name: 'messageText',
		type: 'string',
		default: '',
		required: true,
		description: 'Title shown above the options (max 85 UTF-8 chars)',
		displayOptions: showFor('sendList'),
	},
	{
		displayName: 'UI Style',
		name: 'listMessageUiType',
		type: 'options',
		default: 1,
		options: [
			{ name: 'Radio Buttons (Legacy)', value: 1 },
			{ name: 'Buttons (New)', value: 2 },
		],
		description: '"Buttons" requires Viber 27.8.2+ on the recipient device',
		displayOptions: showFor('sendList'),
	},
	{
		displayName: 'Options',
		name: 'listOptions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Option',
		default: {},
		required: true,
		description: '2–10 options the user can choose from (max 50 chars each)',
		displayOptions: showFor('sendList'),
		options: [
			{
				name: 'option',
				displayName: 'Option',
				values: [
					{
						displayName: 'Text',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	// ─── Send Carousel ────────────────────────────────────────────
	{
		displayName: 'Message Text',
		name: 'messageText',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		required: true,
		description: 'Intro text shown above the cards (recommended ≤200 chars)',
		displayOptions: showFor('sendCarousel'),
	},
	{
		displayName: 'Cards',
		name: 'carouselCards',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Card',
		default: {},
		required: true,
		description: '2–5 cards, each with an image and up to two buttons',
		displayOptions: showFor('sendCarousel'),
		options: [
			{
				name: 'card',
				displayName: 'Card',
				values: [
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						description: 'PNG/JPEG URL, recommended 215x185',
					},
					{
						displayName: 'Primary Button Label',
						name: 'primaryLabel',
						type: 'string',
						default: '',
						description: 'Required. Max 10 chars.',
					},
					{
						displayName: 'Primary Button URL',
						name: 'primaryActionUrl',
						type: 'string',
						default: '',
						description: 'Required. Append	?inactiveViberLink=true to hide buttons on this card.',
					},
					{
						displayName: 'Secondary Button Label',
						name: 'secondaryLabel',
						type: 'string',
						default: '',
						description: 'Optional. Max 12 chars.',
					},
					{
						displayName: 'Secondary Button URL',
						name: 'secondaryActionUrl',
						type: 'string',
						default: '',
						description: 'Optional secondary button target',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Card title (2–38 chars)',
					},
				],
			},
		],
	},
];

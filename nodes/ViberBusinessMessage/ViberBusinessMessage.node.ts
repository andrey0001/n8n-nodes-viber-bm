import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	commonFields,
	operationFields,
	resourceOperations,
	sharedOptions,
} from './descriptions';
import {
	assertMaxLength,
	buildCarouselItems,
	buildListOptions,
	normaliseNewlines,
	parseJsonParameter,
	resolveFileType,
	resolveImageType,
	resolveListType,
	resolveTemplateType,
	resolveTextButtonType,
	resolveTextType,
	resolveVideoType,
	viberApiRequest,
} from './GenericFunctions';
import { GIF_CAPABLE, LIMITS, TRACKING_REQUIRED } from './types';

export class ViberBusinessMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Viber Business Message',
		name: 'viberBusinessMessage',
		icon: 'file:viber.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Send messages through the Rakuten Viber Business Messages API',
		defaults: {
			name: 'Viber Business Message',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'viberBusinessMessagesApi',
				required: true,
			},
		],
		properties: [...resourceOperations, ...commonFields, ...operationFields, ...sharedOptions],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('viberBusinessMessagesApi');
		const serviceId = credentials.serviceId as number;

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const dest = this.getNodeParameter('dest', i) as string;
				const label = this.getNodeParameter('label', i) as string;
				const simplify = this.getNodeParameter('simplify', i, true) as boolean;
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

				const seq = (additionalFields.seq as number) || Date.now();
				const tag = (additionalFields.tag as string) ?? '';
				const ttl = (additionalFields.ttl as number) ?? 0;
				const trackingOverride = (additionalFields.trackingData as string) ?? '';

				const body: IDataObject = { service_id: serviceId, dest, seq, label };
				if (tag) body.tag = tag;
				if (ttl > 0) {
					if (ttl < LIMITS.TTL_MIN || ttl > LIMITS.TTL_MAX) {
						throw new NodeOperationError(
							this.getNode(),
							`TTL must be between ${LIMITS.TTL_MIN} and ${LIMITS.TTL_MAX} seconds.`,
							{ itemIndex: i },
						);
					}
					body.ttl = ttl;
				}

				const builder = BUILDERS[operation];
				if (!builder) {
					throw new NodeOperationError(this.getNode(), `Unknown operation "${operation}".`, {
						itemIndex: i,
					});
				}
				builder(this, i, body, trackingOverride);

				const response = await viberApiRequest.call(this, body, i);

				const json: IDataObject = simplify
					? {
							status: response.status,
							seq: response.seq,
							messageToken: response.message_token,
							...(response.session_id ? { sessionId: response.session_id } : {}),
						}
					: { ...response, _requestBody: body };

				returnData.push({ json, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

type BodyBuilder = (
	ctx: IExecuteFunctions,
	itemIndex: number,
	body: IDataObject,
	tracking: string,
) => void;

const BUILDERS: Record<string, BodyBuilder> = {
	sendText: buildText,
	sendTextButton: buildTextButton,
	sendTemplate: buildTemplate,
	sendImage: buildImage,
	sendFile: buildFile,
	sendVideo: buildVideo,
	sendList: buildList,
	sendCarousel: buildCarousel,
};

// ─── Per-operation body builders ───────────────────────────────────

function buildText(ctx: IExecuteFunctions, i: number, body: IDataObject, tracking: string): void {
	const delivery = ctx.getNodeParameter('textDelivery', i, 'transactional') as string;
	const type = resolveTextType(delivery);
	const txt = normaliseNewlines(ctx.getNodeParameter('messageText', i) as string);
	assertMaxLength(ctx, txt, LIMITS.TEXT_MAX, 'Message Text', i);

	body.type = type;
	const message: IDataObject = { '#txt': txt };
	applyTracking(message, type, tracking);
	body.message = message;
}

function buildTextButton(
	ctx: IExecuteFunctions,
	i: number,
	body: IDataObject,
	tracking: string,
): void {
	const reach = ctx.getNodeParameter('textButtonReach', i, 'allDevices') as string;
	const type = resolveTextButtonType(reach);
	const txt = normaliseNewlines(ctx.getNodeParameter('messageText', i) as string);
	assertMaxLength(ctx, txt, LIMITS.TEXT_MAX, 'Message Text', i);

	body.type = type;
	const message: IDataObject = { '#txt': txt };

	const caption = ctx.getNodeParameter('textButtonCaption', i, '') as string;
	const action = ctx.getNodeParameter('textButtonAction', i, '') as string;
	if (caption || action) {
		if (caption) {
			assertMaxLength(ctx, caption, LIMITS.CAPTION_MAX, 'Button Caption', i);
			message['#caption'] = caption;
		}
		if (action) message['#action'] = action;
	} else {
		message['#caption'] = '';
		message['#action'] = '';
	}

	applyTracking(message, type, tracking);
	body.message = message;
}

function buildTemplate(ctx: IExecuteFunctions, i: number, body: IDataObject): void {
	const reach = ctx.getNodeParameter('templateReach', i, 'allDevices') as string;
	body.type = resolveTemplateType(reach);
	body.templateId = ctx.getNodeParameter('templateId', i) as string;
	body.templateLang = ctx.getNodeParameter('templateLang', i) as string;

	const mode = ctx.getNodeParameter('templateParamsMode', i, 'fields') as string;
	const params: IDataObject = {};
	if (mode === 'json') {
		const raw = ctx.getNodeParameter('templateParamsJson', i, '{}') as string | IDataObject;
		Object.assign(params, parseJsonParameter(ctx, raw, 'Template Parameters (JSON)', i));
	} else {
		const collection = ctx.getNodeParameter('templateParamsUi', i, {}) as IDataObject;
		const rows = (collection.parameter as IDataObject[]) ?? [];
		for (const row of rows) {
			const name = (row.name as string) ?? '';
			if (!name) continue;
			const value = (row.value as string) ?? '';
			assertMaxLength(ctx, value, LIMITS.TEMPLATE_PARAM_MAX, `Parameter "${name}"`, i);
			params[name] = value;
		}
	}
	body.templateParams = params;
}

function buildImage(ctx: IExecuteFunctions, i: number, body: IDataObject, tracking: string): void {
	const layout = ctx.getNodeParameter('imageLayout', i, 'allDevices') as string;
	const withButton = layout.startsWith('button');
	const variant = withButton
		? layout.replace('button', '').replace(/^[A-Z]/, (c) => c.toLowerCase())
		: layout;
	const type = resolveImageType(withButton, variant);

	body.type = type;
	const message: IDataObject = {};

	if (withButton) {
		const txt = normaliseNewlines(ctx.getNodeParameter('messageText', i, '') as string);
		if (txt) {
			assertMaxLength(ctx, txt, LIMITS.TEXT_MAX, 'Message Text', i);
			message['#txt'] = txt;
		}
	}

	message['#img'] = ctx.getNodeParameter('img', i) as string;

	if (GIF_CAPABLE.has(type) && (ctx.getNodeParameter('isGif', i, false) as boolean)) {
		message['#imageFormat'] = 'gif';
	}

	if (withButton) {
		applyButton(ctx, i, message, true);
	}

	applyTracking(message, type, tracking);
	body.message = message;
}

function buildFile(ctx: IExecuteFunctions, i: number, body: IDataObject, tracking: string): void {
	const category = ctx.getNodeParameter('fileCategory', i, 'transactional') as string;
	const type = resolveFileType(category);
	body.type = type;
	body.file_type = ctx.getNodeParameter('fileType', i) as string;

	const fileName = ctx.getNodeParameter('fileName', i) as string;
	assertMaxLength(ctx, fileName, LIMITS.FILE_NAME_MAX, 'File Name', i);

	const message: IDataObject = {
		'#action': ctx.getNodeParameter('action', i) as string,
		'#fileName': fileName,
	};
	applyTracking(message, type, tracking);
	body.message = message;
}

function buildVideo(ctx: IExecuteFunctions, i: number, body: IDataObject, tracking: string): void {
	const layout = ctx.getNodeParameter('videoLayout', i, 'videoText') as string;
	const type = resolveVideoType(layout);
	const fileSize = ctx.getNodeParameter('fileSize', i) as number;
	const duration = ctx.getNodeParameter('duration', i) as number;

	if (fileSize > LIMITS.VIDEO_MAX_BYTES) {
		throw new NodeOperationError(ctx.getNode(), 'Video file exceeds the 200 MB limit.', {
			itemIndex: i,
		});
	}
	if (duration > LIMITS.VIDEO_MAX_DURATION) {
		throw new NodeOperationError(ctx.getNode(), 'Video duration exceeds the 600 second limit.', {
			itemIndex: i,
		});
	}

	body.type = type;
	body.file_size = fileSize;
	body.duration = duration;

	const message: IDataObject = {
		'#thumbnail': ctx.getNodeParameter('thumbnail', i) as string,
	};

	const videoUrl = ctx.getNodeParameter('videoUrl', i) as string;
	// Type 233 carries the video in #media and a separate button URL in #action;
	// the other video types use #action for the video URL itself.
	if (type === 233) {
		message['#media'] = videoUrl;
	} else {
		message['#action'] = videoUrl;
	}

	if (['videoText', 'videoTextButton', 'videoTextActionButton'].includes(layout)) {
		const txt = normaliseNewlines(ctx.getNodeParameter('messageText', i, '') as string);
		if (txt) {
			assertMaxLength(ctx, txt, LIMITS.TEXT_MAX, 'Message Text', i);
			message['#txt'] = txt;
		}
	}

	if (layout === 'videoTextButton' || layout === 'videoTextActionButton') {
		const caption = ctx.getNodeParameter('videoCaption', i, '') as string;
		if (caption) {
			assertMaxLength(ctx, caption, LIMITS.CAPTION_MAX, 'Button Caption', i);
			message['#caption'] = caption;
		}
		if (type === 233) {
			message['#action'] = ctx.getNodeParameter('videoButtonAction', i, '') as string;
		}
	}

	applyTracking(message, type, tracking);
	body.message = message;
}

function buildList(ctx: IExecuteFunctions, i: number, body: IDataObject, tracking: string): void {
	const category = ctx.getNodeParameter('listCategory', i, 'transactional') as string;
	const type = resolveListType(category);
	const title = normaliseNewlines(ctx.getNodeParameter('messageText', i) as string);
	assertMaxLength(ctx, title, LIMITS.LIST_TEXT_MAX, 'List Title', i);

	const collection = ctx.getNodeParameter('listOptions', i, {}) as IDataObject;
	const options = buildListOptions(ctx, (collection.option as IDataObject[]) ?? [], i);

	body.type = type;
	body.message = {
		'#tracking_data': tracking,
		'#txt': title,
	};
	body.survey = {
		list_message_ui_type: ctx.getNodeParameter('listMessageUiType', i, 1) as number,
		options,
	};
}

function buildCarousel(
	ctx: IExecuteFunctions,
	i: number,
	body: IDataObject,
	tracking: string,
): void {
	const txt = normaliseNewlines(ctx.getNodeParameter('messageText', i) as string);
	assertMaxLength(ctx, txt, LIMITS.TEXT_MAX, 'Message Text', i);

	const collection = ctx.getNodeParameter('carouselCards', i, {}) as IDataObject;
	const items = buildCarouselItems(ctx, (collection.card as IDataObject[]) ?? [], i);

	body.type = 901;
	body.message = {
		'#tracking_data': tracking,
		'#txt': txt,
	};
	body.carousel = { items };
}

// ─── Shared helpers ────────────────────────────────────────────────

/**
 * Set #tracking_data when the type expects it (replyable types) or when the
 * user supplied a value. Viber accepts an empty string for these types, so we
 * pass the value through as-is. Types that do not accept tracking data (e.g.
 * 107/108/109, smartphone-only types) never get the field, since sending it
 * there triggers status 6 / SRVC_BAD_PARAMETERS.
 */
function applyTracking(message: IDataObject, type: number, tracking: string): void {
	if (TRACKING_REQUIRED.has(type) || tracking) {
		message['#tracking_data'] = tracking;
	}
}

/**
 * Apply #caption/#action. When both are empty, send empty strings so Viber
 * hides the button (requires recipient Viber 17.5.0+).
 */
function applyButton(
	ctx: IExecuteFunctions,
	itemIndex: number,
	message: IDataObject,
	hasCaption: boolean,
): void {
	const caption = hasCaption ? (ctx.getNodeParameter('caption', itemIndex, '') as string) : '';
	const action = ctx.getNodeParameter('buttonAction', itemIndex, '') as string;

	if (caption || action) {
		if (hasCaption && caption) {
			assertMaxLength(ctx, caption, LIMITS.CAPTION_MAX, 'Button Caption', itemIndex);
			message['#caption'] = caption;
		}
		if (action) message['#action'] = action;
	} else {
		if (hasCaption) message['#caption'] = '';
		message['#action'] = '';
	}
}

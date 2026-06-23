import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	SEND_MESSAGE_URL,
	describeStatus,
	LIMITS,
	VIBER_TYPE,
	type CarouselItem,
} from './types';

/**
 * Convert literal "\n" sequences typed in the UI into real line breaks.
 */
export function normaliseNewlines(value: string): string {
	return value.replace(/\\n/g, '\n');
}

/**
 * POST a send_message body to Viber and translate the result.
 *
 * Viber always answers with HTTP 200; a non-zero `status` in the JSON body
 * means the message was rejected. We surface that as a NodeApiError so it is
 * handled like any other API failure (and respects Continue On Fail).
 */
export async function viberApiRequest(
	this: IExecuteFunctions,
	body: IDataObject,
	itemIndex: number,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: SEND_MESSAGE_URL,
		headers: { 'Content-Type': 'application/json' },
		body,
		json: true,
	};

	const response = (await this.helpers.httpRequest(options)) as IDataObject;
	const status = Number(response.status);

	if (status !== 0) {
		throw new NodeApiError(this.getNode(), response as JsonObject, {
			message: `Viber rejected the message (status ${status})`,
			description: describeStatus(status),
			itemIndex,
		});
	}

	return response;
}

/**
 * Resolve the numeric Viber message type from a content operation plus its
 * delivery option. Keeps the cryptic type codes out of the user-facing UI.
 */
export function resolveTextType(delivery: string): number {
	switch (delivery) {
		case 'promotional':
			return VIBER_TYPE.TEXT_PROMOTIONAL;
		case 'session':
			return VIBER_TYPE.TEXT_SESSION;
		case 'transactional':
		default:
			return VIBER_TYPE.TEXT_TRANSACTIONAL_LEGACY;
	}
}

export function resolveTemplateType(reach: string): number {
	return reach === 'smartphone' ? VIBER_TYPE.TEMPLATE_SMARTPHONE : VIBER_TYPE.TEMPLATE_ALL;
}

export function resolveImageType(withButton: boolean, variant: string): number {
	if (withButton) {
		switch (variant) {
			case 'smartphone':
				return VIBER_TYPE.IMAGE_BUTTON_SMARTPHONE;
			case 'fullScreen':
				return VIBER_TYPE.IMAGE_BUTTON_FULLSCREEN;
			case 'allDevices':
			default:
				return VIBER_TYPE.IMAGE_BUTTON_ALL;
		}
	}
	switch (variant) {
		case 'smartphone':
			return VIBER_TYPE.IMAGE_PROMOTIONAL_SMARTPHONE;
		case 'session':
			return VIBER_TYPE.IMAGE_SESSION;
		case 'allDevices':
		default:
			return VIBER_TYPE.IMAGE_PROMOTIONAL_ALL;
	}
}

export function resolveTextButtonType(reach: string): number {
	return reach === 'smartphone'
		? VIBER_TYPE.TEXT_BUTTON_SMARTPHONE
		: VIBER_TYPE.TEXT_BUTTON_ALL;
}

export function resolveFileType(category: string): number {
	switch (category) {
		case 'transactionalNoTracking':
			return VIBER_TYPE.FILE_TRANSACTIONAL_NO_TRACKING;
		case 'transactionalSmartphone':
			return VIBER_TYPE.FILE_TRANSACTIONAL_SMARTPHONE;
		case 'session':
			return VIBER_TYPE.FILE_SESSION;
		case 'sessionSmartphone':
			return VIBER_TYPE.FILE_SESSION_SMARTPHONE;
		case 'transactional':
		default:
			return VIBER_TYPE.FILE_TRANSACTIONAL;
	}
}

export function resolveVideoType(variant: string): number {
	switch (variant) {
		case 'video':
			return VIBER_TYPE.VIDEO;
		case 'videoText':
			return VIBER_TYPE.VIDEO_TEXT;
		case 'videoTextButton':
			return VIBER_TYPE.VIDEO_TEXT_BUTTON;
		case 'videoTextActionButton':
		default:
			return VIBER_TYPE.VIDEO_TEXT_ACTION_BUTTON;
	}
}

export function resolveListType(category: string): number {
	return category === 'session' ? VIBER_TYPE.LIST_SESSION : VIBER_TYPE.LIST_TRANSACTIONAL;
}

/**
 * Validate a string field against a maximum length, throwing with item context.
 */
export function assertMaxLength(
	ctx: IExecuteFunctions,
	value: string,
	max: number,
	fieldName: string,
	itemIndex: number,
): void {
	if (value.length > max) {
		throw new NodeOperationError(
			ctx.getNode(),
			`"${fieldName}" is ${value.length} characters; the maximum is ${max}.`,
			{ itemIndex },
		);
	}
}

/**
 * Build the carousel payload from an n8n fixedCollection value.
 */
export function buildCarouselItems(
	ctx: IExecuteFunctions,
	rawItems: IDataObject[],
	itemIndex: number,
): CarouselItem[] {
	if (rawItems.length < LIMITS.CAROUSEL_ITEMS_MIN || rawItems.length > LIMITS.CAROUSEL_ITEMS_MAX) {
		throw new NodeOperationError(
			ctx.getNode(),
			`A carousel needs between ${LIMITS.CAROUSEL_ITEMS_MIN} and ${LIMITS.CAROUSEL_ITEMS_MAX} items; received ${rawItems.length}.`,
			{ itemIndex },
		);
	}

	return rawItems.map((item, idx) => {
		const title = (item.title as string) ?? '';
		const imageUrl = (item.imageUrl as string) ?? '';
		const primaryLabel = (item.primaryLabel as string) ?? '';
		const primaryActionUrl = (item.primaryActionUrl as string) ?? '';
		const secondaryLabel = (item.secondaryLabel as string) ?? '';
		const secondaryActionUrl = (item.secondaryActionUrl as string) ?? '';

		if (!title || !imageUrl || !primaryLabel || !primaryActionUrl) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Carousel item ${idx + 1} is missing a required field (title, image URL, primary button label, or primary button action URL).`,
				{ itemIndex },
			);
		}

		assertMaxLength(ctx, title, LIMITS.CAROUSEL_TITLE_MAX, `Carousel item ${idx + 1} title`, itemIndex);
		assertMaxLength(
			ctx,
			primaryLabel,
			LIMITS.CAROUSEL_PRIMARY_LABEL_MAX,
			`Carousel item ${idx + 1} primary button label`,
			itemIndex,
		);

		const carouselItem: CarouselItem = {
			title,
			imageUrl,
			primaryButton: { label: primaryLabel, actionUrl: primaryActionUrl },
		};

		if (secondaryLabel || secondaryActionUrl) {
			assertMaxLength(
				ctx,
				secondaryLabel,
				LIMITS.CAROUSEL_SECONDARY_LABEL_MAX,
				`Carousel item ${idx + 1} secondary button label`,
				itemIndex,
			);
			carouselItem.secondaryButton = { label: secondaryLabel, actionUrl: secondaryActionUrl };
		}

		return carouselItem;
	});
}

/**
 * Build the list option array from an n8n fixedCollection value.
 */
export function buildListOptions(
	ctx: IExecuteFunctions,
	rawOptions: IDataObject[],
	itemIndex: number,
): string[] {
	const options = rawOptions
		.map((o) => (o.value as string) ?? '')
		.filter((v) => v.length > 0);

	if (options.length < LIMITS.LIST_OPTIONS_MIN || options.length > LIMITS.LIST_OPTIONS_MAX) {
		throw new NodeOperationError(
			ctx.getNode(),
			`A list needs between ${LIMITS.LIST_OPTIONS_MIN} and ${LIMITS.LIST_OPTIONS_MAX} options; received ${options.length}.`,
			{ itemIndex },
		);
	}

	for (const option of options) {
		assertMaxLength(ctx, option, LIMITS.LIST_OPTION_MAX, 'List option', itemIndex);
	}

	return options;
}

/**
 * Parse a JSON string parameter, wrapping syntax errors with item context.
 */
export function parseJsonParameter(
	ctx: IExecuteFunctions,
	raw: string | IDataObject,
	fieldName: string,
	itemIndex: number,
): IDataObject {
	if (typeof raw !== 'string') return raw;
	try {
		return JSON.parse(raw) as IDataObject;
	} catch (error) {
		throw new NodeOperationError(
			ctx.getNode(),
			`Invalid JSON in "${fieldName}": ${(error as Error).message}`,
			{ itemIndex },
		);
	}
}

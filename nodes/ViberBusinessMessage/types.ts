import type { IDataObject } from 'n8n-workflow';

/**
 * Endpoint for the Viber Business Messages send_message API.
 */
export const SEND_MESSAGE_URL = 'https://services.viber.com/vibersrvc/1/send_message';

/**
 * Viber returns HTTP 200 even when a send is rejected; the real outcome lives
 * in the `status` field of the JSON body. 0 = success, everything else maps to
 * one of these documented SRVC_* codes.
 */
export const STATUS_MESSAGES: Record<number, string> = {
	1: 'SRVC_INTERNAL_FAILURE — Internal server error.',
	2: 'SRVC_BAD_SERVICE_ID — The Service ID is unknown, expired, or not yet provisioned.',
	3: 'SRVC_BAD_DATA — Malformed request (bad JSON, or text over 1000 characters).',
	5: 'SRVC_BAD_MESSAGE_TYPE — Unsupported or incorrect message type.',
	6: 'SRVC_BAD_PARAMETERS — Missing mandatory parameters (e.g. tracking data on a replyable type).',
	7: 'SRVC_TIMEOUT — Server timeout, or an OTP template was sent without a "pin" value.',
	8: 'SRVC_USER_BLOCKED — The user blocked this account or business messages entirely.',
	9: 'SRVC_NOT_VIBER_USER — The destination number is not a registered Viber user.',
	10: 'SRVC_NO_SUITABLE_DEVICE — No Android/iOS device with a Viber version that supports this message type.',
	13: 'SRVC_NOT_PERMITTED — Billing error. Contact partners@viber.com.',
	18: 'SRVC_BAD_LABEL — Missing or incorrect "label" value.',
	20: 'SRVC_INVALID_TTL — TTL must be between 30 and 1209600 seconds.',
	21: 'SRVC_WAIT_FOR_USER_RESPONSE — Exceeded the 10-message limit within a session.',
	27: 'SRVC_INVALID_PHONE_NUMBER — Invalid destination number.',
	28: 'SRVC_FILE_NOT_PERMITTED — Unsupported file format.',
	29: 'SRVC_BAD_FILE_NAME_LENGTH — File name exceeds 25 characters.',
	30: 'SRVC_BAD_THUMBNAIL — Thumbnail URL exceeds 1000 characters.',
	31: 'SRVC_BAD_FILE_SIZE — Video file is larger than 200 MB.',
	32: 'SRVC_BAD_DURATION — Video duration is over 600 seconds.',
	38: 'TEMPLATE_NOT_FOUND — The provided template ID was not found.',
	39: 'TEMPLATE_VALIDATION_ERROR — Template variables failed server validation.',
	40: 'SRVC_SURVEY_VALIDATION_ERROR — A Quick Replies (List) parameter failed validation.',
	41: 'SRVC_CAROUSEL_VALIDATION_ERROR — A Carousel parameter failed validation.',
	43: 'SRVC_SERVICE_BLOCKED — The Service ID is blocked in the Business Portal.',
	401: 'SRVC_UNAUTHORIZED_IP — Request from a non-whitelisted IP, or the ID does not belong to this partner.',
};

/**
 * Friendly label for a status code, falling back to the raw number.
 */
export function describeStatus(status: number): string {
	return STATUS_MESSAGES[status] ?? `Unknown status code ${status}.`;
}

/**
 * Maximum lengths and bounds documented in the API spec, surfaced so the node
 * can validate before hitting the network.
 */
export const LIMITS = {
	TEXT_MAX: 1000,
	LIST_TEXT_MAX: 85,
	CAPTION_MAX: 30,
	FILE_NAME_MAX: 25,
	TEMPLATE_PARAM_MAX: 125,
	LIST_OPTION_MAX: 50,
	LIST_OPTIONS_MIN: 2,
	LIST_OPTIONS_MAX: 10,
	CAROUSEL_ITEMS_MIN: 2,
	CAROUSEL_ITEMS_MAX: 5,
	CAROUSEL_TITLE_MIN: 2,
	CAROUSEL_TITLE_MAX: 38,
	CAROUSEL_PRIMARY_LABEL_MAX: 10,
	CAROUSEL_SECONDARY_LABEL_MAX: 12,
	VIDEO_MAX_BYTES: 200 * 1024 * 1024,
	VIDEO_MAX_DURATION: 600,
	TTL_MIN: 30,
	TTL_MAX: 1209600,
};

/**
 * Numeric Viber message types, grouped by content so the node can keep them
 * out of the user-facing UI. The operation + reach/category options resolve to
 * one of these.
 */
export const VIBER_TYPE = {
	// Text
	TEXT_TRANSACTIONAL_LEGACY: 206,
	TEXT_PROMOTIONAL: 225,
	TEXT_SESSION: 306,
	// Transactional templates
	TEMPLATE_SMARTPHONE: 1701,
	TEMPLATE_ALL: 1702,
	// Image only
	IMAGE_PROMOTIONAL_SMARTPHONE: 7,
	IMAGE_PROMOTIONAL_ALL: 107,
	IMAGE_SESSION: 307,
	// Image + text + button
	IMAGE_BUTTON_SMARTPHONE: 8,
	IMAGE_BUTTON_ALL: 108,
	IMAGE_BUTTON_FULLSCREEN: 210,
	// Text + button
	TEXT_BUTTON_SMARTPHONE: 9,
	TEXT_BUTTON_ALL: 109,
	// File
	FILE_TRANSACTIONAL: 220,
	FILE_SESSION: 221,
	FILE_TRANSACTIONAL_NO_TRACKING: 222,
	FILE_TRANSACTIONAL_SMARTPHONE: 223,
	FILE_SESSION_SMARTPHONE: 224,
	// Video
	VIDEO: 230,
	VIDEO_TEXT: 231,
	VIDEO_TEXT_BUTTON: 232,
	VIDEO_TEXT_ACTION_BUTTON: 233,
	// List / Quick replies
	LIST_TRANSACTIONAL: 801,
	LIST_SESSION: 802,
	// Carousel
	CAROUSEL: 901,
};

/**
 * Types for which Viber expects a #tracking_data field (the "replyable" types).
 *
 * This mirrors the proven set from the original Viber node: the all-devices
 * promotional/media/button variants, session text/image, files (220), lists
 * and carousel — plus 802 (session list, added in API v11.2). Smartphone-only
 * types (7, 8, 9) and the 100-series image/button types (107, 108, 109) do NOT
 * accept tracking data; sending it on those triggers status 6. The value may be
 * an empty string — Viber accepts that for these types.
 */
export const TRACKING_REQUIRED = new Set<number>([
	206, 207, 208, 209, 210, 220, 225, 306, 307, 230, 231, 232, 233, 801, 802, 901,
]);

/**
 * Types that accept the #imageFormat parameter (static image vs animated GIF).
 */
export const GIF_CAPABLE = new Set<number>([7, 107, 207, 8, 108, 208, 307]);

/**
 * Shape of a single carousel item after normalisation.
 */
export interface CarouselButton {
	label: string;
	actionUrl: string;
}

export interface CarouselItem extends IDataObject {
	title: string;
	imageUrl: string;
	primaryButton: CarouselButton;
	secondaryButton?: CarouselButton;
}

export const WEEK_TO_MS = 604800000;

export const DAY_TO_MS = 86400000;

export const HOUR_TO_MS = 3600000;

export const MINUTE_TO_MS = 60000;

export const MONTH_TO_MS = 30 * DAY_TO_MS;

export const LIMIT_TEACHER_CALENDAR_CREATE = 0.5 * HOUR_TO_MS;

export const MAX_TIME_TEACHER_REGULAR_TO_DYNAMIC_CALENDAR = 7 * 24 * HOUR_TO_MS;

export const TEACHING_CIRCLE = 2 * WEEK_TO_MS;

export const CIRCLE_START_DATES = [1, 16];

export const MID_MONTH = 16;

export const ALLOWED_TIME_TO_REPORT_ABSENCE = 2 * HOUR_TO_MS;

export const NORMAL_LATE_TIME_TO_REPORT_ABSENCE = 1 * HOUR_TO_MS;

export const DATE_TIME_FORMAT = 'DD-MM hh:mm';

export const MINUTE_TO_SECOND = 60;

export const PEAK_TIME_START = (17 - 7) * HOUR_TO_MS + 30 * MINUTE_TO_MS; // 17h30 VN time in GMT time
export const PEAK_TIME_END = (21 - 7) * HOUR_TO_MS + 30 * MINUTE_TO_MS;

export const OVER_TIME_FOR_DO_HOMEWORK = 48; // if over 48hours after done booking, student not done homework then alert via email and notification

export const MAX_DAYS_QUERY_REPORT = 60;

export const MIN_MONTH_TO_REQUEST_CLOSE_REGULAR = 3;

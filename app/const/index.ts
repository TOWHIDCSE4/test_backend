export const DEFAULT_PASSWORD = 'hamia123456';

export const TEACHER_LEVEL_STATUS = {
    UPGRADE: 1,
    DOWNGRADE: 2,
    KEEP: 3
};

export const MAX_LIMIT = 100;

export const FILE_TYPES = ['pdf', 'xlsx', 'pptx'];

export interface PaginationInfo {
    page_size: number;
    page_number: number;
}

export const PIVOT_HOUR_FOR_AVG = 72; // Time limit to calculated avg

export enum EnumGender {
    MALE,
    FEMALE,
    OTHER
}

export const MAX_STUDENTS_WITH_THE_SAME_EMAIL = 20;

export * from './date-time';

export const LOCATION_ID_VIETNAM = 168;
export const LOCATION_ID_ASIAN = 170;
export const LOCATION_ID_BANNGU = 172;
export const CODE_CACHE_CRM = 'user_crm_';
export const OTP_PHONE_CACHE = 'otp_phone_';

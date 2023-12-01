export const MAX_ASSESSMENT_POINT = 10;

export const MAX_BEST_MEMO_EACH_DAY = 3;

export const ADMIN_TRIAL_ASSESSMENT_FIELD = ['reading', 'writing'];

export const NORMAL_BOOKING_ASSESSMENT_FIELDS = [
    'discipline',
    'interaction',
    'attention'
];

export const ASSESSMENT_FIELDS = [
    'listening' /** Trial memo */,
    'speaking' /** Trial memo */,
    'learning-attitude' /** Trial memo */,
    'learning-environment' /** Trial memo */,
    'ability-to-repeat' /** Trial memo */,
    'attendance' /** Scheduled memo */,
    'attitude' /** Scheduled memo */,
    'homeword' /** Scheduled memo */
]
    .concat(ADMIN_TRIAL_ASSESSMENT_FIELD)
    .concat(NORMAL_BOOKING_ASSESSMENT_FIELDS);

export const NORMAL_MEMO_LATE_HOUR = 12;

export const TRIAL_MEMO_LATE_HOUR = 8;

export enum ENUM_MEMO_NOTE_FIELD {
    listening = 'listening',
    speaking = 'speaking',
    vocabulary = 'vocabulary',
    grammar = 'grammar'
}

export enum ENUM_MEMO_OTHER_NOTE_FIELD {
    attention = 'attention',
    comprehension = 'comprehension',
    performance = 'performance',
    strength = 'strength',
    weakness = 'weakness',
    another_comment = 'another_comment'
}

export interface IMemoOtherNote {
    keyword: ENUM_MEMO_OTHER_NOTE_FIELD;
    comment: string;
}

export interface IMemoNote {
    point: number;
    keyword: ENUM_MEMO_NOTE_FIELD;
    comment: string;
}

export interface StudentLevel {
    id: number;
    name: string;
}

export interface IOriginMemo {
    note: IMemoNote[];
    other: IMemoOtherNote[];
    student_starting_level?: StudentLevel;
    created_time?: Date;
}
export const MEMO_NOTE_FIELDS = [
    'listening',
    'speaking',
    'vocabulary',
    'grammar'
];

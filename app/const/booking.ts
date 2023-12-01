export const OverTime = 1000 * 60 * 60 * 0.5; //0.5 hour

export const OverTimeFinish = 1000 * 60 * 60 * 8; //8 hour

export const TYPE = {
    TRIAL: 0,
    REGULAR: 1,
    FLEXIBLE: 2
};
export const LESSON_STATUS = [
    {
        name: 'All',
        id: -1
    },
    {
        name: 'Pending',
        id: 2
    },
    {
        name: 'Upcoming',
        id: 3
    },
    {
        name: 'Teaching',
        id: 4
    },
    {
        name: 'Student Absent',
        id: 5
    },
    {
        name: 'Teacher Absent',
        id: 6
    },
    {
        name: 'Student Cancel',
        id: 7
    },
    {
        name: 'Teacher Cancel',
        id: 8
    },
    {
        name: 'Completed',
        id: 1
    },
    {
        name: 'Change Time',
        id: 11
    }
];

export const MIN_COMPLETED_BOOKING_FOR_MONTHLY_MEMO = 6;

export const MIN_PERCENTAGE_TO_PICK_TEACHERS_FOR_COMMENT = 25;

export const MIN_LEARNT_UNITS_RATE_TO_CREATE_COURSE_MEMO = 90;

export const LEARNT_UNITS_RATE_FOR_LATE_COURSE_MEMO = 95;

export const RECENT_COMPLETED_BOOKINGS_MINUTES = 5;

export const IELTS_TEACHER_FAKE_ID = -99;

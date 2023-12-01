import {
    MINUTE_TO_MS,
    HOUR_TO_MS,
    DAY_TO_MS,
    WEEK_TO_MS,
    CIRCLE_START_DATES
} from '../const/date-time';
import moment from 'moment';

type CalendarFilterQuery = {
    start_time?: number | any;
    is_active?: boolean;
    teacher_id?: number;
    $or?: any[];
};

export const toReadableDateTime = (date_time: Date | number) => {
    const date = new Date(date_time);
    const year = date.getFullYear();
    let month: number | string = 1 + date.getMonth();
    month = month >= 10 ? month : '0' + month;
    let day: number | string = date.getDate();
    day = day >= 10 ? day : '0' + day;

    let hour: number | string = date.getHours();
    hour = hour >= 10 ? hour : '0' + hour;
    let min: number | string = date.getMinutes();
    min = min >= 10 ? min : '0' + min;
    const time = hour + '.' + min;
    const _date = day + '.' + month + '.' + year;
    return time + 'T' + _date;
};

export const getCurrentWeek = (start_time: number | Date) => {
    const days = [];
    for (let i = 0; i <= 6; i++) {
        const start_date = new Date(start_time);
        days.push(start_date.setDate(start_date.getDate() + i));
    }
    return days;
};

export const createTimeModArray = (
    searchTime: Date,
    division: number,
    size: number
) => {
    const timeMods = [];
    const search = new Date(searchTime).getTime();
    for (let i = 0; i < size; i++) {
        const timeStampMod = (search + 30 * MINUTE_TO_MS * i) % division;
        timeMods.push({ start_time: { $mod: [division, timeStampMod] } });
    }
    return timeMods;
};

export const buildCalendarFilter = (calendar: {
    is_active?: boolean;
    teacher_id?: number | string;
    start_time?: number | string;
    end_time?: number | string;
    hour_of_day?: number | string;
    day_of_week?: number | string;
    timezone_offset?: number | string;
}): CalendarFilterQuery => {
    if (!calendar) return {};
    const {
        teacher_id,
        start_time,
        end_time,
        hour_of_day,
        day_of_week,
        timezone_offset
    } = calendar;
    /* If there's no filter, no need to bother anymore */
    if (
        !start_time &&
        !end_time &&
        !hour_of_day &&
        hour_of_day != 0 &&
        !day_of_week &&
        day_of_week != 0
    ) {
        return calendar as CalendarFilterQuery;
    }
    let is_active;
    if (calendar.hasOwnProperty('is_active')) {
        is_active = calendar.is_active;
    } else {
        is_active = true;
    }

    let calendar_filter = {};
    /* Detail filter */
    let start_timestamp = new Date(parseInt(start_time as string)).getTime();
    const end_timestamp = new Date(parseInt(end_time as string)).getTime();
    if (!start_timestamp) {
        start_timestamp = new Date().getTime();
    }
    let start_time_filter, end_time_filter;
    if (end_timestamp) {
        start_time_filter = {
            $gte: start_timestamp,
            $lt: end_timestamp
        };
        end_time_filter = {
            $gt: start_timestamp,
            $lte: end_timestamp
        };
    } else {
        start_time_filter = {
            $gte: start_timestamp
        };
        end_time_filter = undefined;
    }

    /* General filter */
    let division, size;
    if (day_of_week || day_of_week == 0) {
        division = WEEK_TO_MS;
        if (hour_of_day || hour_of_day == 0) {
            size = 2;
        } else {
            size = 24 * 2; /* Each hour has 2 calendar slot */
        }
    } else {
        division = DAY_TO_MS;
        if (hour_of_day || hour_of_day == 0) {
            size = 2;
        } else {
            size = 0; /* No day, no hour, no need to search */
        }
    }
    const searchDay = new Date(
        '6/6/2021UTC'
    ).getTime(); /* Sunday Jun 06 2021 00:00:00 UTC */
    const hour = hour_of_day ? parseInt(hour_of_day as string) : 0;
    const day = day_of_week ? parseInt(day_of_week as string) : 0;
    const timezone = timezone_offset ? parseInt(timezone_offset as string) : 0;
    const searchTime = new Date(
        searchDay + day * DAY_TO_MS + hour * HOUR_TO_MS + timezone * HOUR_TO_MS
    );
    const timeMods = createTimeModArray(searchTime, division, size);
    if (timeMods.length <= 0) {
        calendar_filter = {
            is_active,
            teacher_id,
            start_time: start_time_filter,
            end_time: end_time_filter
        };
    } else {
        calendar_filter = {
            is_active,
            teacher_id,
            start_time: start_time_filter,
            end_time: end_time_filter,
            $or: timeMods
        };
    }
    return calendar_filter;
};

/*
 * @description: Check if a time stamp is a valid time to start class (*:00 or *:30)
 * @param: timestamp {number} - Timestamp number
 * @return: true or false
 */
export const isValidStartTimestamp = (timestamp: number): boolean => {
    if (timestamp < 0) {
        return false;
    }
    if (0 == timestamp % HOUR_TO_MS) return true;
    if (30 * MINUTE_TO_MS == timestamp % HOUR_TO_MS) return true;
    return false;
};

/*
 * @description: Check if two timestamp arrays are the same timestamp set
 * @param: first_arr <number[]> - The first array, a set of number with
 *         no duplicate elements
 * @param: second_arr <number[]> - The second array, a set of number with
 *         no duplicate elements
 * @return: true or false
 */
export const isTheSameTimestampSet = (
    first_arr: number[],
    second_arr: number[]
): boolean => {
    first_arr.sort((a, b) => {
        return a - b;
    });
    second_arr.sort((a, b) => {
        return a - b;
    });
    return first_arr.toString() == second_arr.toString();
};

/**
 * @TODO: Currently, servers will use UTC timezone, if later we decide to
 * change how servers parse time for users, change it here
 */
export const getTimestampInWeek = (current_timestamp: number): number => {
    const current_date = new Date(current_timestamp);
    const day_of_week = current_date.getUTCDay();
    const hour_in_day = current_date.getUTCHours();
    const minute_in_hour = current_date.getUTCMinutes();

    return (
        day_of_week * DAY_TO_MS +
        hour_in_day * HOUR_TO_MS +
        minute_in_hour * MINUTE_TO_MS
    );
};

export const getStartOfTheWeek = (current_time: number): number => {
    const date = new Date(current_time);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    const minute = date.getUTCMinutes();
    const second = date.getUTCSeconds();
    const millisecond = date.getUTCMilliseconds();
    const start_of_the_week =
        current_time -
        day * DAY_TO_MS -
        hour * HOUR_TO_MS -
        minute * MINUTE_TO_MS -
        second * 1000 -
        millisecond;
    return start_of_the_week;
};

export const getTimestampListInPeriod = (
    timestamps_in_week: number[],
    start_timestamp: number,
    end_timestamp: number
): number[] => {
    const timestamps = new Array<number>();
    for (const timestamp_in_week of timestamps_in_week) {
        let time_in_this_week =
            getStartOfTheWeek(start_timestamp) + timestamp_in_week;
        if (time_in_this_week < start_timestamp) {
            time_in_this_week += 7 * DAY_TO_MS;
        }

        while (time_in_this_week <= end_timestamp) {
            timestamps.push(time_in_this_week);
            time_in_this_week += 7 * DAY_TO_MS;
        }
    }
    timestamps.sort((a, b) => {
        return a - b;
    });

    return timestamps;
};

export const getThisCircle = () => {
    const date = new Date();
    const day = date.getDate();
    let circle = 0;
    for (const key in CIRCLE_START_DATES) {
        circle = parseInt(key) + 1;
        if (circle != CIRCLE_START_DATES.length) {
            if (day < CIRCLE_START_DATES[circle]) {
                break;
            }
        }
    }
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return {
        month,
        year,
        circle
    };
};

export const getStartAndEndTimeOfACircle = (
    month: number,
    year: number,
    circle: number
) => {
    const circle_times = {
        start_time: 0,
        end_time: 0
    };
    if (month <= 0 && month > 12) {
        return circle_times;
    }
    if (CIRCLE_START_DATES[circle - 1] == undefined) {
        return circle_times;
    }
    const start_date = new Date();
    start_date.setUTCMilliseconds(0);
    start_date.setUTCSeconds(0);
    start_date.setUTCMinutes(0);
    start_date.setUTCHours(0);
    start_date.setUTCDate(CIRCLE_START_DATES[circle - 1]);
    start_date.setUTCMonth(month - 1);
    start_date.setUTCFullYear(year);
    const end_date = new Date();
    if (circle == CIRCLE_START_DATES.length) {
        circle = 0;
        if (month == 12) {
            month = 1;
            year++;
        } else {
            month++;
        }
    }
    end_date.setUTCMilliseconds(0);
    end_date.setUTCSeconds(0);
    end_date.setUTCMinutes(0);
    end_date.setUTCHours(0);
    end_date.setUTCDate(CIRCLE_START_DATES[circle]);
    end_date.setUTCMonth(month - 1);
    end_date.setUTCFullYear(year);
    circle_times.start_time = start_date.getTime();
    circle_times.end_time = end_date.getTime();
    return circle_times;
};

export const each7DaysInRange = (start: Date | number, end: Date | number) => {
    start = +start;
    end = +end;
    const result = [];
    let current = start;
    let prev;
    while (current < end) {
        prev = current;
        current += WEEK_TO_MS;
        if (current + WEEK_TO_MS > end) {
            current = end;
        }
        if (prev) {
            result.push([prev, current]);
        }
    }
    return result;
};

export const getNextCircleFirstCalculatedDate = (): Date => {
    const this_circle = getThisCircle();
    const this_circle_start_and_end = getStartAndEndTimeOfACircle(
        this_circle.month,
        this_circle.year,
        this_circle.circle
    );
    const next_circle_first_calculated_date =
        this_circle_start_and_end.end_time + DAY_TO_MS;
    return new Date(next_circle_first_calculated_date);
};

export const enumerateDaysBetweenDates = (
    startDate: number,
    endDate: number
) => {
    const currDate = moment(startDate).startOf('day');
    const lastDate = moment(endDate).startOf('day');
    const dates = [currDate.clone().toDate()];

    while (currDate.add(1, 'days').diff(lastDate) <= 0) {
        dates.push(currDate.clone().toDate());
    }

    return dates;
};

export const parse1970ToTimestampInWeek = (timestamp: number): number => {
    const current_time = new Date().getTime();
    const startOfTheWeek = getStartOfTheWeek(current_time);
    let calendar = startOfTheWeek + timestamp;
    return calendar;
};

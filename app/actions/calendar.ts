import mongoose from 'mongoose';
import Calendar, { CalendarModel } from '../models/calendar';
import CounterActions from './counter';

/*
 * When adding a field into this type, remember to add
 * a field to buildCalendarFilter() in datetime-utils
 */
type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | Object;
    page_size?: number;
    page_number?: number;
    start_time?: number | object;
    end_time?: number | object;
    is_active?: boolean;
    teacher_id?: number;
    $or?: object[];
    range_time?: any;
    ispeak_calendar_id?: number;
};

export default class CalendarActions {
    public static findAll(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = {}
    ): Promise<Calendar[]> {
        const conditions: FilterQuery = {};
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.start_time) {
            conditions.start_time = filter.start_time;
        }
        if (filter.end_time) {
            conditions.end_time = filter.end_time;
        }
        if (filter.hasOwnProperty('$or')) {
            conditions.$or = filter.$or;
        }
        return CalendarModel.find(conditions, {
            ...select_fields
        })
            .populate('teacher')
            .sort(sort)
            .exec();
    }

    public static async findAllAndPaginated(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { created_time: -1 }
    ): Promise<Calendar[]> {
        const calendars = await CalendarActions.findAll(
            filter,
            select_fields,
            sort
        );
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return calendars.slice(skip, skip + limit);
    }

    public static async findAllForWebApp(
        filter: FilterQuery,
        select_fields: object = {},
        sort: object = { start_time: -1 }
    ): Promise<Calendar[]> {
        if (!filter.start_time || !filter.end_time || !filter.teacher_id)
            return Promise.resolve([]);
        filter.is_active = true;
        const calendars = await CalendarActions.findAll(
            filter,
            select_fields,
            sort
        );
        return calendars;
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<Calendar | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return CalendarModel.findOne(filter, {
            ...select_fields
        })
            .populate('teacher')
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions: FilterQuery = {};
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.start_time) {
            conditions.start_time = filter.start_time;
        }
        if (filter.end_time) {
            conditions.end_time = filter.end_time;
        }
        if (filter.hasOwnProperty('$or')) {
            conditions.$or = filter.$or;
        }
        return CalendarModel.countDocuments(conditions).exec();
    }

    public static create(calendar: Calendar): Promise<Calendar> {
        const newModel = new CalendarModel({
            ...calendar,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('calendar_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Calendar
    ): Promise<any> {
        return CalendarModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff,
                    updated_time: new Date()
                }
            },
            {
                upsert: false,
                new: true,
                returnOriginal: false
            }
        ).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return CalendarModel.deleteOne({ _id });
    }

    public static absentOnAPeriod(
        teacher_id: number,
        start_time: number,
        end_time: number
    ) {
        return CalendarModel.updateMany(
            {
                teacher_id,
                start_time: { $gte: start_time },
                end_time: { $lte: end_time }
            },
            {
                $set: {
                    is_active: false
                }
            },
            {
                upsert: false
            }
        ).exec();
    }

    public static async getAllCalendersEachTeacher(
        filter: FilterQuery
    ): Promise<any[]> {
        const conditions: FilterQuery = {};
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;

        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.range_time) {
            conditions.start_time = {
                $gte: filter.range_time.start_time
            };
            conditions.end_time = {
                $gte: filter.range_time.end_time
            };
        }
        return CalendarModel.aggregate([
            { $match: conditions },
            { $group: { _id: '$teacher_id', schedule_slots: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'teachers',
                    localField: '_id',
                    foreignField: 'user_id',
                    as: 'teacher'
                }
            },
            { $unwind: '$teacher' },
            {
                $lookup: {
                    from: 'teacher-levels',
                    localField: 'teacher.level',
                    foreignField: '_id',
                    as: 'teacher.level'
                }
            },
            { $unwind: '$teacher.level' },
            {
                $lookup: {
                    from: 'admins',
                    localField: 'teacher.staff_id',
                    foreignField: 'id',
                    as: 'teacher.staff'
                }
            },
            // { $unwind: '$teacher.staff' },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ]).exec();
    }
}

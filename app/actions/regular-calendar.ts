import mongoose from 'mongoose';
import RegularCalendar, {
    RegularCalendarModel,
    EnumRegularCalendarStatus
} from '../models/regular-calendar';
import _ from 'lodash';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    student_id?: number;
    teacher_id?: number;
    course_id?: number;
    created_time?: any;
    ordered_package_id?: number;
    regular_start_time?: any;
    page_size?: number;
    page_number?: number;
    teacher_name?: string;
    status?: number[] | any;
    $or?: Array<any>;
    $and?: Array<any>;
    alerted?: any;
    ispeak_regular_id?: number;
};

export default class RegularCalendarActions {
    public static buildFilterQuery(filter: FilterQuery) {
        const conditions: FilterQuery = {};
        if (filter.teacher_id) {
            conditions.teacher_id = filter.teacher_id;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.course_id) {
            conditions.course_id = filter.course_id;
        }
        if (filter.created_time) {
            conditions.created_time = filter.created_time;
        }
        if (filter.ordered_package_id) {
            conditions.ordered_package_id = filter.ordered_package_id;
        }
        if (filter.hasOwnProperty('regular_start_time')) {
            conditions.regular_start_time = filter.regular_start_time;
        }
        if (filter.status) {
            conditions.status = { $in: filter.status };
        }
        if (filter.alerted && _.isArray(filter.alerted)) {
            conditions.$or = conditions.$or
                ? conditions.$or?.concat(filter.alerted)
                : filter.alerted;
        }
        if (filter.ispeak_regular_id) {
            conditions.ispeak_regular_id = filter.ispeak_regular_id;
        }
        return conditions;
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { regular_start_time: 1 }
    ): Promise<RegularCalendar[]> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        return RegularCalendarModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { regular_start_time: 1 }
    ): Promise<RegularCalendar[]> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return RegularCalendarModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .populate('ordered_package')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static getAllActiveRegularCalendarsForCronJobs(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { regular_start_time: 1 }
    ): Promise<RegularCalendar[]> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return RegularCalendarModel.aggregate([
            { $sort: { regular_start_time: 1 } },
            { $match: conditions },
            {
                $facet: {
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'ordered-packages',
                                localField: 'ordered_package_id',
                                foreignField: 'id',
                                as: 'ordered_packages'
                            }
                        }
                    ],
                    count: [{ $group: { _id: null, count: { $sum: 1 } } }]
                }
            }
        ]).exec();
    }

    public static findAllWithAggr(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { regular_start_time: 1 }
    ): Promise<RegularCalendar[]> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        if (_.has(filter, 'teacher_name')) {
            const search = {
                $or: [
                    {
                        'teacher.full_name': {
                            $regex: _.escapeRegExp(
                                _.get(filter, 'teacher_name')
                            ),
                            $options: 'i'
                        }
                    },
                    {
                        'teacher.username': {
                            $regex: _.escapeRegExp(
                                _.get(filter, 'teacher_name')
                            ),
                            $options: 'i'
                        }
                    }
                ]
            };
            conditions.$and = conditions.$and || [];
            conditions.$and.push(search);
        }
        if (_.has(filter, 'student_name')) {
            const search = {
                $or: [
                    {
                        'student.full_name': {
                            $regex: _.escapeRegExp(
                                _.get(filter, 'student_name')
                            ),
                            $options: 'i'
                        }
                    },
                    {
                        'student.username': {
                            $regex: _.escapeRegExp(
                                _.get(filter, 'student_name')
                            ),
                            $options: 'i'
                        }
                    }
                ]
            };
            conditions.$and = conditions.$and || [];
            conditions.$and.push(search);
        }
        if (_.has(filter, 'course_name')) {
            const search = {
                'course.name': {
                    $regex: _.escapeRegExp(_.get(filter, 'course_name')),
                    $options: 'i'
                }
            };
            conditions.$and = conditions.$and || [];
            conditions.$and.push(search);
        }
        if (_.has(filter, 'package_name')) {
            const search = {
                'ordered_package.package_name': {
                    $regex: _.escapeRegExp(_.get(filter, 'package_name')),
                    $options: 'i'
                }
            };
            conditions.$and = conditions.$and || [];
            conditions.$and.push(search);
        }
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return RegularCalendarModel.aggregate([
            { $sort: { regular_start_time: 1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'teacher',
                    foreignField: '_id',
                    as: 'teacher'
                }
            },
            {
                $unwind: '$teacher'
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'student',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            {
                $unwind: '$student'
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'course',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            {
                $unwind: '$course'
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered_package'
                }
            },
            {
                $unwind: '$ordered_package'
            },
            {
                $project: {
                    teacher: {
                        _id: 0,
                        __v: 0,
                        password: 0,
                        role: 0,
                        is_password_null: 0,
                        login_counter: 0,
                        created_time: 0,
                        updated_time: 0
                    },
                    student: {
                        _id: 0,
                        __v: 0,
                        password: 0,
                        role: 0,
                        is_password_null: 0,
                        login_counter: 0,
                        created_time: 0,
                        updated_time: 0
                    }
                }
            },
            { $match: conditions },
            {
                $facet: {
                    data: [{ $skip: skip }, { $limit: limit }],
                    count: [{ $group: { _id: null, count: { $sum: 1 } } }]
                }
            }
        ]).exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        return RegularCalendarModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any,
        sort = { created_time: -1 }
    ): Promise<RegularCalendar | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        if (filter.status) {
            filter.status = { $in: filter.status };
        }
        return RegularCalendarModel.findOne(filter, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate(
                'teacher',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('course')
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static create(request: RegularCalendar): Promise<RegularCalendar> {
        const newModel = new RegularCalendarModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('regular_calendar_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: RegularCalendar
    ): Promise<any> {
        return RegularCalendarModel.findOneAndUpdate(
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
        return RegularCalendarModel.deleteOne({ _id });
    }

    public static findRegularCalendarWithCourseAndStudent(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { regular_start_time: 1 }
    ): Promise<RegularCalendar[]> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        return RegularCalendarModel.aggregate([
            { $match: conditions },
            // group by course_id, student_id to get distinct
            {
                $group: {
                    _id: {
                        course_id: '$course_id',
                        student_id: '$student_id',
                        ordered_package_id: '$ordered_package_id'
                    }
                }
            }
        ]).exec();
    }

    public static updateMany(
        filter: FilterQuery,
        diff: RegularCalendar
    ): Promise<any> {
        const conditions = RegularCalendarActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length > 0) {
            return RegularCalendarModel.updateMany(
                conditions,
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
        return Promise.resolve(null);
    }

    public static finishCourseForStudent(
        student_id: number,
        course_id: number
    ): Promise<any> {
        return RegularCalendarModel.findOneAndUpdate(
            {
                student_id,
                course_id
            },
            {
                $set: {
                    status: EnumRegularCalendarStatus.FINISHED,
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

    public static expireRegularCalendar(
        student_id: number,
        ordered_package_id: number,
        is_expired: boolean
    ): Promise<any> {
        return RegularCalendarModel.updateMany(
            {
                student_id,
                ordered_package_id,
                status: {
                    $in: [
                        EnumRegularCalendarStatus.ACTIVE,
                        EnumRegularCalendarStatus.ACTIVE_TEACHER_REQUEST_CANCELING,
                        EnumRegularCalendarStatus.EXPIRED
                    ]
                }
            },
            {
                $set: {
                    status: is_expired
                        ? EnumRegularCalendarStatus.EXPIRED
                        : EnumRegularCalendarStatus.ACTIVE,
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

    public static removeManyRegularCalendarOfTeacherInactive(
        teacher_id: number
    ): any {
        return RegularCalendarModel.deleteMany({
            teacher_id: teacher_id,
            auto_schedule: null
        });
    }
}

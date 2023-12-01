import mongoose from 'mongoose';
import PackageActions from './package';
import Course, { CourseModel } from '../models/course';
import CounterActions from './counter';
import { escapeRegExp } from 'lodash';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number;
    is_active?: boolean;
    package_id_list?: number[];
    subject_id?: number | any;
    curriculum?: string;
    curriculum_id?: number | any;
    alias?: string;
    slug?: string;
    search?: string;
    $or?: Array<any>;
    $and?: Array<any>;
    page_size?: number;
    page_number?: number;
    subject_ids?: number[];
    tags?: string[] | any;
    course_type?: string;
};

export default class CourseActions {
    public static async buildFilterQuery(
        filter: FilterQuery
    ): Promise<FilterQuery> {
        const conditions: FilterQuery = {};
        if (filter._id) {
            conditions._id = filter._id;
        }
        if (filter.subject_id) {
            conditions.subject_id = filter.subject_id;
        }
        if (filter.curriculum_id) {
            conditions.curriculum_id = filter.curriculum_id;
        }
        if (filter.curriculum) {
            conditions.curriculum = filter.curriculum;
        }
        if (filter.subject_ids && filter.subject_ids.length > 0) {
            conditions.subject_id = { $in: filter.subject_ids };
        }
        if (filter.course_type) {
            conditions.course_type = filter.course_type;
        }
        if (filter.hasOwnProperty('is_active')) {
            conditions.is_active = filter.is_active;
        }
        if (
            filter.package_id_list &&
            Array.isArray(filter.package_id_list) &&
            filter.package_id_list.length > 0
        ) {
            const subject_id_set = new Set<number>();
            const packages = await PackageActions.findAll({
                id: { $in: filter.package_id_list }
            });
            for (const pack of packages) {
                subject_id_set.add(pack.subject_id);
            }
            conditions.$or = [
                {
                    /**
                     * To match course with no specified package pool,
                     * we use subject_id
                     */
                    package_id_list: [],
                    subject_id: { $in: Array.from(subject_id_set) }
                },
                { package_id_list: { $in: filter.package_id_list } }
            ];
        }
        if (
            filter.tags &&
            Array.isArray(filter.tags) &&
            filter.tags.length > 0
        ) {
            conditions.tags = { $all: filter.tags };
        }
        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            const name_search = {
                $regex: searchRegexStr,
                $options: 'i'
            };
            const name_filter = [
                { name: name_search },
                { alias: name_search },
                { slug: name_search }
            ];
            if (conditions.$or) {
                conditions.$and = [
                    { $or: conditions.$or },
                    { $or: name_filter }
                ];
                delete conditions['$or'];
            } else {
                conditions.$or = name_filter;
            }
        }
        return conditions;
    }

    // For Administrator call Functions
    public static async findAllAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Course[]> {
        const conditions = await CourseActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CourseModel.find(conditions, {
            ...select_fields
        })
            .populate('packages')
            .populate('subject')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static async findAll(
        filter: FilterQuery,
        sort: any = { created_time: -1 },
        select_fields: any = {}
    ): Promise<Course[]> {
        if (Object.keys(filter).length === 0) return Promise.resolve([]);
        const conditions = await CourseActions.buildFilterQuery(filter);
        return CourseModel.find(conditions, {
            ...select_fields
        })
            .sort(sort)
            .exec();
    }

    public static async count(filter: FilterQuery): Promise<number> {
        const conditions = await CourseActions.buildFilterQuery(filter);
        return CourseModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<Course | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return CourseModel.findOne(filter, {
            ...select_fields
        })
            .populate('packages')
            .populate('subject')
            .exec();
    }

    public static create(course: Course): Promise<Course> {
        const newModel = new CourseModel({
            ...course,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('course_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: Course
    ): Promise<any> {
        return CourseModel.findOneAndUpdate(
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

    public static removeAPackageFromAllCourses(
        package_object_id: mongoose.Types.ObjectId,
        package_id: number
    ): Promise<any> {
        return CourseModel.updateMany(
            {},
            {
                $pull: {
                    package_id_list: package_id,
                    packages: package_object_id
                }
            }
        ).exec();
    }

    public static remove(_id: mongoose.Types.ObjectId): any {
        return CourseModel.deleteOne({ _id });
    }

    public static async findCourseAndTotalLessonAndPaginated(
        filter: FilterQuery,
        sort: any = { created_time: -1 }
    ): Promise<Course[]> {
        const conditions = await CourseActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return CourseModel.aggregate([
            { $match: conditions },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'packages',
                    localField: 'packages',
                    foreignField: '_id',
                    as: 'package'
                }
            },
            {
                $lookup: {
                    from: 'subjects',
                    localField: 'subject_id',
                    foreignField: 'id',
                    as: 'subject'
                }
            },
            {
                $lookup: {
                    from: 'units',
                    localField: 'id',
                    foreignField: 'course_id',
                    as: 'unit'
                }
            },
            {
                $addFields: {
                    total_lessons: { $size: '$unit' }
                }
            },
            {
                $unset: 'unit'
            }
        ]).exec();
    }
}

import mongoose from 'mongoose';
import StudentExtensionRequest, {
    StudentExtensionRequestModel
} from '../models/student-extension-request';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    student_id?: number;
    status?: number[] | any;
    number_of_days?: number | any;
    min_days?: number | any;
    max_days?: number | any;
    ordered_package_id?: number;
    $and?: any[];
    $or?: any[];
    page_size?: number;
    page_number?: number;
    created_time?: any;
};

export default class StudentExtensionRequestActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
        }
        if (filter.created_time) {
            conditions.created_time = filter.created_time;
        }
        if (
            filter.status &&
            Array.isArray(filter.status) &&
            filter.status.length > 0
        ) {
            conditions.status = {
                $in: filter.status
            };
        }
        if (filter.number_of_days) {
            conditions.number_of_days = filter.number_of_days;
        }
        if (filter.ordered_package_id) {
            conditions.ordered_package_id = filter.ordered_package_id;
        }
        if (filter.min_days) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            conditions.$and.push({
                number_of_days: {
                    $gte: filter.min_days
                }
            });
        }
        if (filter.max_days) {
            if (!conditions.$and) {
                conditions.$and = new Array<any>();
            }
            conditions.$and.push({
                number_of_days: {
                    $lte: filter.max_days
                }
            });
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<StudentExtensionRequest[]> {
        const conditions =
            StudentExtensionRequestActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return StudentExtensionRequestModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('ordered_package')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    public static findAll(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<StudentExtensionRequest[]> {
        const conditions =
            StudentExtensionRequestActions.buildFilterQuery(filter);
        return StudentExtensionRequestModel.find(conditions, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('ordered_package')
            .sort(sort)
            .exec();
    }

    public static count(filter: FilterQuery): Promise<number> {
        const conditions =
            StudentExtensionRequestActions.buildFilterQuery(filter);
        return StudentExtensionRequestModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<StudentExtensionRequest | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return StudentExtensionRequestModel.findOne(filter, {
            ...select_fields
        })
            .populate(
                'student',
                '-_id -__v -password -role -is_password_null -login_counter -created_time -updated_time'
            )
            .populate('ordered_package')
            .exec();
    }

    public static create(
        request: StudentExtensionRequest
    ): Promise<StudentExtensionRequest> {
        const newModel = new StudentExtensionRequestModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('student_extension_request_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: StudentExtensionRequest
    ): Promise<any> {
        return StudentExtensionRequestModel.findOneAndUpdate(
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
        return StudentExtensionRequestModel.deleteOne({ _id });
    }
}

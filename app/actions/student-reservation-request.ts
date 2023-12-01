import mongoose from 'mongoose';
import StudentReservationRequest, {
    StudentReservationRequestModel
} from '../models/student-reservation-request';
import CounterActions from './counter';

type FilterQuery = {
    _id?: mongoose.Types.ObjectId;
    id?: number | any;
    student_id?: number;
    status?: number[] | any;
    start_time?: number | any;
    end_time?: number | any;
    ordered_package_id?: number;
    page_size?: number;
    page_number?: number;
};

export default class StudentReservationRequestActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter.id) {
            conditions.id = filter.id;
        }
        if (filter.student_id) {
            conditions.student_id = filter.student_id;
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
        if (filter.start_time) {
            conditions.start_time = filter.start_time;
        }
        if (filter.end_time) {
            conditions.end_time = filter.end_time;
        }
        if (filter.ordered_package_id) {
            conditions.ordered_package_id = filter.ordered_package_id;
        }
        return conditions;
    }

    public static findAllAndPaginated(
        filter: FilterQuery,
        select_fields: any = {},
        sort: any = { created_time: -1 }
    ): Promise<StudentReservationRequest[]> {
        const conditions =
            StudentReservationRequestActions.buildFilterQuery(filter);
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        return StudentReservationRequestModel.find(conditions, {
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
    ): Promise<StudentReservationRequest[]> {
        const conditions =
            StudentReservationRequestActions.buildFilterQuery(filter);
        return StudentReservationRequestModel.find(conditions, {
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
            StudentReservationRequestActions.buildFilterQuery(filter);
        return StudentReservationRequestModel.countDocuments(conditions).exec();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: any
    ): Promise<StudentReservationRequest | null> {
        if (Object.keys(filter).length === 0) return Promise.resolve(null);
        return StudentReservationRequestModel.findOne(filter, {
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
        request: StudentReservationRequest
    ): Promise<StudentReservationRequest> {
        const newModel = new StudentReservationRequestModel({
            ...request,
            created_time: new Date(),
            updated_time: new Date()
        });
        CounterActions.increaseId('student_reservation_request_id');
        return newModel.save();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: StudentReservationRequest
    ): Promise<any> {
        return StudentReservationRequestModel.findOneAndUpdate(
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
        return StudentReservationRequestModel.deleteOne({ _id });
    }
}

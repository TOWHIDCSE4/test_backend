import OperationIssueModel, {
    EnumStatus,
    OperationIssue
} from '../models/operation-issue';
import _ from 'lodash';
import mongoose, { Types } from 'mongoose';

type FilterQuery = {
    _id?: object;
    booking_id?: number;
    issue_description?: string;
    status?: number;
    resolved_staff_id?: number | any;
    resolved_time?: number;
};

export default class OperationIssueActions {
    public static buildFilterQuery(filter: FilterQuery): FilterQuery {
        const conditions: FilterQuery = {};
        if (filter._id) conditions._id = filter._id;
        if (filter.booking_id) conditions.booking_id = filter.booking_id;
        if (filter.issue_description)
            conditions.issue_description = filter.issue_description;
        if (filter.status) conditions.status = filter.status;
        if (filter.resolved_staff_id)
            conditions.resolved_staff_id = filter.resolved_staff_id;
        if (filter.resolved_time)
            conditions.resolved_time = filter.resolved_time;

        return conditions;
    }

    public static create(
        operationIssue: OperationIssue
    ): Promise<OperationIssue> {
        const newOperationIssue = new OperationIssueModel({
            ...operationIssue,
            status: EnumStatus.NOT_RESOLVED
        });
        return newOperationIssue.save();
    }

    public static findOne(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<OperationIssue | null> {
        const conditions = OperationIssueActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve(null);
        return OperationIssueModel.findOne(conditions, {
            ...select_fields
        }).exec();
    }

    public static find(
        filter: FilterQuery,
        select_fields?: object
    ): Promise<OperationIssue[]> {
        const conditions = OperationIssueActions.buildFilterQuery(filter);
        if (Object.keys(conditions).length === 0) return Promise.resolve([]);
        return OperationIssueModel.find(conditions, {
            ...select_fields
        }).exec();
    }

    public static update(
        _id: mongoose.Types.ObjectId,
        diff: OperationIssue
    ): Promise<any> {
        return OperationIssueModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    ...diff
                }
            },
            {
                upsert: false,
                new: true,
                returnOriginal: false
            }
        ).exec();
    }
}

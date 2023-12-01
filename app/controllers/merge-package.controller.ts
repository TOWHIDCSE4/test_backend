import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import MergedPackageActions from '../actions/merged-package';
import MergedPackage, {
    EnumMergedPackageStatus
} from '../models/merged-package';
import OrderedPackageActions from '../actions/ordered-package';
import { EnumPackageOrderType } from '../const/package';
const pickUpData = [
    '_id',
    'type',
    'target',
    'title',
    'content',
    'start_time_shown',
    'end_time_shown',
    'is_active',
    'image'
];
export default class MergePackageController {
    public static async getMergedPackages(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            _id,
            status,
            package_one_id,
            package_two_id,
            student_id
        } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (_id) {
            filter._id = _id;
        }
        if (student_id) {
            filter.student_id = student_id;
        }
        if (package_one_id) {
            filter.package_one_id = package_one_id;
        }
        if (package_two_id) {
            filter.package_two_id = package_two_id;
        }
        if (status) {
            filter.status = status;
        }
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const res_agg = await MergedPackageActions.findAllAndPaginated(filter);
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async getPremiumPackageUnMatchedByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { student_id } = req.query;
        const res_payload = {
            data: new Array<any>()
        };
        let arr = await OrderedPackageActions.findAll({
            user_id: Number(student_id),
            type: EnumPackageOrderType.PREMIUM,
            is_expired: false,
            gte_number_class: 0
        });
        const exists = await MergedPackageActions.findAll({
            student_id: Number(student_id)
        });
        arr = arr.filter((e) => {
            const existed = exists.find((item) => {
                return (
                    item.package_one_id === e.id || item.package_two_id === e.id
                );
            });
            return existed ? false : true;
        });

        if (arr) {
            res_payload.data = arr;
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async mergePackages(req: ProtectedRequest, res: Response) {
        const { package_one_id, package_two_id, student_id } = req.body;
        const exists = await MergedPackageActions.findOne({
            student_id,
            $or: [
                {
                    package_one_id: { $in: [package_one_id, package_two_id] }
                },
                {
                    package_two_id: { $in: [package_one_id, package_two_id] }
                }
            ]
        });
        if (exists) {
            throw new BadRequestError(req.t('errors.merge_package_exists'));
        }

        const res_payload = await MergedPackageActions.create({
            student_id,
            package_one_id,
            package_two_id,
            status: EnumMergedPackageStatus.ACTIVE
        } as MergedPackage);

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async deleteMergedPackage(
        req: ProtectedRequest,
        res: Response
    ) {
        const { _id } = req.body;
        const res_payload = await MergedPackageActions.remove(_id);
        if (!res_payload) {
            throw new NotFoundError();
        }
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}

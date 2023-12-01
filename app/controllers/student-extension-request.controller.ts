import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import OrderedPackageController from './ordered-package.controller';
import CounterActions from '../actions/counter';
import OrderedPackageActions from '../actions/ordered-package';
import UserActions from '../actions/user';
import StudentExtensionRequestActions from '../actions/student-extension-request';
import { EnumOrderStatus } from '../models/order';
import OrderedPackage from '../models/ordered-package';
import StudentExtensionRequest, {
    EnumStudentExtensionRequestStatus
} from '../models/student-extension-request';
import { DAY_TO_MS } from '../const/date-time';
import { EnumPackageOrderType } from '../const/package';
import { RoleCode } from '../const/role';
import WalletActions from '../actions/wallet';
import { POINT_VND_RATE } from '../models/wallet';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import { PERMISSIONS } from '../const/permission';
const pickUpData = [
    '_id',
    'id',
    'student_id',
    'number_of_days',
    'ordered_package_id',
    'status',
    'price',
    'coin',
    'student_note',
    'admin_note'
];
export default class StudentExtensionRequestController {
    /**
     * @description GET request from admin to search for extension requests
     * @queryParam student_id <number> - ID of the student
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam min_days <number> - min number of days in the requests
     * @queryParam max_days <number> - max number of days in the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAllStudentExtensionRequestsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            student_id,
            status,
            min_days,
            max_days
        } = req.query;
        const filter: any = {
            student_id,
            min_days: min_days ? parseInt(min_days as string) : null,
            max_days: max_days ? parseInt(max_days as string) : null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        const extension_requests =
            await StudentExtensionRequestActions.findAllAndPaginated(filter);
        const count = await StudentExtensionRequestActions.count(filter);
        const res_payload = {
            data: extension_requests,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description GET request from students to search for their extension requests
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam min_days <number> - min number_of_days of the requests
     * @queryParam max_days <number> - max number_of_days of the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getExtensionRequestsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, min_days, max_days } =
            req.query;
        const filter: any = {
            student_id: req.user.id,
            min_days: min_days ? parseInt(min_days as string) : null,
            max_days: max_days ? parseInt(max_days as string) : null,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        const extension_requests =
            await StudentExtensionRequestActions.findAllAndPaginated(filter);
        const count = await StudentExtensionRequestActions.count(filter);
        const res_payload = {
            data: extension_requests,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description Get price and max period of a student extension request
     *              The method below is just a temporary because the data are
     *              still fixed data.
     *              @TODO Change the design for these data later so that
     *              admin can change them to suit their needs
     * @param pack Information on the package that student want extension
     * @returns price <number> - Fees that student needs to pay for the
     *          extension
     * @returns number_of_days <number> - max period students can request, in
     *          milliseconds
     */
    private static async getExtensionPriceAndMaxPeriod(pack: OrderedPackage) {
        const result = {
            price: 0,
            number_of_days: 0
        };
        if (!pack.number_class) return result;
        if (!pack.activation_date) return result;
        if (pack.order.status != EnumOrderStatus.PAID) return result;
        if (pack.original_number_class <= 30) {
            result.number_of_days = 30;
            result.price = 300000;
        } else if (pack.original_number_class <= 60) {
            result.number_of_days = 60;
            result.price = 400000;
        } else {
            result.number_of_days = 90;
            result.price = 500000;
        }
        return result;
    }

    public static async getExtensionCostPreview(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id } = req.query;

        let student_id = 0;
        if (req.user && req.user.isAdmin) {
            student_id = parseInt(req.query.student_id as string);
        } else if (req.user) {
            student_id = req.user.id;
        }
        const res_payload = {
            price: 0,
            number_of_days: 0
        };

        const pack = await OrderedPackageActions.findOne({
            id: parseInt(ordered_package_id as string),
            user_id: student_id,
            type: [EnumPackageOrderType.STANDARD, EnumPackageOrderType.PREMIUM]
        });
        if (pack) {
            const order_related_info =
                await StudentExtensionRequestController.getExtensionPriceAndMaxPeriod(
                    pack
                );
            res_payload.price = order_related_info.price;
            res_payload.number_of_days = order_related_info.number_of_days;
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description POST request to request to extend an ordered package
     * @bodyParam student_note <string> - Student's note/description on
     *            this request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async createExtensionRequest(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            ordered_package_id,
            student_note,
            days,
            price,
            coin,
            proof_files
        } = req.body;
        let student_id = 0;
        if (req.user && req.user.isAdmin) {
            student_id = parseInt(req.body.student_id as string);
        } else if (req.user) {
            student_id = req.user.id;
        }
        let flagCheckCreatePackagePro = false;
        const permissions = req.user.permissions;
        if (
            permissions &&
            permissions.length > 0 &&
            permissions.includes(PERMISSIONS.tmer_create_pro)
        ) {
            flagCheckCreatePackagePro = true;
        }
        if (!flagCheckCreatePackagePro) {
            const check_extension =
                await StudentExtensionRequestActions.findOne({
                    student_id,
                    ordered_package_id,
                    $or: [
                        {
                            status: EnumStudentExtensionRequestStatus.PENDING
                        },
                        {
                            status: EnumStudentExtensionRequestStatus.APPROVED
                        }
                    ]
                });
            if (check_extension) {
                throw new BadRequestError(
                    req.t(
                        'errors.student_extension_request.request_order_package_exist'
                    )
                );
            }
        }
        const student = await UserActions.findOne({
            id: student_id,
            role: [RoleCode.STUDENT]
        });
        if (!student) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }

        const pack = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            user_id: student_id,
            type: [EnumPackageOrderType.STANDARD, EnumPackageOrderType.PREMIUM]
        });
        if (!pack || !pack.activation_date) {
            throw new BadRequestError(
                req.t('errors.ordered_package.not_found')
            );
        }
        const package_related_info =
            await StudentExtensionRequestController.getExtensionPriceAndMaxPeriod(
                pack
            );
        const number_of_days = days
            ? _.toInteger(days)
            : package_related_info.number_of_days;
        const _price = Number(price) === 0 ? 0 : package_related_info.price;

        // tạm thời commentout check ngày hết hạn mới, vì tgian hết hạn mới được tính ở thời điểm approve + số ngày thêm hạn
        // const new_expired_moment =
        //     pack.activation_date +
        //     pack.day_of_use * DAY_TO_MS +
        //     number_of_days * DAY_TO_MS;
        // const current_moment = new Date().getTime();
        // if (new_expired_moment < current_moment) {
        //     throw new BadRequestError(
        //         req.t('errors.student_extension_request.invalid_time')
        //     );
        // }
        if (req.user) {
            const descriptionTransaction =
                'Extend the "' + pack.package_name + '" learning package';
            const data = await WalletActions.decreaseBalance(
                {
                    id: student_id
                },
                Number(_price),
                Number(_price / POINT_VND_RATE),
                descriptionTransaction
            );
            if (!data.result) {
                throw new BadRequestError(req.t(data.message));
            }
        }

        const counter = await CounterActions.findOne();
        const id = counter.student_extension_request_id;
        const request = {
            id,
            student_id,
            status: EnumStudentExtensionRequestStatus.PENDING,
            price: _price,
            coin: _price / POINT_VND_RATE,
            number_of_days,
            ordered_package_id,
            student,
            ordered_package: pack,
            student_note,
            proof_files
        };
        await StudentExtensionRequestActions.create(
            request as StudentExtensionRequest
        );

        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    /**
     * @description: PUT request from admin to approve or reject an
     *               extension request
     * @urlParam request_id <number> - ID of the request
     * @bodyParam status <number> - new status of the request
     * @bodyParam price <number> - new price for the pending request
     * @bodyParam number_of_days <number> - new number_of_days for the
     *                                      pending request
     * @bodyParam admin_note <string> - Admin's note on the request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async editExtensionRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { status, price, number_of_days, admin_note } = req.body;
        const request_id = parseInt(req.params.request_id);
        const request = await StudentExtensionRequestActions.findOne({
            id: request_id
        });
        if (!request)
            throw new BadRequestError(
                req.t('errors.student_extension_request.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'StudentExtensionRequestModel',
            request,
            pickUpData
        );

        const diff = {
            status: status ? status : request.status,
            number_of_days: number_of_days
                ? number_of_days
                : request.number_of_days,
            admin_note: admin_note ? admin_note : request.admin_note
        };
        if (status != request.status) {
            if (EnumStudentExtensionRequestStatus.APPROVED == status) {
                /**
                 * Increase ordered_package's day_of_use
                 */
                await OrderedPackageController.extendAnOrderedPackage(
                    request.ordered_package,
                    diff.number_of_days,
                    true
                );
            } else if (
                EnumStudentExtensionRequestStatus.REJECTED == status &&
                request.coin
            ) {
                const descriptionTransaction =
                    'The administrator has refused to renew the "' +
                    request.ordered_package.package_name +
                    '" learning package';
                const data = await WalletActions.increaseBalance(
                    {
                        id: request.student_id
                    },
                    Number(request.price),
                    Number(request.coin),
                    descriptionTransaction
                );
            }
        }
        const new_data = await StudentExtensionRequestActions.update(
            request._id,
            diff as StudentExtensionRequest
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'StudentExtensionRequestModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from students to delete their own extension
     *               request if the request is still in pending
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteExtensionRequestByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const student_id = req.user.id;
        const request_id = parseInt(req.params.request_id);
        const filter: any = {
            id: request_id,
            student_id
        };
        const request = await StudentExtensionRequestActions.findOne(filter);
        if (request) {
            if (EnumStudentExtensionRequestStatus.PENDING != request.status) {
                throw new BadRequestError(
                    req.t(
                        'errors.student_extension_request.delete_invalid_status'
                    )
                );
            }
            await StudentExtensionRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from admin to delete an extension request
     * @urlParam request_id <number> - ID of the request
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteExtensionRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { request_id } = req.params;
        const request = await StudentExtensionRequestActions.findOne({
            id: parseInt(request_id as string)
        });
        if (request) {
            await StudentExtensionRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}

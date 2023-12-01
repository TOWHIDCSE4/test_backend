import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingController from './booking.controller';
import CounterActions from '../actions/counter';
import OrderedPackageActions from '../actions/ordered-package';
import UserActions from '../actions/user';
import StudentReservationRequestActions from '../actions/student-reservation-request';
import { EnumOrderStatus } from '../models/order';
import OrderedPackage from '../models/ordered-package';
import StudentReservationRequest, {
    EnumStudentReservationRequestStatus
} from '../models/student-reservation-request';
import { DAY_TO_MS, MINUTE_TO_MS } from '../const/date-time';
import { EnumPackageOrderType } from '../const/package';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'student_id',
    'start_time',
    'end_time',
    'ordered_package_id',
    'status',
    'price',
    'student_note',
    'admin_note'
];
export default class StudentReservationRequestController {
    /**
     * @description GET request from admin to search for absent requests
     * @queryParam student_id <number> - ID of the student
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam start_time <number> - min start_time of the requests
     * @queryParam end_time <number> - max end_time of the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAllStudentReservationRequestsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            student_id,
            status,
            start_time,
            end_time
        } = req.query;
        const filter: any = {
            student_id,
            start_time: start_time
                ? { $gte: parseInt(start_time as string) }
                : null,
            end_time: end_time ? { $lte: parseInt(end_time as string) } : null,
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
        const absent_requests =
            await StudentReservationRequestActions.findAllAndPaginated(filter);
        const count = await StudentReservationRequestActions.count(filter);
        const res_payload = {
            data: absent_requests,
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
     * @description GET request from cron-jobs for a list of absent requests
     * @queryParam start_time <number> - min start_time of the requests
     * @queryParam end_time <number> - max end_time of the requests
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getAllStudentReservationRequestsByCronJobs(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, end_time } = req.query;
        const res_payload = {
            data: new Array<any>()
        };
        if (start_time && end_time && start_time < end_time) {
            const filter: any = {
                status: [
                    EnumStudentReservationRequestStatus.APPROVED,
                    EnumStudentReservationRequestStatus.PAID
                ],
                start_time: { $lte: parseInt(end_time as string) },
                end_time: { $gte: parseInt(start_time as string) }
            };
            res_payload.data = await StudentReservationRequestActions.findAll(
                filter,
                {
                    id: 1,
                    student_id: 1,
                    ordered_package_id: 1
                },
                {
                    student_id: 1,
                    ordered_package_id: 1
                }
            );
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description GET request from students to search for their absent requests
     * @queryParam status <number|number[]> - status of the requests
     * @queryParam start_time <number> - min start_time of the requests
     * @queryParam end_time <number> - max end_time of the requests
     * @queryParam page_size - Number of requests returned (used for pagination)
     * @queryParam page_number - Number of the page in the search result
     * @return SuccessResponse with data as an array of requests or BadRequestError
     */
    public static async getReservationRequestsByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, status, start_time, end_time } =
            req.query;
        const filter: any = {
            student_id: req.user.id,
            start_time: start_time
                ? { $gte: parseInt(start_time as string) }
                : null,
            end_time: end_time ? { $lte: parseInt(end_time as string) } : null,
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
        const absent_requests =
            await StudentReservationRequestActions.findAllAndPaginated(filter);
        const count = await StudentReservationRequestActions.count(filter);
        const res_payload = {
            data: absent_requests,
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
     * @description Get price and max period of a student reservation request
     *              The method below is just a temporary because the data are
     *              still fixed data.
     *              @TODO Change the design for these datas later so that
     *              admin can change them to suit their needs
     * @param pack Information on the packge that student want reservation
     * @returns price <number> - Fees that student needs to pay for the
     *          reservation
     * @returns max_time <number> - max period students can request, in
     *          milliseconds
     */
    private static async getReservationPriceAndMaxPeriod(pack: OrderedPackage) {
        const result = {
            price: 0,
            max_time: 0
        };
        const current_moment = new Date().getTime();
        if (!pack.number_class) return result;
        if (!pack.activation_date) return result;
        if (pack.order.status != EnumOrderStatus.PAID) return result;
        if (
            pack.activation_date + pack.day_of_use * DAY_TO_MS <
            current_moment
        ) {
            return result;
        }
        result.max_time = pack.original_number_class * DAY_TO_MS;
        if (pack.original_number_class > 90) {
            result.max_time = 90 * DAY_TO_MS;
        }
        if (pack.original_number_class == pack.number_class) {
            /** Student hasn't learnt any class in this pack yet */
            result.price = 0;
        } else if (pack.original_number_class <= 30) {
            result.price = 300000;
        } else if (pack.original_number_class <= 60) {
            result.price = 400000;
        } else {
            result.price = 500000;
        }
        return result;
    }

    public static async getReservationCostPreview(
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
            max_time: 0
        };

        const pack = await OrderedPackageActions.findOne({
            id: parseInt(ordered_package_id as string),
            user_id: student_id,
            type: [EnumPackageOrderType.STANDARD, EnumPackageOrderType.PREMIUM]
        });
        if (pack) {
            const order_related_info =
                await StudentReservationRequestController.getReservationPriceAndMaxPeriod(
                    pack
                );
            res_payload.price = order_related_info.price;
            res_payload.max_time = order_related_info.max_time;
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description POST request to request absent times in a period.
     * @bodyParam start_time <number> - Start of the period
     * @bodyParam end_time <number> - End of the period
     * @bodyParam student_note <string> - Student's note/description on
     *            this request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async createReservationRequest(
        req: ProtectedRequest,
        res: Response
    ) {
        const { start_time, end_time, ordered_package_id, student_note } =
            req.body;
        let student_id = 0;
        if (req.user && req.user.isAdmin) {
            student_id = parseInt(req.body.student_id as string);
        } else if (req.user) {
            student_id = req.user.id;
        }
        const check_reservation =
            await StudentReservationRequestActions.findOne({
                student_id,
                ordered_package_id,
                status: [
                    EnumStudentReservationRequestStatus.APPROVED,
                    EnumStudentReservationRequestStatus.PAID
                ]
            });
        if (check_reservation) {
            throw new BadRequestError(
                req.t(
                    'errors.student_reservation_request.reach_limit_each_order'
                )
            );
        }
        const student = await UserActions.findOne({
            id: student_id
            // role: [ RoleCode.STUDENT ]
        });
        if (!student) {
            throw new BadRequestError(req.t('errors.student.not_found'));
        }
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.invalid_time')
            );
        }
        const current_moment = new Date().getTime();
        if (end_time < current_moment) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.invalid_time')
            );
        }

        const pack = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            user_id: student_id,
            type: [EnumPackageOrderType.STANDARD, EnumPackageOrderType.PREMIUM]
        });
        if (!pack) {
            throw new BadRequestError(
                req.t('errors.ordered_package.not_found')
            );
        }

        const check_request_filter = {
            student_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time },
            ordered_package_id,
            status: [
                EnumStudentReservationRequestStatus.PENDING,
                EnumStudentReservationRequestStatus.APPROVED,
                EnumStudentReservationRequestStatus.PAID
            ]
        };
        const check_request = await StudentReservationRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.already_requested')
            );
        }

        const package_related_info =
            await StudentReservationRequestController.getReservationPriceAndMaxPeriod(
                pack
            );
        if (end_time - start_time > package_related_info.max_time) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.time_exceeds_limit')
            );
        }
        const price = package_related_info.price;

        await BookingController.checkBookingsInStudentReservationPeriod(
            req,
            student_id,
            ordered_package_id,
            start_time,
            end_time,
            false
        );

        const counter = await CounterActions.findOne();
        const id = counter.student_reservation_request_id;
        const request = {
            id,
            student_id,
            status: EnumStudentReservationRequestStatus.PENDING,
            price,
            start_time,
            end_time,
            ordered_package_id,
            student,
            ordered_package: pack,
            student_note
        };
        await StudentReservationRequestActions.create(
            request as StudentReservationRequest
        );

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description PUT request from students to edit the absent requests
     * @bodyParam start_time <number> - Start of the period
     * @bodyParam end_time <number> - End of the period
     * @bodyParam student_note <string> - Student's note/description on
     *            this request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async editReservationRequestByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const student_id = req.user.id;
        const request_id = parseInt(req.params.request_id);
        let { start_time, end_time, ordered_package_id, student_note } =
            req.body;
        if (!(start_time || end_time || student_note || ordered_package_id)) {
            return new SuccessResponse(req.t('common.success'), {
                ok: true
            }).send(res, req);
        }
        const filter: any = {
            id: request_id,
            student_id,
            status: [EnumStudentReservationRequestStatus.PENDING]
        };
        const request = await StudentReservationRequestActions.findOne(filter);
        if (!request)
            throw new BadRequestError(
                req.t('errors.student_reservation_request.no_pending')
            );
        if (!start_time) start_time = request.start_time;
        if (!end_time) end_time = request.end_time;
        if (start_time + 30 * MINUTE_TO_MS > end_time) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.invalid_time')
            );
        }
        if (!student_note) student_note = request.student_note;
        let ordered_package;
        if (!ordered_package_id) {
            ordered_package_id = request.ordered_package_id;
            ordered_package = request.ordered_package;
        } else {
            ordered_package = await OrderedPackageActions.findOne({
                id: ordered_package_id,
                user_id: student_id
            });
            if (!ordered_package) {
                throw new BadRequestError(
                    req.t('errors.ordered_package.not_found')
                );
            }
        }

        const check_request_filter = {
            id: { $ne: request_id },
            student_id,
            start_time: { $lt: end_time },
            end_time: { $gt: start_time },
            ordered_package_id,
            status: [
                EnumStudentReservationRequestStatus.PENDING,
                EnumStudentReservationRequestStatus.APPROVED,
                EnumStudentReservationRequestStatus.PAID
            ]
        };
        const check_request = await StudentReservationRequestActions.findOne(
            check_request_filter
        );
        if (check_request) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.already_requested')
            );
        }

        const package_related_info =
            await StudentReservationRequestController.getReservationPriceAndMaxPeriod(
                ordered_package
            );
        if (end_time - start_time > package_related_info.max_time) {
            throw new BadRequestError(
                req.t('errors.student_reservation_request.time_exceeds_limit')
            );
        }
        const price = package_related_info.price;

        await BookingController.checkBookingsInStudentReservationPeriod(
            req,
            student_id,
            ordered_package_id,
            start_time,
            end_time,
            false
        );

        const diff = {
            start_time,
            end_time,
            ordered_package_id,
            price,
            ordered_package,
            student_note
        };
        await StudentReservationRequestActions.update(request._id, {
            ...diff
        } as StudentReservationRequest);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: PUT request from admin to approve or reject an absent request
     * @urlParam request_id <number> - ID of the request
     * @bodyParam status <number> - new status of the request
     * @bodyParam admin_note <string> - Admin's note on the request
     * @return SuccessResponse with ok message or BadRequestError
     */
    public static async editReservationRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { status, price, admin_note } = req.body;
        let { start_time, end_time } = req.body;
        const request_id = parseInt(req.params.request_id);
        const request = await StudentReservationRequestActions.findOne({
            id: request_id
        });
        if (!request)
            throw new BadRequestError(
                req.t('errors.student_reservation_request.not_found')
            );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'StudentReservationRequestModel',
            request,
            pickUpData
        );

        if (
            EnumStudentReservationRequestStatus.PENDING != status &&
            (start_time || end_time)
        ) {
            throw new BadRequestError(
                req.t(
                    'errors.student_reservation_request.change_period_in_unavailable_status'
                )
            );
        }

        if (status) {
            switch (status) {
                case EnumStudentReservationRequestStatus.REJECT_BY_ADMIN:
                /** fallthrough */
                case EnumStudentReservationRequestStatus.APPROVED:
                    if (
                        EnumStudentReservationRequestStatus.PENDING !=
                            request.status &&
                        status != request.status
                    ) {
                        throw new BadRequestError(
                            req.t(
                                'errors.student_reservation_request.update_invalid_status'
                            )
                        );
                    }
                    break;
                case EnumStudentReservationRequestStatus.PAID:
                /** fallthrough */
                case EnumStudentReservationRequestStatus.CANCEL:
                    if (
                        EnumStudentReservationRequestStatus.APPROVED !=
                            request.status &&
                        status != request.status
                    ) {
                        throw new BadRequestError(
                            req.t(
                                'errors.student_reservation_request.update_invalid_status'
                            )
                        );
                    }
                    break;
                default:
                    throw new BadRequestError(
                        req.t(
                            'errors.student_reservation_request.update_invalid_status'
                        )
                    );
                    break;
            }
        }

        if (!start_time) start_time = request.start_time;
        if (!end_time) end_time = request.end_time;
        if (req.body.start_time || req.body.end_time) {
            if (start_time + 30 * MINUTE_TO_MS > end_time) {
                throw new BadRequestError(
                    req.t('errors.student_reservation_request.invalid_time')
                );
            }
            const check_request_filter = {
                id: { $ne: request_id },
                student_id: request.student_id,
                start_time: { $lt: end_time },
                end_time: { $gt: start_time },
                ordered_package_id: request.ordered_package_id,
                status: [
                    EnumStudentReservationRequestStatus.PENDING,
                    EnumStudentReservationRequestStatus.APPROVED,
                    EnumStudentReservationRequestStatus.PAID
                ]
            };
            const check_request =
                await StudentReservationRequestActions.findOne(
                    check_request_filter
                );
            if (check_request) {
                throw new BadRequestError(
                    req.t(
                        'errors.student_reservation_request.already_requested'
                    )
                );
            }
        }

        const diff = {
            status: status ? status : request.status,
            price: price ? price : request.price,
            start_time,
            end_time,
            admin_note: admin_note ? admin_note : request.admin_note
        };
        if (
            EnumStudentReservationRequestStatus.APPROVED == status &&
            status != request.status
        ) {
            /**
             * Cancel the bookings in the period just in case new
             * bookings are created
             */
            await BookingController.checkBookingsInStudentReservationPeriod(
                req,
                request.student_id,
                request.ordered_package_id,
                diff.start_time,
                diff.end_time,
                true
            );
        }
        const new_data = await StudentReservationRequestActions.update(
            request._id,
            diff as StudentReservationRequest
        );
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'StudentReservationRequestModel',
            new_data,
            pickUpData
        );

        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from students to delete their own absent
     *               request if the request is still in pending
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteReservationRequestByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const student_id = req.user.id;
        const request_id = parseInt(req.params.request_id);
        const filter: any = {
            id: request_id,
            student_id
        };
        const request = await StudentReservationRequestActions.findOne(filter);
        if (request) {
            if (EnumStudentReservationRequestStatus.PENDING != request.status) {
                throw new BadRequestError(
                    req.t(
                        'errors.student_reservation_request.delete_invalid_status'
                    )
                );
            }
            await StudentReservationRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    /**
     * @description: DEL request from admin to delete a absent request
     * @urlParam request_id <number> - ID of the request
     * @return: SuccessResponse with ok message or BadRequestError
     */
    public static async deleteReservationRequestByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { request_id } = req.params;
        const request = await StudentReservationRequestActions.findOne({
            id: parseInt(request_id as string)
        });
        if (request) {
            await StudentReservationRequestActions.remove(request._id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}

import { EnumPackageOrderType } from './../../const/package';
import { PublicRequest, ProtectedRequest } from 'app-request';
import CustomerSupportManagementAction from '../../actions/customer-support/customer-support-student';
import DepartmentActions from '../../actions/department';
import TeacherActions from '../../actions/teacher';
import TeacherAbsentRequestActions from '../../actions/teacher-absent-request';
import TeacherRegularRequestActions from '../../actions/teacher-regular-request';
import TrialTeacherActions from '../../actions/trial-teacher';
import UserActions from '../../actions/user';
import OrderActions from '../../actions/order';
import TrialBookingActions from '../../actions/trial-booking';
import OrderedPackageActions from '../../actions/ordered-package';
import { CODE_DEPARTMENT } from '../../const/department';
import { RoleCode } from '../../const/role';
import { EnumReviewStatus } from '../../models/teacher';
import { EnumTeacherAbsentRequestStatus } from '../../models/teacher-absent-request';
import {
    RedirectResponse,
    SuccessResponse,
    NotFoundResponse
} from '../../core/ApiResponse';
import { EnumOrderStatus } from '../../models/order';
import { DAY_TO_MS } from '../../const';
export default class CustomerSupportController {
    public static async getDataDashboardActiveForm(
        req: ProtectedRequest,
        res: any
    ) {
        const res_payload = {
            data: new Array<any>()
        };
        const department = await DepartmentActions.findOne({
            filter: { $or: [{ unsignedName: CODE_DEPARTMENT.CSKH }] }
        });
        if (!department) {
            return new NotFoundResponse('Department not found');
        }
        const res_agg =
            await CustomerSupportManagementAction.getDataDashboardActiveForm(
                department._id
            );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getDataDashboardCS(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>()
        };
        const department = await DepartmentActions.findOne({
            filter: { $or: [{ unsignedName: CODE_DEPARTMENT.CSKH }] }
        });
        if (!department) {
            return new NotFoundResponse('Department not found');
        }
        const res_agg =
            await CustomerSupportManagementAction.getDataDashboardCS(
                department._id
            );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getDataDashboardCS2(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>()
        };
        const department = await DepartmentActions.findOne({
            filter: { $or: [{ unsignedName: CODE_DEPARTMENT.CSKH }] }
        });
        if (!department) {
            return new NotFoundResponse('Department not found');
        }
        const res_agg =
            await CustomerSupportManagementAction.getDataDashboardCS2(
                department._id
            );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getDataDashBoardStatistics(
        req: ProtectedRequest,
        res: any
    ) {
        const res_payload = {
            all_teacher_count: 0,
            inactive_teacher_count: 0,
            trial_teacher_count: 0,
            referral_teacher_count: 0,
            pending_teacher_count: 0,
            pending_regular_request_count: 0,
            pending_absent_request_count: 0,
            regular_student_count: 0,
            trial_student_count: 0,
            active_student_count: 0,
            inactive_student_count: 0,
            pending_marketing_inbox_count: 0,
            pending_order_count: 0
        };
        res_payload.all_teacher_count = await TeacherActions.count({
            'user.is_active': true
        });
        res_payload.inactive_teacher_count = await TeacherActions.count({
            'user.is_active': false
        });
        const trial_student = await TrialBookingActions.getTrialStudents({});
        if (
            trial_student &&
            Array.isArray(trial_student) &&
            trial_student.length > 0
        ) {
            res_payload.trial_student_count = trial_student[0].pagination.total;
        }
        res_payload.referral_teacher_count = await TeacherActions.count({
            referred: true
        });
        res_payload.pending_teacher_count = await TeacherActions.count({
            is_reviewed: EnumReviewStatus.PENDING
        });
        res_payload.pending_regular_request_count =
            await TeacherRegularRequestActions.count({
                status: 2 /** PENDING */
            });
        res_payload.pending_absent_request_count =
            await TeacherAbsentRequestActions.count({
                status: [EnumTeacherAbsentRequestStatus.PENDING]
            });
        res_payload.active_student_count = await UserActions.count({
            role: [RoleCode.STUDENT],
            is_active: true
        });
        res_payload.inactive_student_count = await UserActions.count({
            role: [RoleCode.STUDENT],
            is_active: false
        });
        res_payload.pending_order_count = await OrderActions.count({
            status: EnumOrderStatus.PENDING
        });

        let order_filter: any = {
            type: [EnumPackageOrderType.STANDARD],
            activation_date: { $ne: null } as any,
            $expr: {
                $gte: [
                    {
                        $sum: [
                            '$activation_date',
                            { $multiply: ['$day_of_use', DAY_TO_MS] }
                        ]
                    },
                    new Date().getTime()
                ]
            }
        };
        let excluding_filter = {
            type: [EnumPackageOrderType.PREMIUM]
        };
        let res_agg = await OrderedPackageActions.getStudentsFromOrderType(
            {},
            order_filter,
            excluding_filter
        );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.regular_student_count += res_agg[0].pagination.total;
        }

        order_filter = {
            type: [EnumPackageOrderType.PREMIUM],
            activation_date: { $lte: new Date().getTime() } as any,
            $and: [
                { $expr: { $lt: ['$number_class', '$original_number_class'] } },
                {
                    $expr: {
                        $gte: [
                            {
                                $sum: [
                                    '$activation_date',
                                    { $multiply: ['$day_of_use', DAY_TO_MS] }
                                ]
                            },
                            new Date().getTime()
                        ]
                    }
                }
            ]
        };
        excluding_filter = {
            type: [EnumPackageOrderType.STANDARD]
        };
        res_agg = await OrderedPackageActions.getStudentsFromOrderType(
            {},
            order_filter,
            excluding_filter
        );
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.regular_student_count += res_agg[0].pagination.total;
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}

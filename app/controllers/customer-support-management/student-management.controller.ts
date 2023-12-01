import { PublicRequest, ProtectedRequest } from 'app-request';
import CustomerSupportManagementAction from '../../actions/customer-support/customer-support-student';
import StudentActions from '../../actions/student';
import AdminActions from '../../actions/admin';
import Student from '../../models/student';

import { RedirectResponse, SuccessResponse } from '../../core/ApiResponse';
import { concat } from 'lodash';
import TeamActions from '../../actions/team';
import { EnumRole } from '../../models/department';

async function queryExport(
    page_size: any,
    page_number: any,
    search: any,
    status: any,
    staff_id: any,
    checking_call: any,
    greeting_call: any,
    scheduled: any,
    type: any,
    customer_type: any,
    auto_scheduled: any,
    orderedPackageType: any
) {
    const res_payload = {
        data: new Array<any>(),
        pagination: {
            total: 0
        }
    };
    const res_agg = await CustomerSupportManagementAction.exportExcel({
        page_size: page_size,
        page_number: page_number,
        search,
        status,
        staff_id,
        checking_call,
        greeting_call,
        scheduled,
        type,
        customer_type,
        auto_scheduled,
        orderedPackageType
    });
    if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
        res_payload.data = res_agg[0].data;
        res_payload.pagination.total = res_agg[0].pagination.total;
    }
    return res_payload;
}
export default class CustomerSupportController {
    public static async exportExcel(req: ProtectedRequest, res: any) {
        const {
            search,
            status,
            checking_call,
            greeting_call,
            scheduled,
            type,
            customer_type,
            auto_scheduled,
            orderedPackageType,
            type_export
        } = req.query;
        const page_size = 500;
        let page_number = 1;
        let staff_id: any = req.query.staff_id;
        if (staff_id) {
            if (staff_id == -1) {
                staff_id = {
                    staff_id: { $exists: false }
                };
            } else {
                staff_id = {
                    staff_id: Number(staff_id)
                };
            }
        } else {
            if (type_export === 'only_student') {
                if (
                    req.user.department.isRole === EnumRole.Manager ||
                    req.user.department.isRole === EnumRole.Deputy_manager
                ) {
                    staff_id = {};
                } else if (req.user.department.isRole === EnumRole.Leader) {
                    let arrStaff: any = [];
                    let team = await TeamActions.findOne({
                        filter: { leader: req.user._id }
                    } as any);
                    arrStaff.push(req.user.id);
                    if (team) {
                        team.members.forEach((element) => {
                            arrStaff.push(element.id);
                        });
                    }
                    staff_id = {
                        staff_id: { $in: arrStaff }
                    };
                } else {
                    staff_id = {
                        staff_id: Number(req.user.id)
                    };
                }
            } else {
                staff_id = {};
            }
        }
        const res_payload = await queryExport(
            page_size,
            page_number,
            search,
            status,
            staff_id,
            checking_call,
            greeting_call,
            scheduled,
            type,
            customer_type,
            auto_scheduled,
            orderedPackageType
        );
        const arrPromies = [];
        while (page_size * page_number < res_payload.pagination.total) {
            page_number++;
            arrPromies.push(
                new Promise(async (resolve, reject) => {
                    const temp = await queryExport(
                        page_size,
                        page_number,
                        search,
                        status,
                        staff_id,
                        checking_call,
                        greeting_call,
                        scheduled,
                        type,
                        customer_type,
                        auto_scheduled,
                        orderedPackageType
                    );
                    if (temp.data) {
                        res_payload.data = res_payload.data.concat(temp.data);
                    }
                    resolve(temp);
                })
            );
        }
        if (arrPromies.length) {
            Promise.all(arrPromies).then(() => {
                return new SuccessResponse(
                    req.t('common.success'),
                    res_payload
                ).send(res, req);
            });
        } else {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
    }
    public static async getStudents(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            name,
            page_size,
            page_number,
            search,
            status,
            checking_call,
            greeting_call,
            scheduled,
            type,
            customer_type,
            auto_scheduled,
            orderedPackageType,
            verified_email,
            notification_email
        } = req.query;
        let staff_id: any = req.query.staff_id;

        if (staff_id) {
            if (staff_id == -1) {
                staff_id = {
                    staff_id: { $exists: false }
                };
            } else {
                staff_id = {
                    staff_id: Number(staff_id)
                };
            }
        } else {
            if (
                req.user.department.isRole === EnumRole.Manager ||
                req.user.department.isRole === EnumRole.Deputy_manager
            ) {
                staff_id = {};
            } else if (req.user.department.isRole === EnumRole.Leader) {
                let arrStaff: any = [];
                let team = await TeamActions.findOne({
                    filter: { leader: req.user._id }
                } as any);
                arrStaff.push(req.user.id);
                if (team) {
                    team.members.forEach((element) => {
                        arrStaff.push(element.id);
                    });
                }
                staff_id = {
                    staff_id: { $in: arrStaff }
                };
            } else {
                staff_id = {
                    staff_id: Number(req.user.id)
                };
            }
        }
        const res_agg = await CustomerSupportManagementAction.getAllStudent({
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search,
            status,
            staff_id,
            checking_call,
            greeting_call,
            scheduled,
            type,
            customer_type,
            auto_scheduled,
            orderedPackageType,
            name,
            verified_email,
            notification_email
        });
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
    public static async updateData(req: ProtectedRequest, res: any) {
        const { user_id, ref, customer_care, supporter } = req.body;
        if (supporter?.staff_id) {
            const staffId = (await AdminActions.findOne({
                id: supporter.staff_id
            })) as any;
            let student = await StudentActions.findOne({
                user_id
            });
            if (!student) {
                student = await StudentActions.create({
                    user_id,
                    staff: staffId._id,
                    staff_id: supporter.staff_id
                } as Student);
            }
            await StudentActions.setStaffForStudent(
                user_id,
                staffId._id,
                supporter.staff_id
            );
        }
        let res_agg = await CustomerSupportManagementAction.update(user_id, {
            user_id,
            supporter: supporter || {},
            ref: ref || {},
            customer_care: customer_care || {}
        });
        if (!res_agg) {
            res_agg = await CustomerSupportManagementAction.create({
                user_id,
                supporter: supporter || {},
                ref: ref || {},
                customer_care: customer_care || {}
            });
        }
        return new SuccessResponse(req.t('common.success'), res_agg).send(
            res,
            req
        );
    }

    public static async updateStaffStudents(req: ProtectedRequest, res: any) {
        const { list_student, staff } = req.body;
        await Promise.all(
            list_student.map(async (e: any) => {
                const staffU = await AdminActions.findOne({
                    id: staff
                });
                if (staffU) {
                    let student = await StudentActions.findOne({
                        user_id: e
                    });

                    if (!student) {
                        student = await StudentActions.create({
                            user_id: Number(e),
                            staff: staffU._id,
                            staff_id: staffU.id
                        } as Student);
                    }
                    await StudentActions.setStaffForStudent(
                        e,
                        staffU._id,
                        staffU.id
                    );
                    let res_agg = await CustomerSupportManagementAction.update(
                        e,
                        {
                            'supporter.staff_id': staff
                        }
                    );
                    if (!res_agg) {
                        res_agg = await CustomerSupportManagementAction.create({
                            user_id: e,
                            supporter: {
                                staff_id: staffU.id,
                                greeting_call: 0,
                                checking_call: 0,
                                scheduled: 0
                            },
                            ref: {},
                            customer_care: {}
                        });
                    }
                }
            })
        );

        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async getAllRegularCalendar(req: ProtectedRequest, res: any) {
        const res_payload = {
            data: new Array<any>(),
            pagination: {
                total: 0
            }
        };
        const {
            page_size,
            page_number,
            teacher_id,
            student_id,
            staff_id,
            regular_start_time,
            status,
            fromDate,
            toDate,
            messageSchedule
        } = req.query;
        const res_agg =
            await CustomerSupportManagementAction.getAllRegularCalendar({
                page_size: parseInt(page_size as string),
                page_number: parseInt(page_number as string),
                teacher_id,
                student_id,
                staff_id,
                regular_start_time,
                status,
                fromDate,
                toDate,
                messageSchedule
            });

        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}

import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import TeacherActions from '../actions/teacher';
import moment from 'moment';
import { BookingModel, EnumBookingStatus } from '../models/booking';
import BookingActions from '../actions/booking';
import { EnumPackageOrderType } from '../const/package';
import OrderedPackageActions from '../actions/ordered-package';
import TeacherAbsentRequestActions from '../actions/teacher-absent-request';
import { EnumTeacherAbsentRequestStatus } from '../models/teacher-absent-request';
import TeacherSalaryActions from '../actions/teacher-salary';
import UserActions from '../actions/user';
import RegularCalendarActions from '../actions/regular-calendar';
import { EnumRegularCalendarStatus } from '../models/regular-calendar';
import { getStartOfTheWeek } from '../utils/datetime-utils';
import _ from 'lodash';
import { RoleCode } from '../const/role';

const logger = require('dy-logger');

export default class TeacherSalaryController {
    public static async caculateBaseSalary(listBooking: any, teacher: any) {
        let salary = 0;
        // tính số lớp hoàn thành & đã viết memo
        const A1 = listBooking.filter((e: any) => {
            return (
                e.status === EnumBookingStatus.COMPLETED && e.memo?.created_time
            );
        });
        const totalA1 = A1.length;
        // tính số lớp hoàn thành & chưa viết memo
        const A1_1 = listBooking.filter((e: any) => {
            return (
                e.status === EnumBookingStatus.COMPLETED &&
                (!e.memo || !e.memo?.created_time)
            );
        });

        // Lương cơ bản 1 giờ(2 slots)
        const hourly_rate = teacher.hourly_rate || 0;

        // Lương cơ bản 1 slot
        const salaryPerSlot = hourly_rate / 2;

        // Số lớp student absent hưởng 50% lương
        const A2 = listBooking.filter((e: any) => {
            return e.status === EnumBookingStatus.STUDENT_ABSENT;
        });
        const totalA2 = A2.length;

        // caculate salary
        const percent_salary_student_absent =
            teacher?.location?.percent_salary_student_absent || 0;
        const salaryA1 = totalA1 * salaryPerSlot;
        const salaryA2 =
            totalA2 * salaryPerSlot * (percent_salary_student_absent / 100);

        // tiền lương các lớp hoàn thành + 50% lương các lớp student absent
        salary = salaryA1 + salaryA2;
        return {
            A1,
            A1_1,
            salaryA1,
            A2,
            salaryA2,
            salary,
            hourly_rate,
            salaryPerSlot,
            percent_salary_student_absent
        };
    }
    public static async caculateBonus(
        listBooking: any,
        teacher: any,
        start_time: number,
        end_time: number
    ) {
        // Lương cơ bản 1 giờ(2 slots)
        const hourly_rate = teacher.hourly_rate || 0;
        // Lương cơ bản 1 slot
        const salaryPerSlot = hourly_rate / 2;
        let bonus = 0;
        // tính số lớp cuối tuần hoàn thành & đã viết memo (A1)
        let bonusA1 = 0;
        const A1 = listBooking.filter((e: any) => {
            const day = moment(e.calendar.start_time).day();
            return (
                e.status === EnumBookingStatus.COMPLETED &&
                e.memo?.created_time &&
                (day === 0 || day === 6)
            );
        });
        const totalA1 = A1.length;
        let weekend_bonus = teacher?.location?.weekend_bonus || 0;
        bonusA1 = totalA1 * weekend_bonus;
        // thưởng chuyển đổi những học viên trial khi mua gói học(A2)
        let bonusA2 = 0;
        let conversion_bonus = teacher?.location?.conversion_bonus || 0;
        let list_conversion: any = [];
        // lấy toàn bộ booking trial hoàn thành của giáo viên
        const listBookingTrialAllTime =
            await BookingActions.findAllTrialBookingByCaculateSalary(
                teacher.user_id
            );

        await Promise.all(
            listBookingTrialAllTime.map(async (iterator: any) => {
                const student_id = iterator.student_id;
                // tìm order đầu tiên của student có số buổi lớn hơn 30
                const firstOrder = await OrderedPackageActions.findOne(
                    {
                        user_id: Number(student_id),
                        gte_number_class: 30
                    },
                    {
                        _v: 0
                    },
                    {
                        created_time: 1
                    }
                );
                if (firstOrder) {
                    const created_time = moment(
                        firstOrder.created_time
                    ).valueOf();
                    // nếu thời gian tạo order nằm trong circle thì thưởng
                    if (
                        created_time >= start_time &&
                        created_time <= end_time
                    ) {
                        const user = await UserActions.findOne({
                            id: firstOrder.user_id
                        });
                        list_conversion.push({
                            student_id,
                            student_name: user?.full_name,
                            student_username: user?.username,
                            ordered_package_id: firstOrder.id,
                            package_name: firstOrder.package_name,
                            created_time: firstOrder.created_time
                        });
                    }
                }
            })
        );
        bonusA2 = conversion_bonus * list_conversion.length;

        // thưởng chuyên cần(A3)
        let bonusA3 = 0;
        let attendance_bonus = teacher?.location?.attendance_bonus || 0;
        let list_slot_attendance: any = [];
        const checkAbsentOrCancel = listBooking.find(
            (e: any) =>
                e.status === EnumBookingStatus.CANCEL_BY_TEACHER ||
                e.status === EnumBookingStatus.TEACHER_ABSENT
        );
        if (!checkAbsentOrCancel) {
            const listDone = listBooking.filter((e: any) => {
                return (
                    e.status === EnumBookingStatus.COMPLETED &&
                    e.memo?.created_time
                );
            });
            if (listDone.length >= 50) {
                let leaveRequest = await TeacherAbsentRequestActions.findOne({
                    $or: [
                        {
                            start_time: {
                                $gte: start_time,
                                $lt: end_time
                            }
                        },
                        {
                            end_time: {
                                $gte: start_time,
                                $lt: end_time
                            }
                        }
                    ],
                    status: EnumTeacherAbsentRequestStatus.APPROVED,
                    teacher_id: teacher.user_id
                });
                if (!leaveRequest) {
                    bonusA3 = attendance_bonus;
                }
            }
        }
        // thưởng giới thiệu (A4)
        let bonusA4 = 0;
        const referral_bonus = teacher.location.referral_bonus || 0;
        const list_referral: any = [];
        const listTeacherRef = await TeacherActions.findAll({
            'ref_by_teacher.id': teacher.user_id
        });

        await Promise.all(
            listTeacherRef.map(async (iterator: any) => {
                const teacher_id = iterator.user_id;
                const isDone100Booking =
                    await BookingActions.findAllAndPaginated(
                        {
                            status: [EnumBookingStatus.COMPLETED],
                            page_size: 1,
                            page_number: 100,
                            teacher_id
                        },
                        {
                            created_time: 1
                        }
                    );
                if (isDone100Booking.length) {
                    const bookingStartTime =
                        isDone100Booking[0]?.calendar?.start_time;
                    if (
                        bookingStartTime >= start_time &&
                        bookingStartTime < end_time
                    ) {
                        list_referral.push({
                            bookingId: isDone100Booking[0].id,
                            teacher_name: isDone100Booking[0].teacher.full_name
                        });
                    }
                }
            })
        );

        bonusA4 = list_referral.length * referral_bonus;

        // thưởng dạy thay (A5)
        let bonusA5 = 0;
        const percent_substitute_bonus =
            teacher.location.percent_substitute_bonus || 0;
        let list_slot_substitute_class: any = [];
        list_slot_substitute_class = listBooking.filter((e: any) => {
            return (
                e.status === EnumBookingStatus.COMPLETED &&
                e.memo?.created_time &&
                e.substitute_for_teacher_id
            );
        });
        bonusA5 =
            list_slot_substitute_class.length *
            salaryPerSlot *
            (percent_substitute_bonus / 100);
        bonus = bonusA1 + bonusA2 + bonusA3 + bonusA4 + bonusA5;

        return {
            bonusA1,
            A1,
            bonusA2,
            bonusA3,
            bonusA4,
            bonusA5,
            bonus,
            attendance_bonus,
            weekend_bonus,
            referral_bonus,
            percent_substitute_bonus,
            conversion_bonus,
            list_conversion,
            list_slot_attendance,
            list_referral,
            list_slot_substitute_class
        };
    }
    public static async first3BookingOfStudent(studentId: any) {
        return await BookingModel.aggregate([
            { $match: { student_id: studentId } },
            {
                $sort: {
                    'calendar.start_time': 1
                }
            },
            {
                $lookup: {
                    from: 'ordered-packages',
                    localField: 'ordered_package',
                    foreignField: '_id',
                    as: 'ordered-packages'
                }
            },
            {
                $match: {
                    'ordered-packages.type': {
                        $ne: EnumPackageOrderType.TRIAL
                    }
                }
            },
            {
                $limit: 3
            },
            {
                $project: { id: 1, _id: 1 }
            }
        ]);
    }
    public static async caculatePunish(
        listBooking: any,
        teacher: any,
        start_time: number,
        end_time: number
    ) {
        // Lương cơ bản 1 giờ(2 slots)
        const hourly_rate = teacher.hourly_rate || 0;
        // Lương cơ bản 1 slot
        const salaryPerSlot = hourly_rate / 2;
        // % phạt theo location
        const percent_absent_punish =
            teacher?.location?.percent_absent_punish || 0;
        const percent_absent_punish_trial =
            teacher?.location?.percent_absent_punish_trial || 0;
        const percent_absent_punish_first_3_slot =
            teacher?.location?.percent_absent_punish_first_3_slot || 0;
        const percent_absent_punish_1h =
            teacher?.location?.percent_absent_punish_1h || 0;
        const percent_absent_punish_2h =
            teacher?.location?.percent_absent_punish_2h || 0;
        const percent_absent_punish_3h =
            teacher?.location?.percent_absent_punish_3h || 0;
        const absent_punish_greater_3h =
            teacher?.location?.absent_punish_greater_3h || 0;
        const late_memo_punish = teacher?.location?.late_memo_punish || 0;
        const over_limit_punish = teacher?.location?.over_limit_punish || 0;

        let punish = 0;

        let listBookingWithLateMemo: any = [];
        const listBookingCompleted = listBooking.filter((e: any) => {
            return (
                e.status === EnumBookingStatus.COMPLETED &&
                e?.memo?.created_time
            );
        });
        await Promise.all(
            listBookingCompleted.map(async (iterator: any) => {
                if (
                    iterator.ordered_package?.type ===
                    EnumPackageOrderType.TRIAL
                ) {
                    const createTime = moment(iterator.memo.created_time);
                    const time = moment(iterator.calendar.start_time)
                        .startOf('day')
                        .add(1, 'days')
                        .set('hour', 8);
                    if (createTime.valueOf() > time.valueOf()) {
                        listBookingWithLateMemo.push(iterator);
                    }
                } else {
                    const createTime = moment(iterator.memo.created_time);
                    const time = moment(iterator.calendar.start_time)
                        .startOf('day')
                        .add(1, 'days')
                        .set('hour', 12);
                    if (createTime.valueOf() > time.valueOf()) {
                        listBookingWithLateMemo.push(iterator);
                    }
                }
            })
        );

        //total trial absent
        const listTrialAbsent: any = [];
        await Promise.all(
            listBooking.map(async (iterator: any) => {
                // đối với Booking trạng thái CHANGE TIME thì cần check thêm điều kiện là phải có leaved request trạng thái Approved
                if (
                    iterator.status === EnumBookingStatus.CHANGE_TIME &&
                    iterator.ordered_package?.type ===
                        EnumPackageOrderType.TRIAL
                ) {
                    // check booking có nằm trong leave request hay không
                    const check = await TeacherAbsentRequestActions.findOne({
                        teacher_id: teacher.user_id,
                        status: EnumTeacherAbsentRequestStatus.APPROVED,
                        start_time: { $lte: iterator.calendar.start_time },
                        end_time: { $gte: iterator.calendar.end_time }
                    });
                    if (check) {
                        listTrialAbsent.push(iterator);
                    }
                }

                if (
                    (iterator.status === EnumBookingStatus.TEACHER_ABSENT ||
                        iterator.status ===
                            EnumBookingStatus.CANCEL_BY_TEACHER) &&
                    iterator.ordered_package?.type ===
                        EnumPackageOrderType.TRIAL
                ) {
                    listTrialAbsent.push(iterator);
                }
            })
        );

        let listBookingAbsentIsFist3Slot: any = [];
        let listBookingAbsentWithLeaveRequest1h: any = [];
        let listBookingAbsentWithLeaveRequest2h: any = [];
        let listBookingAbsentWithLeaveRequest3h: any = [];
        let listBookingAbsentWithLeaveRequestGreater3h: any = [];
        let listBookingAbsentWithOutLeaveRequest: any = [];
        let listOverLimit: any = [];
        const listPremiumAbsent = listBooking.filter((e: any) => {
            return (
                (e.status === EnumBookingStatus.TEACHER_ABSENT ||
                    e.status === EnumBookingStatus.CANCEL_BY_TEACHER ||
                    e.status === EnumBookingStatus.CHANGE_TIME) &&
                (e.ordered_package?.type === EnumPackageOrderType.PREMIUM ||
                    e.ordered_package?.type === EnumPackageOrderType.STANDARD)
            );
        });

        const arrBookingIds: any = [];
        const arrRegularMatchedIds: any = [];
        const arrTeacherAbsentRequest: any = [];
        const objRegularTeacherAbsentIds: any = {};
        let maximumLesson = 0;

        await Promise.all(
            listPremiumAbsent.map(async (iterator: any) => {
                const listFirst3Booking =
                    await TeacherSalaryController.first3BookingOfStudent(
                        iterator.student_id
                    );
                // check giáo viên absent có phải 3 booking đầu tiên của học viên hay không
                const isFist3Premium = listFirst3Booking.find(
                    (element: any) => element.id === iterator.id
                );
                if (!isFist3Premium) {
                    // check booking có nằm trong leave request hay không
                    const check = await TeacherAbsentRequestActions.findOne({
                        teacher_id: teacher.user_id,
                        status: EnumTeacherAbsentRequestStatus.APPROVED,
                        start_time: { $lte: iterator.calendar.start_time },
                        end_time: { $gte: iterator.calendar.end_time }
                    });
                    if (check) {
                        arrTeacherAbsentRequest.push({
                            type: 'booking',
                            booking_id: iterator.id,
                            timestamp: iterator.calendar.start_time
                        });
                    }
                }
            })
        );

        let leaveRequest = await TeacherAbsentRequestActions.findAll({
            $or: [
                {
                    start_time: {
                        $gte: start_time,
                        $lt: end_time
                    }
                },
                {
                    end_time: {
                        $gte: start_time,
                        $lt: end_time
                    }
                }
            ],
            status: [EnumTeacherAbsentRequestStatus.APPROVED],
            teacher_id: teacher.user_id
        });
        if (leaveRequest.length) {
            for (const iterator of leaveRequest) {
                if (iterator.list_regular_absent) {
                    const listRegularInCircle =
                        iterator.list_regular_absent.filter(
                            (e: any) =>
                                e.timestamp >= start_time &&
                                e.timestamp < end_time
                        );
                    listRegularInCircle.sort((a: any, b: any) => {
                        return a.timestamp - b.timestamp;
                    });
                    for (const regular of listRegularInCircle) {
                        if (!regular.is_first_3_booking) {
                            arrTeacherAbsentRequest.push({
                                type: 'regular',
                                regular_id: regular.id,
                                timestamp: regular.timestamp
                            });

                            if (
                                !objRegularTeacherAbsentIds[
                                    `item_regular_${iterator.id}`
                                ]
                            ) {
                                objRegularTeacherAbsentIds[
                                    `item_regular_${iterator.id}`
                                ] = [];
                            }

                            objRegularTeacherAbsentIds[
                                `item_regular_${iterator.id}`
                            ].push(regular.id);
                        }
                    }
                }
            }

            arrTeacherAbsentRequest.sort((a: any, b: any) => {
                return a.timestamp - b.timestamp;
            });

            for (const item of arrTeacherAbsentRequest) {
                if (maximumLesson >= 2) {
                    break;
                }

                if (item.type == 'booking') {
                    arrBookingIds.push(item.booking_id);
                    maximumLesson += 1;
                } else if (item.type == 'regular') {
                    arrRegularMatchedIds.push(item.regular_id);
                    maximumLesson += 1;
                }
            }
        }

        await Promise.all(
            listPremiumAbsent.map(async (iterator: any) => {
                const listFirst3Booking =
                    await TeacherSalaryController.first3BookingOfStudent(
                        iterator.student_id
                    );
                // check giáo viên absent có phải 3 booking đầu tiên của học viên hay không
                const isFist3Premium = listFirst3Booking.find(
                    (element: any) => element.id === iterator.id
                );
                if (isFist3Premium) {
                    // đối với Booking trạng thái CHANGE TIME thì cần check thêm điều kiện là phải có leaved request trạng thái Approved
                    if (iterator.status === EnumBookingStatus.CHANGE_TIME) {
                        // check booking có nằm trong leave request hay không
                        const check = await TeacherAbsentRequestActions.findOne(
                            {
                                teacher_id: teacher.user_id,
                                status: EnumTeacherAbsentRequestStatus.APPROVED,
                                start_time: {
                                    $lte: iterator.calendar.start_time
                                },
                                end_time: { $gte: iterator.calendar.end_time }
                            }
                        );

                        if (check) {
                            listBookingAbsentIsFist3Slot.push(iterator);
                        }
                    } else {
                        listBookingAbsentIsFist3Slot.push(iterator);
                    }
                } else {
                    // check booking có nằm trong leave request hay không
                    const check = await TeacherAbsentRequestActions.findOne({
                        teacher_id: teacher.user_id,
                        status: EnumTeacherAbsentRequestStatus.APPROVED,
                        start_time: { $lte: iterator.calendar.start_time },
                        end_time: { $gte: iterator.calendar.end_time }
                    });
                    if (check) {
                        if (arrBookingIds.includes(iterator.id)) {
                            const createTime = moment(check.created_time);
                            const time = moment(iterator.calendar.start_time);
                            const duration = moment.duration(
                                time.diff(createTime)
                            );
                            const hours = duration.asHours();
                            if (hours < 1) {
                                listBookingAbsentWithLeaveRequest1h.push(
                                    iterator
                                );
                            } else if (hours < 2) {
                                listBookingAbsentWithLeaveRequest2h.push(
                                    iterator
                                );
                            } else if (hours < 3) {
                                listBookingAbsentWithLeaveRequest3h.push(
                                    iterator
                                );
                            } else {
                                listBookingAbsentWithLeaveRequestGreater3h.push(
                                    iterator
                                );
                            }
                        } else {
                            listOverLimit.push(iterator);
                        }
                    } else {
                        if (iterator.status !== EnumBookingStatus.CHANGE_TIME) {
                            listBookingAbsentWithOutLeaveRequest.push(iterator);
                        }
                    }
                }
            })
        );
        // phạt nghỉ vào lịch cố định đã ghép
        let listRegularAbsentWithOutLeaveRequest: any = [];
        let listRegularAbsentWithLeaveRequest1h: any = [];
        let listRegularAbsentWithLeaveRequest2h: any = [];
        let listRegularAbsentWithLeaveRequest3h: any = [];
        let listRegularAbsentWithLeaveRequestGreater3h: any = [];
        let listRegularOverLimit: any = [];
        // let leaveRequest = await TeacherAbsentRequestActions.findAll({
        //     $or: [
        //         {
        //             start_time: {
        //                 $gte: start_time,
        //                 $lt: end_time
        //             }
        //         },
        //         {
        //             end_time: {
        //                 $gte: start_time,
        //                 $lt: end_time
        //             }
        //         }
        //     ],
        //     status: [EnumTeacherAbsentRequestStatus.APPROVED],
        //     teacher_id: teacher.user_id
        // });
        if (leaveRequest.length) {
            for (const iterator of leaveRequest) {
                if (iterator.list_regular_absent) {
                    let listRegularInCircle =
                        iterator.list_regular_absent.filter(
                            (e: any) =>
                                e.timestamp >= start_time &&
                                e.timestamp < end_time
                        );
                    await Promise.all(
                        listRegularInCircle.map(async (regular: any) => {
                            if (regular.is_first_3_booking) {
                                listRegularAbsentWithOutLeaveRequest.push(
                                    regular
                                );
                            } else {
                                if (
                                    arrRegularMatchedIds.includes(regular.id) &&
                                    objRegularTeacherAbsentIds[
                                        `item_regular_${iterator.id}`
                                    ] &&
                                    objRegularTeacherAbsentIds[
                                        `item_regular_${iterator.id}`
                                    ].includes(regular.id)
                                ) {
                                    const createTime = moment(
                                        iterator.created_time
                                    );
                                    const time = moment(regular.timestamp);
                                    const duration = moment.duration(
                                        time.diff(createTime)
                                    );
                                    const hours = duration.asHours();
                                    if (hours < 1) {
                                        listRegularAbsentWithLeaveRequest1h.push(
                                            regular
                                        );
                                    } else if (hours < 2) {
                                        listRegularAbsentWithLeaveRequest2h.push(
                                            regular
                                        );
                                    } else if (hours < 3) {
                                        listRegularAbsentWithLeaveRequest3h.push(
                                            regular
                                        );
                                    } else {
                                        listRegularAbsentWithLeaveRequestGreater3h.push(
                                            regular
                                        );
                                    }
                                } else {
                                    listRegularOverLimit.push(regular);
                                }
                            }
                        })
                    );
                }
            }
        }
        // xóa đi 2 buổi hoặc lịch không bị phạt khi muộn mỗi circle
        // let temp = [
        //     ...listBookingAbsentWithLeaveRequestGreater3h.map((e: any) => ({
        //         ...e.toJSON(),
        //         typeCheck: 0
        //     })),
        //     ...listRegularAbsentWithLeaveRequestGreater3h.map((e: any) => ({
        //         ...e,
        //         typeCheck: 1
        //     }))
        // ];
        // if (temp.length) {
        //     temp.splice(0, 2);
        //     listBookingAbsentWithLeaveRequestGreater3h = temp.filter(
        //         (e) => e.typeCheck === 0
        //     );
        //     listRegularAbsentWithLeaveRequestGreater3h = temp.filter(
        //         (e) => e.typeCheck === 1
        //     );
        // }

        //  Phạt ngoại lệ / đặc biệt(A1)
        let punishA1 = 0;
        const punishTrialAbsent =
            listTrialAbsent.length *
            salaryPerSlot *
            (percent_absent_punish_trial / 100);
        const punishBookingAbsentIsFirst3Slot =
            listBookingAbsentIsFist3Slot.length *
            salaryPerSlot *
            (percent_absent_punish_first_3_slot / 100);
        const punishRegularAbsentIsFirst3Slot =
            listRegularAbsentWithOutLeaveRequest.length *
            salaryPerSlot *
            (percent_absent_punish_first_3_slot / 100);

        // Phạt absent(A2)
        let punishA2 = 0;
        let punishWithOutLeaveRequest =
            listBookingAbsentWithOutLeaveRequest.length *
            salaryPerSlot *
            (percent_absent_punish / 100);
        let punishWithLeaveRequest1h =
            listBookingAbsentWithLeaveRequest1h.length *
            salaryPerSlot *
            (percent_absent_punish_1h / 100);
        let punishWithLeaveRequest2h =
            listBookingAbsentWithLeaveRequest2h.length *
            salaryPerSlot *
            (percent_absent_punish_2h / 100);
        let punishWithLeaveRequest3h =
            listBookingAbsentWithLeaveRequest3h.length *
            salaryPerSlot *
            (percent_absent_punish_3h / 100);
        let punishWithLeaveRequestGreater3h =
            listBookingAbsentWithLeaveRequestGreater3h.length *
            absent_punish_greater_3h;
        let punishWithLateMemo =
            listBookingWithLateMemo.length * late_memo_punish;
        let punishWithOverLimit = listOverLimit.length * over_limit_punish;

        // Phạt absent lịch(A2)
        let punishA3 = 0;
        let punishRegularWithLeaveRequest1h =
            listRegularAbsentWithLeaveRequest1h.length *
            salaryPerSlot *
            (percent_absent_punish_1h / 100);
        let punishRegularWithLeaveRequest2h =
            listRegularAbsentWithLeaveRequest2h.length *
            salaryPerSlot *
            (percent_absent_punish_2h / 100);
        let punishRegularWithLeaveRequest3h =
            listRegularAbsentWithLeaveRequest3h.length *
            salaryPerSlot *
            (percent_absent_punish_3h / 100);
        let punishRegularWithLeaveRequestGreater3h =
            listRegularAbsentWithLeaveRequestGreater3h.length *
            absent_punish_greater_3h;
        let punishRegularWithOverLimit =
            listRegularOverLimit.length * over_limit_punish;

        // caculate
        punishA1 =
            punishTrialAbsent +
            punishBookingAbsentIsFirst3Slot +
            punishRegularAbsentIsFirst3Slot;

        punishA2 =
            punishWithOutLeaveRequest +
            punishWithLeaveRequest1h +
            punishWithLeaveRequest2h +
            punishWithLeaveRequest3h +
            punishWithLeaveRequestGreater3h +
            punishWithLateMemo +
            punishWithOverLimit;
        punishA3 =
            punishRegularWithLeaveRequest1h +
            punishRegularWithLeaveRequest2h +
            punishRegularWithLeaveRequest3h +
            punishRegularWithLeaveRequestGreater3h +
            punishRegularWithOverLimit;

        punish = punishA1 + punishA2 + punishA3;

        return {
            listTrialAbsent,
            listBookingAbsentIsFist3Slot,
            listBookingAbsentWithOutLeaveRequest,
            listBookingAbsentWithLeaveRequest1h,
            listBookingAbsentWithLeaveRequest2h,
            listBookingAbsentWithLeaveRequest3h,
            listBookingAbsentWithLeaveRequestGreater3h,
            listBookingWithLateMemo,
            listOverLimit,
            listRegularAbsentWithOutLeaveRequest,
            listRegularAbsentWithLeaveRequest1h,
            listRegularAbsentWithLeaveRequest2h,
            listRegularAbsentWithLeaveRequest3h,
            listRegularAbsentWithLeaveRequestGreater3h,
            listRegularOverLimit,
            punishTrialAbsent,
            punishBookingAbsentIsFirst3Slot,
            punishWithOutLeaveRequest,
            punishWithLeaveRequest1h,
            punishWithLeaveRequest2h,
            punishWithLeaveRequest3h,
            punishWithLeaveRequestGreater3h,
            punishWithLateMemo,
            punishWithOverLimit,
            punishRegularAbsentIsFirst3Slot,
            punishRegularWithLeaveRequest1h,
            punishRegularWithLeaveRequest2h,
            punishRegularWithLeaveRequest3h,
            punishRegularWithLeaveRequestGreater3h,
            punishRegularWithOverLimit,
            punish,
            percent_absent_punish,
            percent_absent_punish_trial,
            percent_absent_punish_first_3_slot,
            percent_absent_punish_1h,
            percent_absent_punish_2h,
            percent_absent_punish_3h,
            absent_punish_greater_3h,
            late_memo_punish,
            over_limit_punish
        };
    }
    public static buildDataSave(data: []) {
        const res = data.map((e: any) => {
            let memo_time = null;
            if (e?.memo?.created_time) {
                memo_time = e.memo.created_time;
            } else if (e?.memo?.note?.length) {
                memo_time = e.updated_time;
            }
            return {
                _id: e._id,
                id: e.id,
                full_name: e.student.full_name,
                start_time: e.calendar.start_time,
                end_time: e.calendar.end_time,
                course: e.course.name,
                status: e.status,
                type: e.ordered_package.type,
                memo_time
            };
        });
        return res;
    }
    public static buildDataCalendar(data: []) {
        const res = data.map((e: any) => {
            return {
                id: e.id,
                full_name: e.student_name,
                regular_start_time: e.regular_start_time,
                timestamp: e.timestamp,
                package: e.ordered_package_name
            };
        });
        return res;
    }

    public static async caculateSalaryFunc(
        id: any,
        start_time: any,
        end_time: any
    ) {
        if (!id || !start_time || !end_time) {
            return;
        }
        // lấy thông tin giáo viên
        const teacher = await TeacherActions.findOne({ user_id: id });
        if (!teacher) {
            return;
        }
        // tìm kiếm toàn bộ booking trong tháng của giáo viên
        const filterBooking = {
            teacher_id: id,
            'calendar.start_time': {
                $gte: start_time,
                $lte: end_time
            }
        };

        const listBookings = await BookingActions.findAllByCaculateSalary(
            filterBooking,
            {},
            {
                memo: 1,
                status: 1,
                is_regular_booking: 1,
                best_memo: 1,
                is_late: 1,
                id: 1,
                teacher_id: 1,
                student_id: 1,
                course_id: 1,
                calendar_id: 1,
                calendar: 1,
                ordered_package: 1,
                created_time: 1,
                updated_time: 1,
                substitute_for_teacher_id: 1,
                student: 1,
                teacher: 1
            }
        );
        // tính lương circle
        const salaryBase = await TeacherSalaryController.caculateBaseSalary(
            listBookings,
            teacher
        );
        // tính lương bonus
        const salaryBonus = await TeacherSalaryController.caculateBonus(
            listBookings,
            teacher,
            start_time,
            end_time
        );
        // tính phạt
        const salaryPunish = await TeacherSalaryController.caculatePunish(
            listBookings,
            teacher,
            start_time,
            end_time
        );
        const total_salary =
            salaryBase.salary + salaryBonus.bonus - salaryPunish.punish;
        const data = {
            teacher_id: id,
            location_id: teacher.location_id,
            currency: teacher?.location?.currency,
            start_time: start_time,
            end_time: end_time,
            total_salary: total_salary,
            // thông số lương
            hourly_rate: salaryBase.hourly_rate,
            salary_slot: salaryBase.salaryPerSlot,
            percent_salary_student_absent:
                salaryBase.percent_salary_student_absent,
            // thống số thưởng
            weekend_bonus: salaryBonus.weekend_bonus,
            conversion_bonus: salaryBonus.conversion_bonus,
            attendance_bonus: salaryBonus.attendance_bonus,
            referral_bonus: salaryBonus.referral_bonus,
            percent_substitute_bonus: salaryBonus.percent_substitute_bonus,
            // thông số phạt
            percent_absent_punish: salaryPunish.percent_absent_punish,
            percent_absent_punish_trial:
                salaryPunish.percent_absent_punish_trial,
            percent_absent_punish_first_3_slot:
                salaryPunish.percent_absent_punish_first_3_slot,
            percent_absent_punish_1h: salaryPunish.percent_absent_punish_1h,
            percent_absent_punish_2h: salaryPunish.percent_absent_punish_2h,
            percent_absent_punish_3h: salaryPunish.percent_absent_punish_3h,
            absent_punish_greater_3h: salaryPunish.absent_punish_greater_3h,
            late_memo_punish: salaryPunish.late_memo_punish,
            over_limit_punish: salaryPunish.over_limit_punish,
            base_salary: {
                // tổng lương cơ bản
                total_salary: salaryBase.salary,
                // tổng thưởng hoàn thành + viết memo
                total_salary_slot_done: salaryBase.salaryA1,
                list_slot_done: salaryBase.A1.map((e: any) => ({
                    _id: e._id,
                    id: e.id
                })),
                list_slot_done_without_memo:
                    TeacherSalaryController.buildDataSave(salaryBase.A1_1),

                // tổng thưởng số lớp học viên absent
                total_salary_slot_student_absent: salaryBase.salaryA2,
                list_slot_student_absent: TeacherSalaryController.buildDataSave(
                    salaryBase.A2
                )
            },
            bonus: {
                // tổng thưởng
                total_bonus: salaryBonus.bonus,
                // tổng thưởng dạy cuối tuần
                total_bonus_weekend: salaryBonus.bonusA1,
                list_slot_weekend: TeacherSalaryController.buildDataSave(
                    salaryBonus.A1
                ),
                // tổng thưởng chuyển đổi
                total_bonus_conversion: salaryBonus.bonusA2,
                list_conversion: salaryBonus.list_conversion,
                // tổng thưởng chuyên cần
                total_bonus_attendance: salaryBonus.bonusA3,
                list_slot_attendance: salaryBonus.list_slot_attendance,
                // tổng thưởng giới thiệu
                total_bonus_referral: salaryBonus.bonusA4,
                list_referral: salaryBonus.list_referral,
                // tổng thưởng dạy thay
                total_bonus_substitute_class: salaryBonus.bonusA5,
                list_slot_substitute_class:
                    TeacherSalaryController.buildDataSave(
                        salaryBonus.list_slot_substitute_class
                    )
            },
            punish: {
                // tổng phạt
                total_punish: salaryPunish.punish,
                // tổng phạt absent các lớp trial
                total_punish_absent_trial: salaryPunish.punishTrialAbsent,
                list_absent_trial: TeacherSalaryController.buildDataSave(
                    salaryPunish.listTrialAbsent
                ),

                // tổng phạt absent 3 lớp đầu tiên
                total_punish_absent_first_3_slot:
                    salaryPunish.punishBookingAbsentIsFirst3Slot,
                list_absent_first_3_slot: TeacherSalaryController.buildDataSave(
                    salaryPunish.listBookingAbsentIsFist3Slot
                ),
                // tổng phạt absent 3 lịch đầu tiên
                total_punish_absent_regular_first_3_slot:
                    salaryPunish.punishRegularAbsentIsFirst3Slot,
                list_absent_regular_first_3_slot:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularAbsentWithOutLeaveRequest
                    ),

                // tổng phạt absent các lớp mà không xin phép
                total_punish_absent_without_leave:
                    salaryPunish.punishWithOutLeaveRequest,
                list_absent_without_leave:
                    TeacherSalaryController.buildDataSave(
                        salaryPunish.listBookingAbsentWithOutLeaveRequest
                    ),

                // tổng phạt absent các lớp có xin phép trong vòng 1h
                total_punish_absent_with_leave_1h:
                    salaryPunish.punishWithLeaveRequest1h,
                list_absent_with_leave_1h:
                    TeacherSalaryController.buildDataSave(
                        salaryPunish.listBookingAbsentWithLeaveRequest1h
                    ),

                // tổng phạt absent các lịch có xin phép trong vòng 1h
                total_punish_absent_regular_with_leave_1h:
                    salaryPunish.punishRegularWithLeaveRequest1h,
                list_absent_regular_with_leave_1h:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularAbsentWithLeaveRequest1h
                    ),

                // tổng phạt absent các lớp có xin phép trong vòng 2h
                total_punish_absent_with_leave_2h:
                    salaryPunish.punishWithLeaveRequest2h,
                list_absent_with_leave_2h:
                    TeacherSalaryController.buildDataSave(
                        salaryPunish.listBookingAbsentWithLeaveRequest2h
                    ),

                // tổng phạt absent các lịch có xin phép trong vòng 2h
                total_punish_absent_regular_with_leave_2h:
                    salaryPunish.punishRegularWithLeaveRequest2h,
                list_absent_regular_with_leave_2h:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularAbsentWithLeaveRequest2h
                    ),

                // tổng phạt absent các lớp có xin phép trong vòng 3h
                total_punish_absent_with_leave_3h:
                    salaryPunish.punishWithLeaveRequest3h,
                list_absent_with_leave_3h:
                    TeacherSalaryController.buildDataSave(
                        salaryPunish.listBookingAbsentWithLeaveRequest3h
                    ),

                // tổng phạt absent các lịch có xin phép trong vòng 3h
                total_punish_absent_regular_with_leave_3h:
                    salaryPunish.punishRegularWithLeaveRequest3h,
                list_absent_regular_with_leave_3h:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularAbsentWithLeaveRequest3h
                    ),

                // tổng phạt absent các lớp có xin phép hơn 3h
                total_punish_absent_with_leave_greater_3h:
                    salaryPunish.punishWithLeaveRequestGreater3h,
                list_absent_with_leave_greater_3h:
                    TeacherSalaryController.buildDataSave(
                        salaryPunish.listBookingAbsentWithLeaveRequestGreater3h
                    ),

                // tổng phạt absent các lịch có xin phép hơn 3h
                total_punish_absent_regular_with_leave_greater_3h:
                    salaryPunish.punishRegularWithLeaveRequestGreater3h,
                list_absent_regular_with_leave_greater_3h:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularAbsentWithLeaveRequestGreater3h
                    ),

                // tổng phạt các lớp viết memo muộn
                total_punish_with_late_memo: salaryPunish.punishWithLateMemo,
                list_late_memo: TeacherSalaryController.buildDataSave(
                    salaryPunish.listBookingWithLateMemo
                ),

                // tổng phạt absent các lớp quá từ 3 buổi
                total_punish_with_over_limit: salaryPunish.punishWithOverLimit,
                list_over_limit: TeacherSalaryController.buildDataSave(
                    salaryPunish.listOverLimit
                ),

                // tổng phạt absent các lịch quá từ 3 buổi
                total_punish_regular_with_over_limit:
                    salaryPunish.punishRegularWithOverLimit,
                list_regular_over_limit:
                    TeacherSalaryController.buildDataCalendar(
                        salaryPunish.listRegularOverLimit
                    )
            }
        };
        let checkExits = await TeacherSalaryActions.findOne({
            teacher_id: data.teacher_id,
            start_time: data.start_time,
            end_time: data.end_time
        });
        if (checkExits) {
            await TeacherSalaryActions.update(checkExits._id, data as any);
        } else {
            checkExits = await TeacherSalaryActions.create(data as any);
        }
        return data;
    }
    public static async caculateSalary(req: ProtectedRequest, res: Response) {
        const { id, start_time, end_time } = req.body;
        if (!id || !start_time || !end_time) {
            throw new BadRequestError();
        }
        const data = await TeacherSalaryController.caculateSalaryFunc(
            id,
            start_time,
            end_time
        );
        return new SuccessResponse('success', data).send(res, req);
    }
    public static async caculateSalaryCronjob(
        req: ProtectedRequest,
        res: Response
    ) {
        const filter = {
            is_active: true,
            role: RoleCode.TEACHER
        } as any;
        let teachers = await UserActions.findAll(filter);

        // tính lương tháng
        let start_time = moment().startOf('month').valueOf();
        let end_time = moment().endOf('month').valueOf();
        if (moment().date() < 16) {
            console.log('========> circle 1');
            start_time = moment().startOf('month').valueOf();
            end_time = moment().set('date', 15).endOf('day').valueOf();
        } else {
            console.log('========> circle 2');
            start_time = moment().set('date', 15).endOf('day').valueOf();
            end_time = moment().endOf('month').valueOf();
        }

        for (const iterator of teachers) {
            try {
                await TeacherSalaryController.caculateSalaryFunc(
                    iterator.id,
                    start_time,
                    end_time
                );
            } catch (error) {
                console.log('=========>', error);
            }
        }
        return new SuccessResponse('success', '').send(res, req);
    }

    public static async caculateCircle(req: ProtectedRequest, res: Response) {
        const circle = Number(req.body.circle);
        const { month, year, id } = req.body;
        const time = moment()
            .set('year', Number(year))
            .set('month', Number(month) - 1)
            .valueOf();
        const filter = {
            is_active: true,
            role: RoleCode.TEACHER
        } as any;
        if (id) {
            filter.id = Number(id);
        }
        let teachers = await UserActions.findAll(filter);
        let start_time = 0;
        let end_time = 0;

        if (circle === 1) {
            start_time = moment(time).startOf('month').valueOf();
            end_time = moment(time).set('date', 15).endOf('day').valueOf();
            for (const iterator of teachers) {
                await TeacherSalaryController.caculateSalaryFunc(
                    iterator.id,
                    start_time,
                    end_time
                );
            }
        }

        if (circle === 2) {
            start_time = moment(time).set('date', 15).endOf('day').valueOf();
            end_time = moment(time).endOf('month').valueOf();
            for (const iterator of teachers) {
                await TeacherSalaryController.caculateSalaryFunc(
                    iterator.id,
                    start_time,
                    end_time
                );
            }
        }
        return new SuccessResponse('success', '').send(res, req);
    }

    public static async getSalary(req: ProtectedRequest, res: Response) {
        const {
            page_size,
            page_number,
            teacher_id,
            location_id,
            status,
            circle,
            month,
            year
        } = req.query;
        let { start_time, end_time }: any = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (month && year) {
            const time = moment()
                .set('year', Number(year))
                .set('month', Number(month) - 1)
                .valueOf();
            if (!circle) {
                start_time = moment(time).startOf('month');
                end_time = moment(time).endOf('month');
            } else if (Number(circle) === 1) {
                start_time = moment(time).startOf('month');
                end_time = moment(time).set('date', 15).endOf('day');
            } else if (Number(circle) === 2) {
                start_time = moment(time).set('date', 15).endOf('day');
                end_time = moment(time).endOf('month');
            }
            start_time = start_time.valueOf();
            end_time = end_time.valueOf();
        }
        if (teacher_id) {
            filter.teacher_id = teacher_id;
        }
        if (location_id) {
            filter.location_id = location_id;
        }
        if (start_time) {
            filter.start_time = start_time;
        }
        if (end_time) {
            filter.end_time = end_time;
        }
        if (status) {
            filter.status = status;
        }
        const res_payload = {
            data: [],
            pagination: {
                total: 0
            }
        };
        const res_agg = await TeacherSalaryActions.findAllAndPaginated(filter);
        if (res_agg && Array.isArray(res_agg) && res_agg.length > 0) {
            res_payload.data = res_agg[0].data;
            res_payload.pagination.total = res_agg[0].pagination.total;
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getSalaryByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { circle, month, year } = req.query;
        let { start_time, end_time, id }: any = req.query;
        const teacher_id = id || req.user.id;
        const filter: any = {};
        if (month && year) {
            const time = moment()
                .set('year', Number(year))
                .set('month', Number(month) - 1)
                .valueOf();
            if (!circle) {
                start_time = moment(time).startOf('month');
                end_time = moment(time).endOf('month');
            } else if (Number(circle) === 1) {
                start_time = moment(time).startOf('month');
                end_time = moment(time).set('date', 15).endOf('day');
            } else if (Number(circle) === 2) {
                start_time = moment(time).set('date', 15).endOf('day');
                end_time = moment(time).endOf('month');
            }
            start_time = start_time.valueOf();
            end_time = end_time.valueOf();
        } else {
            throw new BadRequestError();
        }
        if (teacher_id) {
            filter.teacher_id = teacher_id;
        }
        if (start_time) {
            filter.start_time = start_time;
        }
        if (end_time) {
            filter.end_time = end_time;
        }
        const res_agg = await TeacherSalaryActions.findOne(filter);
        return new SuccessResponse(req.t('common.success'), res_agg).send(
            res,
            req
        );
    }
}

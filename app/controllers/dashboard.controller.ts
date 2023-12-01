import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import TeacherActions from '../actions/teacher';
import { RoleCode } from '../const/role';
import UserActions from '../actions/user';
import BookingActions from '../actions/booking';
import { EnumBookingStatus } from '../models/booking';
import moment from 'moment';
import OrderedPackageActions from '../actions/ordered-package';
import { EnumPackageOrderType } from '../const/package';

const logger = require('dy-logger');

export default class DashboardController {
    public static async getStatistics(req: ProtectedRequest, res: Response) {
        const allTeachers = await TeacherActions.count({});
        const activeTeachers = await TeacherActions.count({
            'user.is_active': true
        });

        const allStudents = await UserActions.count({
            role: [RoleCode.STUDENT]
        });
        const activeStudents = await UserActions.count({
            role: [RoleCode.STUDENT],
            is_active: true
        });

        const allBookings = await BookingActions.count({});
        const upcomingBookings = await BookingActions.count({
            'calendar.start_time': { $gte: +new Date() }
        });

        return new SuccessResponse('successful', {
            teachers: { active: activeTeachers, count: allTeachers },
            students: { active: activeStudents, count: allStudents },
            booking: { upcoming: upcomingBookings, count: allBookings }
        }).send(res, req);
    }

    public static async hamiaNews(req: ProtectedRequest, res: Response) {
        const yesterday = moment()
            // .utcOffset('+00:00')
            .startOf('day')
            .subtract(1, 'days')
            .toDate();
        const today = moment().startOf('day').toDate();
        const tomorrow = moment()
            // .utcOffset('+00:00')
            .startOf('day')
            .add(1, 'days')
            .toDate();

        logger.info(`>>> yesterday: ${yesterday}`);
        logger.info(`>>> today: ${today}`);
        logger.info(`>>> tomorrow: ${tomorrow}`);

        console.log(yesterday);
        console.log(today);
        console.log(tomorrow);

        const filterStudent = {
            type: {
                $in: [
                    EnumPackageOrderType.PREMIUM,
                    EnumPackageOrderType.STANDARD
                ]
            },
            original_number_class: { $gte: 25 }
        };

        const filterTeacher = {
            'user.is_active': true
        };

        // Tổng số học viên (đã mua gói học)
        const totalStudent = await OrderedPackageActions.countStudents(
            filterStudent
        );

        // Tổng số học viên mới hôm qua (đã mua gói học lần đầu vào hôm qua)
        let allOrderedPackage = await OrderedPackageActions.findAll({
            ...filterStudent,
            created_time: {
                $lt: yesterday
            }
        });
        let arrUserId = allOrderedPackage.map((e) => e.user_id);

        const newTotalStudentYesterday =
            await OrderedPackageActions.countStudents({
                ...filterStudent,
                created_time: {
                    $gte: yesterday,
                    $lt: today
                },
                user_id: {
                    $nin: arrUserId
                }
            });

        // Tổng số học viên mới hôm nay (đã mua gói học lần đầu vào hôm nay)
        allOrderedPackage = await OrderedPackageActions.findAll({
            ...filterStudent,
            created_time: {
                $lt: today
            }
        });
        arrUserId = allOrderedPackage.map((e) => e.user_id);
        const newTotalStudentToday = await OrderedPackageActions.countStudents({
            ...filterStudent,
            created_time: {
                $gte: today,
                $lt: tomorrow
            },
            user_id: {
                $nin: arrUserId
            }
        });

        // Tổng số giáo viên đang active
        const totalActiveTeacher = await TeacherActions.count(filterTeacher);

        // Tổng số giáo viên mới active hôm qua
        const totalNewTeachersActiveYesterday = await TeacherActions.count({
            ...filterTeacher,
            created_time: {
                $gte: yesterday,
                $lt: today
            }
        });

        // Tổng số giáo viên mới active hôm nay
        const totalNewTeachersActiveToday = await TeacherActions.count({
            ...filterTeacher,
            created_time: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Tổng số booking done + upcoming
        const totalBookingDoneAndUpcoming = await BookingActions.count({
            status: [EnumBookingStatus.COMPLETED, EnumBookingStatus.CONFIRMED]
        });

        const res_payload = {
            total_student: totalStudent,
            new_total_student_yesterday: newTotalStudentYesterday,
            new_total_student_today: newTotalStudentToday,
            total_active_teacher: totalActiveTeacher,
            total_new_teachers_active_yesterday:
                totalNewTeachersActiveYesterday,
            total_new_teachers_active_today: totalNewTeachersActiveToday,
            total_booking_done_and_upcoming: totalBookingDoneAndUpcoming
        };

        return new SuccessResponse('successful', res_payload).send(res, req);
    }
}

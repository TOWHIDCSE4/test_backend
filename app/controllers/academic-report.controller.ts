import { SuccessResponse } from '../core/ApiResponse';
import { ProtectedRequest } from 'app-request';
import TeacherActions from '../actions/teacher';
import { Response } from 'express';
import moment from 'moment';
import { BookingModel, EnumBookingStatus } from '../models/booking';
import { EnumPackageOrderType } from '../const/package';
import { userInfo } from 'os';
import OrderedPackageActions from '../actions/ordered-package';
import BookingActions from '../actions/booking';
import cacheService from '../services/redis/cache-service';

export default class AcademicReport {
    public static async renew(req: ProtectedRequest, res: Response) {
        let time = Number(req.query.time) || moment().valueOf();
        time = moment(time).startOf('month').valueOf();
        const key = `academic-renew-${time}`;
        const cacheData = await cacheService.get(key);
        let resData: any = [];
        if (!cacheData) {
            const endMonth = moment(time).endOf('month');
            const startPreTime = moment(time)
                .subtract(1, 'month')
                .startOf('month');
            const endPreTime = startPreTime.clone().endOf('month');

            const listTeacher = await TeacherActions.findAll({
                'user.is_active': true
            });
            await Promise.all(
                listTeacher.map(async (e) => {
                    const data = {
                        teacher: {
                            id: e.user_id,
                            ...e.user
                        },
                        trial_student: [],
                        list_order_after_trial: [],
                        rate: 0,
                        total_trial_student: 0,
                        total_order_after_trial: 0,
                        total_done: 0,
                        total_absent: 0
                    } as any;
                    const bookingTrialAggre = [
                        {
                            $match: {
                                teacher_id: e.user_id,
                                status: EnumBookingStatus.COMPLETED,
                                'calendar.start_time': {
                                    $gte: startPreTime.valueOf(),
                                    $lt: endPreTime.valueOf()
                                }
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
                                'ordered-packages.type':
                                    EnumPackageOrderType.TRIAL
                            }
                        },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'student',
                                foreignField: '_id',
                                as: 'student'
                            }
                        },
                        {
                            $unwind: '$student'
                        }
                    ];
                    const bookingTrial = await BookingModel.aggregate(
                        bookingTrialAggre
                    );
                    if (bookingTrial.length) {
                        bookingTrial.forEach((element: any) => {
                            data.trial_student.push({
                                booking_id: element.id,
                                status: element.status,
                                start_time: element.calendar.start_time,
                                student: {
                                    full_name: element.student.full_name,
                                    id: element.student.id,
                                    username: element.student.username
                                }
                            });
                        });
                    }
                    if (data.trial_student.length) {
                        await Promise.all(
                            data.trial_student.map(async (e2: any) => {
                                const ordered_package =
                                    await OrderedPackageActions.findOne({
                                        user_id: e2.student.id,
                                        created_time: {
                                            $gte: moment(
                                                e2.start_time
                                            ).toDate(),
                                            $lt: moment(endPreTime).toDate()
                                        },
                                        original_number_class: { $gte: 25 }
                                    });
                                if (ordered_package) {
                                    data.list_order_after_trial.push({
                                        id: ordered_package.id,
                                        package_name:
                                            ordered_package.package_name,
                                        order_id: ordered_package.order_id
                                    });
                                }
                            })
                        );
                        data.rate =
                            (data.list_order_after_trial.length * 100) /
                            data.trial_student.length;
                    }
                    const countDone = await BookingActions.count({
                        status: EnumBookingStatus.COMPLETED,
                        teacher_id: e.user_id,
                        'calendar.start_time': {
                            $gte: startPreTime.valueOf(),
                            $lt: endMonth.valueOf()
                        }
                    });
                    data.total_done = countDone;
                    const countAbsent = await BookingActions.count({
                        status: [
                            EnumBookingStatus.TEACHER_ABSENT,
                            EnumBookingStatus.CANCEL_BY_TEACHER
                        ],
                        teacher_id: e.user_id,
                        'calendar.start_time': {
                            $gte: startPreTime.valueOf(),
                            $lt: endMonth.valueOf()
                        }
                    });
                    data.total_absent = countAbsent;
                    data.total_trial_student = data.trial_student.length;
                    data.total_order_after_trial =
                        data.list_order_after_trial.length;
                    delete data.trial_student;
                    delete data.list_order_after_trial;

                    resData.push(data);
                })
            );
            console.log('===>set cache ' + key);
            await cacheService.set(key, resData, 1000 * 60 * 60);
        } else {
            resData = cacheData;
        }

        return new SuccessResponse(req.t('common.success'), resData).send(
            res,
            req
        );
    }
}

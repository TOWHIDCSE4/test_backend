import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import BookingController from './booking.controller';
import CalendarController from './calendar.controller';
import BookingActions from '../actions/booking';
import OrderedPackageActions from '../actions/ordered-package';
import Booking, {
    BookingModel,
    EnumBookingMediumType,
    EnumBookingStatus
} from '../models/booking';
import { EnumTrialBookingStatus } from '../models/trial-booking';
import { MINUTE_TO_MS } from '../const/date-time';
import _ from 'lodash';
import { IELTS_TEACHER_FAKE_ID } from '../const/booking';
import moment from 'moment';

const logger = require('dy-logger');

export default class IeltsBookingController {
    public static async handleIeltsBookingCreation(
        req: ProtectedRequest,
        res: Response
    ) {
        const { ordered_package_id, start_time } = req.body;
        const status = req.body.status;
        req.body.teacher_id = IELTS_TEACHER_FAKE_ID;
        const teacher_id = req.body.teacher_id;
        let { end_time } = req.body;
        if (!end_time) {
            end_time = start_time + 30 * MINUTE_TO_MS;
            req.body.end_time = end_time;
        }
        const currentTimestamp = moment().valueOf();
        // check time tạo booking phải lớn hơn hiện tại
        if (
            status == EnumBookingStatus.CONFIRMED &&
            start_time <= currentTimestamp
        ) {
            throw new BadRequestError(
                req.t('errors.booking_ielts.invalid_time')
            );
        }
        const ordered_package = await OrderedPackageActions.findOne({
            id: ordered_package_id,
            number_class: { $gt: 0 }
        });
        if (!ordered_package) {
            throw new BadRequestError(
                req.t('errors.ordered_package.not_found')
            );
        }

        // tìm tất cả booking của student tại time này
        const userBookings = await BookingActions.findAll(
            {
                student_id: ordered_package.user_id,
                'calendar.start_time': start_time
            },
            {
                created_time: -1
            }
        );
        // kiểm tra xem booking có thời gian gần nhất có trạng thái đạt điều kiện hay không
        if (
            userBookings.length > 0 &&
            ![
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.CHANGE_TIME
            ].includes(userBookings[0].status)
        ) {
            throw new BadRequestError(
                req.t('errors.booking.student_has_booked_at_time')
            );
        }

        let calendar_id: number;
        calendar_id = await CalendarController.createIeltsCalendar(
            req,
            teacher_id
        );

        /** Add more fields to request body to create booking */
        req.body.course_id = req.body.course;
        const student_id = ordered_package.user_id;
        req.body.calendar_id = calendar_id;
        const booking: any = await BookingController.createBooking(
            req,
            student_id,
            status,
            {
                accept_time: true
            }
        );

        if (req.body?.isCrm) {
            if (req.body?.medium === EnumBookingMediumType.SKYPE) {
                const student_create_booking_req = {
                    user: booking.student
                };

                booking.learning_medium.medium_type =
                    EnumBookingMediumType.SKYPE;
                // await BookingController.generateBookingJoinUrl(
                //     student_create_booking_req as ProtectedRequest,
                //     booking
                // );
                const medium_info = {
                    learning_medium: {
                        medium_type: EnumBookingMediumType.SKYPE,
                        info: student_create_booking_req.user
                            .trial_class_skype_url
                    }
                };
                await BookingActions.update(
                    booking._id,
                    medium_info as Booking
                );
            }
        }

        return {
            booking,
            req,
            res
        };
    }

    public static async createIeltsBooking(
        req: ProtectedRequest,
        res: Response
    ) {
        const data = await IeltsBookingController.handleIeltsBookingCreation(
            req,
            res
        );

        return new SuccessResponse(req.t('common.success'), data.booking).send(
            res,
            req
        );
    }
}

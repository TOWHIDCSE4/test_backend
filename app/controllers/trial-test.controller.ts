import axios from 'axios';
import config from 'config';
import { ProtectedRequest } from 'app-request';
import { SuccessResponse } from './../core/ApiResponse';
import BookingController from './booking.controller';
import OrderedPackageActions from '../actions/ordered-package';
import { EnumPackageOrderType } from '../const/package';
import BookingActions from '../actions/booking';
import { Response } from 'express';
import { EnumBookingStatus } from '../models/booking';
import TrialTestIeltsResultActions from '../actions/trial-test-ielts-result';

const trialTestUrl = config.get('server.trial_test_url');
const logger = require('dy-logger');
export default class TrialTestController {
    public static async getTopicTrialTestByLevel(level_id: number) {
        const url = trialTestUrl + `/admin/trial-test/random-topic-by-level`;
        const res = await axios.post(url, { levelId: level_id });
        return res.data.data;
    }

    public static async getTopicTrialTestById(id: number) {
        const url = trialTestUrl + `/admin/trial-test/topic`;
        const res = await axios.post(url, { id_topic: id });
        return res.data.data;
    }

    public static async getAllTrialBookingsWithTestResults(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            start_time,
            search,
            sort,
            max_end_time,
            min_start_time,
            min_test_start_time,
            max_test_start_time,
            recorded,
            id
        } = req.query;
        const trialTestIeltsResult = await TrialTestIeltsResultActions.findAll(
            {}
        );
        const bookingIds = trialTestIeltsResult.map((e) => e.booking_id);
        let filter: any = {
            status: EnumBookingStatus.COMPLETED,
            'calendar.start_time': start_time
                ? parseInt(start_time as string)
                : 0,
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            test_topic_id: { $gte: 1 },
            $or: [],
            $and: []
        };
        if (id && !bookingIds.includes(Number(id))) {
            filter.id = Number(id);
        } else {
            filter.$and.push({
                id: { $nin: bookingIds }
            });
        }
        if (min_start_time) {
            filter.min_start_time = parseInt(min_start_time as string);
        }
        if (max_end_time) {
            filter.max_end_time = parseInt(max_end_time as string);
        }

        if (min_test_start_time) {
            filter.$and.push({
                test_start_time: {
                    $gte: parseInt(min_test_start_time as string)
                }
            });
        }
        if (max_test_start_time) {
            filter.$and.push({
                test_start_time: {
                    $lte: parseInt(max_test_start_time as string)
                }
            });
        }

        if (recorded == 'true') {
            filter.record_link = { $regex: '.+' }; /** Exists and not empty */
        } else if (recorded == 'false') {
            filter.record_link = {
                $not: { $regex: '.+' }
            };
        }
        const date = new Date();
        const valid_date = date.setMonth(date.getMonth() - 6);

        if (
            parseInt(min_start_time as string) >
                parseInt(max_end_time as string) ||
            parseInt(start_time as string) < new Date(valid_date).getTime() ||
            parseInt(min_start_time as string) < new Date(valid_date).getTime()
        ) {
            const res_payload = {
                data: [],
                pagination: {
                    total: 0
                }
            };
            return new SuccessResponse('success', res_payload).send(res, req);
        }
        let name_query_list = [];
        if (search) {
            name_query_list =
                await BookingController.buildNameSearchQueryForBooking(
                    search as string,
                    {
                        student_id: 1,
                        teacher_id: 1,
                        course_id: 1,
                        ordered_package_id: 1
                    }
                );
        }

        const nameQuery = [];
        for (const query of name_query_list) {
            nameQuery.push(query);
        }
        const orderTrials = await OrderedPackageActions.findAll({
            type: [EnumPackageOrderType.TRIAL]
        });
        const package_ids = orderTrials.map((e) => e.id);
        filter = {
            ...filter,
            ...{
                is_regular_booking: false,
                ordered_package_id: { $in: package_ids }
            }
        };
        filter.$or = nameQuery;

        const sort_field: any = {};
        if (min_test_start_time || max_test_start_time) {
            sort_field['test_start_time'] = -1;
        } else {
            sort_field['created_time'] = -1;
        }
        const bookings = await BookingActions.findAllAndPaginated(
            filter,
            sort_field
        );
        const count = await BookingActions.count(filter);
        const res_payload = {
            data: bookings,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }
}

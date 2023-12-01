import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from '../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import { LIST_PERMISSIONS } from '../const/permission';
import _ from 'lodash';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import AIReportResultActions from '../actions/ai-report-result';
import AIReportResult from '../models/ai-report-result';
import CounterActions from '../actions/counter';
import PromptCategoryAIActions from '../actions/prompt-category-AI';
import ApiKeyAIActions from '../actions/api-key-AI';
import ApiKeyAI from '../models/api-key-AI';
import axios from 'axios';
import moment from 'moment';
import PromptTemplateAIActions from '../actions/prompt-template-AI';
import UserActions from '../actions/user';
import { EnumBookingStatus } from '../models/booking';
import BookingActions from '../actions/booking';
import { EnumPackageOrderType } from '../const/package';
import { RoleCode } from '../const/role';

const OPEN_AI_URL = process.env.OPEN_AI_URI || 'https://api.openai.com';
const logger = require('dy-logger');

export default class AIReportGenerateController {
    public static async reportGenerate(req: ProtectedRequest, res: Response) {
        const { params } = req.body;
        const number_lesson = parseInt(req.body.number_lesson as string);
        const user_name = req.body.user_name;
        const prompt_id = parseInt(req.body.prompt_id as string);
        const from_date =
            parseInt(req.body.from_date as string) || moment().valueOf();
        const to_date =
            parseInt(req.body.to_date as string) || moment().valueOf();
        const dataPrompt = await PromptTemplateAIActions.findOne({
            id: prompt_id
        });
        const data_payload: any = {
            data: null
        };
        if (!dataPrompt) {
            throw new BadRequestError('Prompt template is not exists');
        }
        let promptTemplate = dataPrompt.prompt;
        let userData: any = null;
        if (
            promptTemplate.indexOf('$[user_name]') !== -1 ||
            promptTemplate.indexOf('$[age]') !== -1
        ) {
            userData = await UserActions.findOne({ username: user_name });
            if (!userData) {
                throw new BadRequestError('User is not exists');
            }
            promptTemplate = promptTemplate.replace(
                '$[user_name]',
                userData.full_name
            );
            const age_user: any = moment
                .unix(moment().valueOf() / 1000)
                .diff(moment(userData?.date_of_birth, 'YYYY'), 'years');
            promptTemplate = promptTemplate.replace('$[age]', age_user);
        }
        if (number_lesson && userData) {
            const filter: any = {
                status: EnumBookingStatus.COMPLETED,
                'order_package.type': [
                    EnumPackageOrderType.STANDARD,
                    EnumPackageOrderType.PREMIUM
                ]
            };
            if (userData?.role[0] === RoleCode.STUDENT) {
                filter.student_id = userData?.id;
            }
            if (userData?.role[0] === RoleCode.TEACHER) {
                filter.teacher_id = userData?.id;
            }
            if (from_date) {
                filter['calendar.start_time'] = { $gte: from_date };
            }
            if (to_date) {
                filter['calendar.end_time'] = { $lte: to_date };
            }
            const bookings = await BookingActions.findAllNotPopulate(filter, {
                'calendar.start_time': -1
            });
            if (!bookings) {
                throw new BadRequestError('bookings is not exists');
            }
            const dataBookingMemo: any = [];
            let countBookingMemo = 0;
            if (promptTemplate.indexOf('$[number_class]') !== -1) {
                promptTemplate = promptTemplate.replace(
                    '$[number_class]',
                    req.body.number_lesson
                );
            }
            if (promptTemplate.indexOf('$[list_memo]') !== -1) {
                await Promise.all(
                    bookings.map(async (item: any) => {
                        if (
                            item?.memo?.other &&
                            item?.memo?.other[5] &&
                            countBookingMemo < number_lesson
                        ) {
                            dataBookingMemo.push(item);
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            countBookingMemo++;
                        }
                    })
                );
                if (
                    dataBookingMemo &&
                    countBookingMemo == number_lesson &&
                    promptTemplate
                ) {
                    let listMemo: any = '';
                    let index = 1;
                    for await (const booking of dataBookingMemo) {
                        const dataMemo = booking.memo;
                        if (dataMemo) {
                            const findData = async (
                                keyword: string,
                                keyArr: string,
                                key: string
                            ) => {
                                try {
                                    return (
                                        (await dataMemo[keyArr].find(
                                            (e: any) => e.keyword === keyword
                                        )[key]) || 'Chưa có đánh giá'
                                    );
                                } catch (error) {
                                    logger.error('data memo is not exists');
                                    throw new BadRequestError(
                                        'wrong input data'
                                    );
                                }
                                return 'Chưa có đánh giá';
                            };
                            const strength_point = await findData(
                                'strength',
                                'other',
                                'comment'
                            );
                            const weakness_point = await findData(
                                'weakness',
                                'other',
                                'comment'
                            );
                            const comment = await findData(
                                'another_comment',
                                'other',
                                'comment'
                            );
                            const level_of_attention = await findData(
                                'attention',
                                'other',
                                'comment'
                            );
                            const level_of_comprehension = await findData(
                                'comprehension',
                                'other',
                                'comment'
                            );
                            const in_class_performance = await findData(
                                'performance',
                                'other',
                                'comment'
                            );
                            if (
                                level_of_attention &&
                                level_of_comprehension &&
                                in_class_performance &&
                                strength_point &&
                                weakness_point &&
                                comment
                            ) {
                                listMemo += ` Class [${index}]: Level of Attention: ${level_of_attention} - Level of Comprehension : ${level_of_comprehension} - In-class Performance : ${in_class_performance} - Strength: ${strength_point} - Weakness: ${weakness_point} - Another comment : ${comment}.`;
                            } else {
                                logger.info('rate component is not exists');
                                throw new BadRequestError('wrong input data');
                            }
                        } else {
                            logger.info('dataMemo is not exists');
                            throw new BadRequestError('wrong input data');
                        }
                        index++;
                    }
                    if (listMemo) {
                        promptTemplate = promptTemplate.replace(
                            '$[list_memo]',
                            listMemo
                        );
                    } else {
                        logger.info('listMemo is not exists');
                        throw new BadRequestError('wrong input data');
                    }
                } else {
                    throw new BadRequestError(
                        'Khoảng thời gian đang chọn không có đủ số lớp học đã hoàn thành theo yêu cầu'
                    );
                }
            }

            if (
                promptTemplate.indexOf('$[start_time_list]') !== -1 ||
                promptTemplate.indexOf('$[homework_score_list]') !== -1 ||
                promptTemplate.indexOf('$[course_list]') !== -1 ||
                promptTemplate.indexOf('$[unit_list]') !== -1
            ) {
                const startTimeList: any = [];
                const homeworkScoreList: any = [];
                const courseList: any = [];
                const unitList: any = [];
                let countDataBooking = 0;
                await Promise.all(
                    bookings.map(async (item: any) => {
                        if (countDataBooking < number_lesson) {
                            startTimeList.push(
                                moment(
                                    parseInt(
                                        item?.calendar.start_time as string
                                    )
                                ).format('HH:mm DD-MM-YYYY')
                            );
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const homeworkScore =
                                item?.homework?.sessions[0]?.user_score ??
                                item?.homework_test_result?.test_result
                                    ?.percent_correct_answers ??
                                item?.homework_test_result?.test_result?.avg ??
                                0;
                            homeworkScoreList.push(homeworkScore);
                            if (item?.course?.name) {
                                courseList.push(item?.course?.name);
                            }
                            if (item?.unit?.name) {
                                unitList.push(item?.unit?.name);
                            }
                            countDataBooking++;
                        }
                    })
                );
                if (countDataBooking !== number_lesson) {
                    throw new BadRequestError(
                        'Khoảng thời gian đang chọn không có đủ số lớp học đã hoàn thành theo yêu cầu'
                    );
                }
                if (
                    promptTemplate.indexOf('$[start_time_list]') !== -1 &&
                    startTimeList.length > 0
                ) {
                    const list_start_time = startTimeList.join(', ');
                    promptTemplate = promptTemplate.replace(
                        '$[start_time_list]',
                        list_start_time
                    );
                }
                if (
                    promptTemplate.indexOf('$[homework_score_list]') !== -1 &&
                    homeworkScoreList.length > 0
                ) {
                    const list_homework_score = homeworkScoreList.join(', ');
                    promptTemplate = promptTemplate.replace(
                        '$[homework_score_list]',
                        list_homework_score
                    );
                }
                if (
                    promptTemplate.indexOf('$[course_list]') !== -1 &&
                    courseList.length > 0
                ) {
                    const list_course = courseList.join(', ');
                    promptTemplate = promptTemplate.replace(
                        '$[course_list]',
                        list_course
                    );
                }
                if (
                    promptTemplate.indexOf('$[unit_list]') !== -1 &&
                    unitList.length > 0
                ) {
                    const list_unit = unitList.join(', ');
                    promptTemplate = promptTemplate.replace(
                        '$[unit_list]',
                        list_unit
                    );
                }
            }
        }
        let dataGenerate = await AIReportGenerateController.generateAIResult(
            promptTemplate,
            params
        );
        logger.info('data generate: ' + dataGenerate);
        if (dataGenerate) {
            dataGenerate = await dataGenerate.replaceAll('\n\n', '</p> <p>');
            data_payload.data = dataGenerate;
        }
        return new SuccessResponse('success', data_payload).send(res, req);
    }

    public static async generateAIResult(promptData?: any, params?: any) {
        logger.info('start call api AI generate report >>');
        const apiKey: any = await ApiKeyAIActions.findOne(
            { is_active: true },
            { __v: 0 },
            {
                last_used_time: 1,
                _id: 1
            }
        );
        if (!apiKey) throw new BadRequestError('api key not found');
        const dataPost: any = {
            model: 'text-davinci-003',
            max_tokens: 1000,
            temperature: 0
        };
        const language = params?.language || 'English';
        promptData += '\n Provide response in ' + language + ' language. \n';
        if (params) {
            const tone = params.tone || 'professional';
            dataPost.temperature = parseInt(params.quality as string) || 0.75;
            dataPost.max_tokens = params.max_result_length || 1000;
            dataPost.n = params.number_result || 1;
            promptData +=
                'Tone of voice of the titles must be: \n' + tone + '\n';
        }
        dataPost.prompt = promptData;
        logger.info(dataPost);
        logger.info('prompt data: ' + promptData);
        try {
            const route = OPEN_AI_URL + '/v1/completions';
            const headers = {
                Authorization: 'Bearer ' + apiKey?.api_key,
                'Content-Type': 'application/json; charset=utf-8'
            };
            const response = await axios({
                method: 'post',
                url: route,
                headers,
                data: dataPost
            });
            logger.info('end call api AI generate report <<');
            await ApiKeyAIActions.update(apiKey._id, {
                last_used_time: moment().valueOf()
            } as ApiKeyAI);
            let res: any = '';
            if (response?.data.choices && response?.data?.choices[0]) {
                let indexResult = 1;
                logger.info(
                    'count data response: ' + response?.data?.choices?.length
                );
                for await (const result of response?.data?.choices) {
                    logger.info(indexResult);
                    if (indexResult > 1) {
                        res +=
                            '<p>[' +
                            indexResult +
                            '] ------------------------------------------------------------- <p>' +
                            result.text;
                    } else {
                        res += result.text;
                    }
                    indexResult++;
                }
            }
            return res;
        } catch (err: any) {
            //     await ApiKeyAIActions.update(apiKey._id, {
            //         last_used_time: moment().valueOf(),
            //         is_active: false,
            //         msg_error: err?.message
            //     } as ApiKeyAI);
            logger.error(
                'api AI generate Error code: ' + err?.response?.status
            );
            logger.error(
                'api AI generate report API Error: ' +
                    err?.response?.data?.error?.message
            );
            switch (err?.response?.status) {
                case 400:
                    throw new BadRequestError(
                        'API Error: The requested data is not valid for the API request.'
                    );
                case 401:
                    throw new BadRequestError(
                        'API Error: The API key is missing or invalid.'
                    );
                case 403:
                    throw new BadRequestError(
                        'API Error: You lack the necessary permissions to perform this action.'
                    );
                case 404:
                    throw new BadRequestError(
                        'API Error: The requested resource was not found.'
                    );
                case 429:
                    throw new BadRequestError(
                        'API Error: You are sending requests too quickly or you exceeded your current quota.'
                    );
                case 500:
                    throw new BadRequestError(
                        'API Error: The server had an error while processing your request, please try again.'
                    );
                default:
                    throw new BadRequestError(
                        'Unexpected error, please try again.'
                    );
            }
        }
    }
}

import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import CommentSuggestionActions from '../actions/comment-suggestion';
import CounterActions from '../actions/counter';
import CommentSuggestion, {
    EnumCommentType
} from '../models/comment-suggestion';
import { ADMIN_TRIAL_ASSESSMENT_FIELD } from '../const/memo';
import _ from 'lodash';
import LogServices from '../services/logger';
import { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'keyword',
    'type',
    'min_point',
    'max_point',
    'vi_comment',
    'en_comment'
];
export default class CommentSuggestionController {
    /**
     * @description Admin get the list of comment suggestions
     * @queryParam page_size <number> The count of results that admin want
     * @queryParam page_number <number> The page number for paging
     * @returns The list of comment suggestion results with the total
     *          number of matched suggestions
     */
    public static async getCommentSuggestionBanksByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_size, page_number, type, keyword, point, age, month } =
            req.query;
        const filter = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            type: type ? (type as string) : null,
            month: month ? parseInt(month as string) : 0,
            keyword: keyword ? (keyword as string) : null,
            point: point ? parseInt(point as string) : null,
            age: age ? parseInt(age as string) : 0
        };
        const suggestions = await CommentSuggestionActions.findAllAndPaginated(
            filter,
            {},
            { created_time: -1 }
        );
        const total = await CommentSuggestionActions.count(filter);
        const res_payload = {
            data: suggestions,
            pagination: {
                total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description Admin get a random comment suggestion
     */
    public static async getCommentSuggestionForAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { type, keyword, point, age } = req.query;
        const res_payload: any = {
            data: null
        };
        const filter = {
            type: type ? (type as string) : null,
            keyword: keyword ? (keyword as string) : null,
            point: point ? parseInt(point as string) : null,
            age: age ? parseInt(age as string) : 0
        };
        Object.entries(filter).forEach((entry) => {
            const value = entry[1];
            if (value == null) {
                return new SuccessResponse(
                    req.t('common.success'),
                    res_payload
                ).send(res, req);
            }
        });
        res_payload.data =
            await CommentSuggestionActions.findOneRandomSuggestion(filter);
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description This is made only to keep the old memo suggestion get route
     */
    public static async getNormalMemoSuggestionsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        req.query.type = EnumCommentType.NORMAL_MEMO;
        await CommentSuggestionController.getCommentSuggestionForAdmin(
            req,
            res
        );
    }

    public static async getCommentSuggestionForTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { type, keyword, point, age } = req.query;
        const res_payload: any = {
            data: null
        };
        const filter: any = {
            type: type ? (type as string) : null,
            keyword: keyword ? (keyword as string) : null,
            point: point ? parseInt(point as string) : null,
            age: age ? parseInt(age as string) : 0
        };
        Object.entries(filter).forEach((entry) => {
            const value = entry[1];
            if (value == null) {
                return new SuccessResponse(
                    req.t('common.success'),
                    res_payload
                ).send(res, req);
            }
        });
        if (ADMIN_TRIAL_ASSESSMENT_FIELD.includes(keyword as string)) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }
        res_payload.data =
            await CommentSuggestionActions.findOneRandomSuggestion(filter, {
                en_comment: 1,
                vi_comment: 1
            });
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getCommentSuggestionsForTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        const { type, keyword } = req.query;
        const res_payload: any = {
            data: null
        };
        const filter: any = {
            type: type ? (type as string) : null,
            keyword: keyword ? (keyword as string) : null
        };

        res_payload.data = await CommentSuggestionActions.findAll(filter);

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description This is made only to keep the old trial comment suggestion get route
     */
    public static async getTrialCommentSuggestionsByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        req.query.type = EnumCommentType.TRIAL_MEMO;
        await CommentSuggestionController.getCommentSuggestionForTeacher(
            req,
            res
        );
    }

    /**
     * @description This is made only to keep the old memo suggestion get route
     */
    public static async getNormalMemoSuggestionsByTeacher(
        req: ProtectedRequest,
        res: Response
    ) {
        req.query.type = EnumCommentType.NORMAL_MEMO;
        await CommentSuggestionController.getCommentSuggestionForTeacher(
            req,
            res
        );
    }

    /**
     * @description Admin create a suggestion so later they can use for
     *               assessment
     * @bodyParam keyword <string> An assessment field
     * @bodyParam type <number> memo type
     * @bodyParam vi_comments <string[]> A list of comment suggestion for
     *            each point that could be given to a student, in vietnamese
     * @bodyParam en_comments <string[]> A list of comment suggestion for
     *            each point that could be given to a student, in english
     * @returns Success message with ok result
     */
    public static async createSuggestion(req: ProtectedRequest, res: Response) {
        const { keyword, type, min_point, max_point, vi_comment, en_comment } =
            req.body;
        if (min_point >= max_point) {
            throw new BadRequestError(req.t('errors.comment.invalid_point'));
        }

        const counter = await CounterActions.findOne();
        const comment = {
            id: counter.suggestion_id,
            keyword,
            min_point,
            max_point,
            type,
            vi_comment,
            en_comment
        };

        await CommentSuggestionActions.create(comment as CommentSuggestion);

        const res_payload = {
            ok: true
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description Edit an existing assessment
     * @urlParam keyword <string> An assessment field
     * @bodyParam vi_comments <string[]> A list of comment suggestion for
     *            each point that could be given to a student, in vietnamese
     * @bodyParam en_comments <string[]> A list of comment suggestion for
     *            each point that could be given to a student, in english
     * @returns Success message with ok result
     */
    public static async editSuggestion(req: ProtectedRequest, res: Response) {
        /**
         * @NOTE No keyword here, we don't allow admin to change an
         * existing keyword because it would disrupt the client applications.
         * If they want, they could create a new  suggestion
         */
        const { vi_comment, en_comment, min_point, max_point } = req.body;
        const res_payload = {
            ok: true
        };
        if (!vi_comment || !en_comment || !min_point || !max_point) {
            return new SuccessResponse(
                req.t('common.success'),
                res_payload
            ).send(res, req);
        }

        const { suggestion_id } = req.params;
        const suggestion = await CommentSuggestionActions.findOne({
            id: parseInt(suggestion_id as string)
        });
        if (!suggestion) {
            throw new BadRequestError(req.t('errors.comment.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'CommentSuggestionModel',
            suggestion,
            pickUpData
        );
        const diff = {
            vi_comment: vi_comment ? vi_comment : suggestion.vi_comment,
            en_comment: en_comment ? en_comment : suggestion.en_comment,
            min_point: min_point ? min_point : suggestion.min_point,
            max_point: max_point ? max_point : suggestion.max_point
        };
        if (diff.min_point >= diff.max_point) {
            throw new BadRequestError(req.t('errors.comment.invalid_point'));
        }
        const new_data = await CommentSuggestionActions.update(suggestion._id, {
            ...diff
        } as CommentSuggestion);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'CommentSuggestionModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    /**
     * @description Remove an existing  assessment suggestion
     * @urlParam keyword <string> An assessment field
     * @returns Success message with ok result
     */
    public static async removeComment(req: ProtectedRequest, res: Response) {
        const { suggestion_id } = req.params;
        const suggestion = await CommentSuggestionActions.findOne({
            id: parseInt(suggestion_id as string)
        });
        if (suggestion) {
            await CommentSuggestionActions.remove(suggestion._id);
        }
        const res_payload = {
            ok: true
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}

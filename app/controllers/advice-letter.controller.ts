import { ProtectedRequest } from 'app-request';
import AdviceLetterActions from '../actions/advice-letter';
import { query, Response } from 'express';
import { SuccessResponse, ResponseStatus } from './../core/ApiResponse';
import UserActions from '../actions/user';

export default class AdviceLetterController {
    public static async buildNameSearchQueryForAdviceLetter(
        search: string,
        search_field: any
    ) {
        const name_query: Array<any> = [];
        if (!search || search.length <= 0) {
            return name_query;
        }
        const user_id_list = new Array<number>();
        const user_list = await UserActions.findAll({ name: search });
        for (const user of user_list) {
            user_id_list.push(user.id);
        }
        name_query.push({
            student_id: { $in: user_id_list }
        });

        return name_query;
    }

    public static async removeAdviceLetter(
        req: ProtectedRequest,
        res: Response
    ) {
        const { obj_id } = req.params;
        if (obj_id) {
            await AdviceLetterActions.remove(obj_id);
        }
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }

    public static async getAllLetters(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, sort, status, search } = req.query;

        const filter: any = {
            status: new Array<number>(),
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            if (Array.isArray(status) && status.length > 0) {
                for (const element of status) {
                    const element_int = parseInt(element as string);
                    if (!isNaN(element_int)) {
                        filter.status.push(element_int);
                    }
                }
            } else {
                const status_int = parseInt(status as string);
                if (!isNaN(status_int)) {
                    filter.status.push(status_int);
                }
            }
        }
        let name_query_list = [];
        if (search) {
            name_query_list =
                await AdviceLetterController.buildNameSearchQueryForAdviceLetter(
                    search as string,
                    {
                        student_id: 1
                    }
                );
        }
        const nameQuery = [];
        for (const query of name_query_list) {
            nameQuery.push(query);
        }

        if (search) {
            filter.$or = [...nameQuery];
        }
        const sort_field: any = {};
        switch (sort) {
            case 'prev': {
                sort_field['calendar.start_time'] = -1;
                sort_field['created_time'] = -1;
                break;
            }
            case 'upcoming': {
                sort_field['calendar.end_time'] = 1;
                sort_field['created_time'] = -1;
                break;
            }
            case 'created_time_desc': {
                sort_field['created_time'] = -1;
                break;
            }
            default: {
                sort_field['calendar.start_time'] = 1;
                break;
            }
        }

        const letters = await AdviceLetterActions.findAllAndPaginated(
            filter,
            sort_field
        );
        const count = await AdviceLetterActions.count(filter);

        const res_payload = {
            data: letters,
            pagination: {
                total: count
            }
        };

        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async updateStatus(req: ProtectedRequest, res: Response) {
        const { id, newStatus } = req.body;
        const dataPost: any = {
            _id: id,
            status: newStatus
        };

        await AdviceLetterActions.update(dataPost);
        const res_payload = {
            ok: true
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}

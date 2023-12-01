import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _, { escapeRegExp } from 'lodash';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import Contact, { ContactModel } from '../models/contact.model';
import DepartmentActions from '../actions/department';
import LogServices from '../services/logger';
import { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'contact_name',
    'phone',
    'email',
    'course',
    'content',
    'change_time',
    'department'
];
export default class ContactController {
    public static async getContacts(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, search, search_department } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            search: search as string,
            department_id: parseInt(search_department as string)
        };
        const pageSize = filter.page_size || 20;
        const pageNumber = filter.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const filterQuery: any = {};
        if (filter.search) {
            const searchRegexStr = escapeRegExp(filter.search);
            filterQuery['$or'] = [
                { contact_name: { $regex: searchRegexStr, $options: 'i' } },
                { email: { $regex: searchRegexStr, $options: 'i' } },
                { phone: { $regex: searchRegexStr, $options: 'i' } }
            ];
        }
        if (filter.department_id) {
            filterQuery.department_id = filter.department_id;
        }
        const contacts = await ContactModel.find(filterQuery)
            .sort({ created_time: -1 })
            .populate('department')
            .skip(skip)
            .limit(limit)
            .exec();
        const count = await ContactModel.countDocuments(filterQuery).exec();
        const res_payload = {
            data: contacts,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async createContact(req: ProtectedRequest, res: Response) {
        const { contact_name, phone, email, course, content } = req.body;
        const contact = {
            contact_name,
            phone,
            email,
            course,
            content
        };
        const existsContact = await ContactModel.findOne({ email: email });
        if (existsContact) {
            await ContactModel.findOneAndUpdate(
                { email },
                {
                    $set: {
                        ...contact,
                        updated_time: new Date()
                    }
                },
                {
                    upsert: false,
                    new: true,
                    returnOriginal: false
                }
            ).exec();
        } else {
            const newModel = new ContactModel({
                ...contact,
                created_time: new Date(),
                updated_time: new Date()
            });
            await newModel.save();
        }
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    public static async updateContact(req: ProtectedRequest, res: Response) {
        const { _id } = req.params;
        const { department } = req.body;
        const dep = await DepartmentActions.findOne({
            filter: { id: _.toInteger(department) }
        });
        if (!dep) {
            throw new BadRequestError(req.t('common.not_found'));
        }
        const change_time = new Date();
        const contacts = await ContactModel.findOne({ _id });
        if (!contacts) {
            throw new BadRequestError(req.t('common.not_found'));
        }
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'ContactModel',
            contacts,
            pickUpData
        );
        const new_data = await ContactModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    department_id: department,
                    department: dep,
                    change_time: change_time
                }
            }
        ).exec();
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'ContactModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }
}

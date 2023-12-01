import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import { SuccessResponse } from './../core/ApiResponse';
import { countries } from 'countries-list';
import timeZones from '../const/timezones.json';

export default class CountryController {
    public static async getCountries(req: ProtectedRequest, res: Response) {
        return new SuccessResponse(req.t('common.success'), countries).send(
            res,
            req
        );
    }

    public static async getTimeZone(req: ProtectedRequest, res: Response) {
        return new SuccessResponse(req.t('common.success'), timeZones).send(
            res,
            req
        );
    }
}

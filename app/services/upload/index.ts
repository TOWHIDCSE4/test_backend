import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

import { BadRequestError } from '../../core/ApiError';
import { StatusCode } from '../../core/ApiResponse';

export default class UploadServices {
    public static async uploadFile(path: string) {
        const new_file = fs.createReadStream(path);
        const form_data = new FormData();
        form_data.append('file', new_file);
        const url = `https://api.englishplus.vn/api/v1/st/admin/upload`;
        const response = await axios({
            method: 'POST',
            url: url,
            data: form_data,
            headers: form_data.getHeaders()
        });
        if (response.data.code != StatusCode.SUCCESS) {
            throw new BadRequestError(response.data.message);
        }
        return response.data.data;
    }
}

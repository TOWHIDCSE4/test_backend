import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import config from 'config';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from '../core/ApiError';
import { uidUtils } from '../utils/uid-utils';
const fs = require('fs');
const path = require('path');
const hashDir = require('../utils/hash-dir');
const logger = require('dy-logger');

export default class ImageController {
    /*
     * Summary: Get stream binary image
     * Role: Public
     * Request type: GET
     * Parameter:  - file: Id Image
     * Response:   - 200: success
     */
    public static async getImage(req: ProtectedRequest, res: Response) {
        let file = req.params.file;
        let link_img = hashDir.getHashPath(
            path.join(config.get('server.path.upload'), '/fullsize'),
            file,
            file
        );
        try {
            let img = fs.readFileSync(link_img);
            res.writeHead(200, {
                'Content-Type': 'image/jpg'
            });
            res.end(img, 'binary');
        } catch (e) {
            logger.error(e);
            throw new BadRequestError('File not found');
        }
    }
}

import { RoleRequest } from 'app-request';
import { Response, NextFunction } from 'express';
import { isArray } from 'lodash';
import { RoleCode } from '../const/role';

export default (roleCode: RoleCode | RoleCode[]) =>
    (req: RoleRequest, res: Response, next: NextFunction) => {
        if (isArray(roleCode)) req.required_role = roleCode;
        else req.required_role = [roleCode];
        next();
    };

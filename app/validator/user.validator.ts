import { body, param } from 'express-validator';
import { RoleCode } from '../const/role';
import AsyncHandler from '../core/async-handler';
import { ProtectedRequest } from 'app-request';
import { Request, Response, NextFunction } from 'express';
import {
    AccessTokenError,
    AuthFailureError,
    BadRequestError
} from '../core/ApiError';
import UserActions from '../actions/user';
export const createUserValidator = () => {
    return [
        body('id')
            .exists()
            .withMessage('id is required')
            .notEmpty()
            .withMessage('id not empty')
            .isInt()
            .withMessage('id must be integer')
            .toInt(),
        body('email')
            .exists()
            .withMessage('email is required')
            .notEmpty()
            .withMessage('email not empty'),
        body('username')
            .exists()
            .withMessage('username is required')
            .notEmpty()
            .withMessage('username not empty'),
        body('password')
            .exists()
            .withMessage('password is required')
            .notEmpty()
            .withMessage('password not empty'),
        body('first_name')
            .exists()
            .withMessage('first_name is required')
            .notEmpty()
            .withMessage('first_name not empty'),
        body('role')
            .exists()
            .withMessage('role is required')
            .notEmpty()
            .withMessage('role is required')
            .isIn(Object.values(RoleCode))
            .withMessage('role invalid'),
        body('is_verified_email')
            .exists()
            .withMessage('is_verified_email is required')
            .notEmpty()
            .withMessage('is_verified_email not empty')
            .isBoolean()
            .withMessage('is_verified_email must be boolean')
    ];
};

export const editUserValidator = () => {
    return [
        param('user_id')
            .exists()
            .withMessage('user_id is required')
            .notEmpty()
            .withMessage('user_id is required'),
        body('password')
            .optional()
            .exists()
            .withMessage('password is required')
            .notEmpty()
            .withMessage('password is required'),
        body('first_name')
            .optional()
            .exists()
            .withMessage('first_name is required')
            .notEmpty()
            .withMessage('first_name is required')
    ];
};
export const removeUserValidator = () => {
    return [
        param('user_id')
            .exists()
            .withMessage('user_id is required')
            .notEmpty()
            .withMessage('user_id is required')
    ];
};

export const validateStatusUser = () =>
    AsyncHandler(
        async (req: ProtectedRequest, res: Response, next: NextFunction) => {
            const user = req.user;
            if (user && user.is_active) {
                // kiểm tra lại trong database xem user có active không
                // sau cần làm cơ chế khác để chỉ cần verify ở token mà không cần trọc vô database
                const userDb = await UserActions.findOne({
                    _id: user._id,
                    is_active: true
                });
                if (userDb) {
                    return next();
                }
            }
            throw new BadRequestError(req.t('errors.teacher.inactive_client'));
        }
    );

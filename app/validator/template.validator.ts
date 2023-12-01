import { EnumTemplateType } from '../models/template';
import { body, param } from 'express-validator';

export const createTemplateValidator = () => {
    return [
        body('code')
            .exists()
            .withMessage('code is required')
            .notEmpty()
            .withMessage('code is required'),
        body('type')
            .exists()
            .withMessage('type is required')
            .notEmpty()
            .withMessage('type is required')
            .isIn(Object.values(EnumTemplateType))
            .withMessage('type invalid')
    ];
};
export const updateTemplateValidator = () => {
    return [
        param('_id')
            .exists()
            .withMessage('_id is required')
            .notEmpty()
            .withMessage('_id is required'),
        body('code')
            .exists()
            .withMessage('code is required')
            .notEmpty()
            .withMessage('code is required'),
        body('type')
            .exists()
            .withMessage('type is required')
            .notEmpty()
            .withMessage('type is required')
            .isIn(Object.values(EnumTemplateType))
            .withMessage('type invalid')
    ];
};
export const removeTemplateValidator = () => {
    return [
        param('_id')
            .exists()
            .withMessage('_id is required')
            .notEmpty()
            .withMessage('_id is required')
    ];
};

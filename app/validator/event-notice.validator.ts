import { body, param } from 'express-validator';
import { EnumEventNoticeType, EnumTargetType } from '../models/event-notice';

export const createEventNoticeValidator = () => {
    return [
        body('title')
            .exists()
            .withMessage('title is required')
            .notEmpty()
            .withMessage('title is required'),
        body('type')
            .exists()
            .withMessage('type is required')
            .notEmpty()
            .withMessage('type is required')
            .isIn(Object.values(EnumEventNoticeType))
            .withMessage('type invalid'),
        body('target')
            .exists()
            .withMessage('target is required')
            .notEmpty()
            .withMessage('target is required')
            .isArray()
            .withMessage('target is array')
            .isIn(Object.values(EnumTargetType))
            .withMessage('type invalid'),
        body('is_active')
            .exists()
            .withMessage('status is required')
            .notEmpty()
            .withMessage('status is required')
            .isBoolean()
            .withMessage('status invalid'),
        body('start_time_shown')
            .exists()
            .withMessage('start_time_shown is required')
            .notEmpty()
            .withMessage('start_time_shown is required')
            .isInt()
            .withMessage('start_time_shown invalid'),
        body('end_time_shown')
            .exists()
            .withMessage('end_time_shown is required')
            .notEmpty()
            .withMessage('end_time_shown is required')
            .isInt()
            .withMessage('end_time_shown invalid')
    ];
};
export const updateEventNoticeValidator = () => {
    return [
        param('_id')
            .exists()
            .withMessage('_id is required')
            .notEmpty()
            .withMessage('_id is required'),
        body('title')
            .exists()
            .withMessage('title is required')
            .notEmpty()
            .withMessage('title is required'),
        body('type')
            .exists()
            .withMessage('type is required')
            .notEmpty()
            .withMessage('type is required')
            .isIn(Object.values(EnumEventNoticeType))
            .withMessage('type invalid'),
        body('target')
            .exists()
            .withMessage('target is required')
            .notEmpty()
            .withMessage('target is required')
            .isArray()
            .withMessage('target is array')
            .isIn(Object.values(EnumTargetType))
            .withMessage('type invalid'),
        body('is_active')
            .exists()
            .withMessage('status is required')
            .notEmpty()
            .withMessage('status is required')
            .isBoolean()
            .withMessage('status invalid'),
        body('start_time_shown')
            .exists()
            .withMessage('start_time_shown is required')
            .notEmpty()
            .withMessage('start_time_shown is required')
            .isInt()
            .withMessage('start_time_shown invalid'),
        body('end_time_shown')
            .exists()
            .withMessage('end_time_shown is required')
            .notEmpty()
            .withMessage('end_time_shown is required')
            .isInt()
            .withMessage('end_time_shown invalid')
    ];
};
export const removeEventNoticeValidator = () => {
    return [
        param('_id')
            .exists()
            .withMessage('_id is required')
            .notEmpty()
            .withMessage('_id is required')
    ];
};

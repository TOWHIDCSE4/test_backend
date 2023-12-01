import { body, param } from 'express-validator';

export const removeCalendarValidator = () => {
    return [
        param('calendar_id')
            .exists()
            .withMessage('Params calendar_id is required')
            .notEmpty()
            .withMessage('Params calendar_id is required')
    ];
};

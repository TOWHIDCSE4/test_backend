import { body, param } from 'express-validator';

export const removeBookingValidator = () => {
    return [
        param('booking_id')
            .exists()
            .withMessage('Params booking_id is required')
            .notEmpty()
            .withMessage('Params booking_id is required')
    ];
};

import { body } from 'express-validator';

export const createMergedPackageValidator = () => {
    return [
        body('student_id')
            .exists({ checkFalsy: true, checkNull: true })
            .withMessage('student_id không được để trống'),
        body('package_one_id')
            .exists({ checkFalsy: true, checkNull: true })
            .withMessage('package_one_id không được để trống'),
        body('package_two_id')
            .exists({ checkFalsy: true, checkNull: true })
            .withMessage('package_two_id không được để trống')
    ];
};

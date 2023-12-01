import { check, validationResult, body } from 'express-validator';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from '../core/ApiError';

import { MAX_ASSESSMENT_POINT, MEMO_NOTE_FIELDS } from '../const/memo';
import { RoleCode } from '../const/role';

import { EnumCommentType } from '../models/comment-suggestion';
import { EnumScheduledMemoType } from '../models/scheduled-memo';

// Request Body Validator
export const registerValidator = () => {
    return [
        check('email').exists().withMessage('Email is required'),
        check('email').not().isEmpty().withMessage('Email is required'),
        check('email')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @'),
        check('email')
            .isLength({
                min: 3,
                max: 320
            })
            .withMessage('Email must be between 3 to 320 characters'),

        check('password').exists().withMessage('Password is required'),
        check('password').not().isEmpty().withMessage('Password is required'),
        check('password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number'),

        check('first_name').exists().withMessage('First Name is required'),
        check('first_name')
            .not()
            .isEmpty()
            .withMessage('First Name is required'),

        check('last_name').exists().withMessage('Last Name is required'),
        check('last_name').not().isEmpty().withMessage('Last Name is required'),

        check('username')
            .exists()
            .withMessage('Username is required')
            .not()
            .isEmpty()
            .withMessage('Username is required')
            .isLength({
                min: 4,
                max: 32
            })
            .withMessage('Username must be between 3 to 32 characters'),

        check('date_of_birth')
            .optional({ nullable: true })
            .isDate({ format: 'DD/MM/YYYY' })
            .withMessage('Not a valid date')
    ];
};

// Request Body Validator
export const registerCsmValidator = () => {
    return [
        check('email').exists().withMessage('Email is required'),
        check('email').not().isEmpty().withMessage('Email is required'),
        check('email')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @'),
        check('email')
            .isLength({
                min: 3,
                max: 320
            })
            .withMessage('Email must be between 3 to 320 characters'),

        check('password').exists().withMessage('Password is required'),
        check('password').not().isEmpty().withMessage('Password is required'),
        check('password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number'),

        check('username')
            .exists()
            .withMessage('Username is required')
            .not()
            .isEmpty()
            .withMessage('Username is required')
            .isLength({
                min: 4,
                max: 32
            })
            .withMessage('Username must be between 3 to 32 characters')
    ];
};

export const adminUserCreateValidator = () => {
    return [
        check('email')
            .exists()
            .withMessage('Email is required')
            .not()
            .isEmpty()
            .withMessage('Email is required')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 3, max: 320 })
            .withMessage('Email must be between 3 to 320 characters'),
        check('username')
            .exists()
            .withMessage('Username is required')
            .not()
            .isEmpty()
            .withMessage('Username is required')
            .isLength({ min: 3, max: 32 })
            .withMessage('Username must be between 3 to 32 characters'),
        check('first_name')
            .exists()
            .withMessage('First Name is required')
            .not()
            .isEmpty()
            .withMessage('First Name is required'),
        check('last_name')
            .exists()
            .withMessage('Last Name is required')
            .not()
            .isEmpty()
            .withMessage('Last Name is required'),
        check('role')
            .exists()
            .withMessage('Need a role in user creation')
            .isInt()
            .withMessage('Not a valid role for user')
            .toInt()
    ];
};

export const loginValidator = () => {
    return [
        check('email').exists().withMessage('Email is required'),
        check('password').exists().withMessage('Password is required'),
        check('email').not().isEmpty().withMessage('Email is required'),
        check('password').not().isEmpty().withMessage('Password is required'),
        // check('email').matches(/.+\@.+\..+/).withMessage('Email must contain @'),
        check('email')
            .isLength({
                min: 3,
                max: 320
            })
            .withMessage('Email must be between 3 to 320 characters'),
        check('password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number')
    ];
};

export const forgetPasswordValidator = () => {
    return [
        check('email').exists().withMessage('Email is required'),
        check('email').not().isEmpty().withMessage('Email is required'),
        check('email')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @'),
        check('email')
            .isLength({
                min: 3,
                max: 320
            })
            .withMessage('Email must be between 3 to 320 characters')
    ];
};

export const changePasswordValidator = () => {
    return [
        check('current_password').exists().withMessage('Password is required'),
        check('new_password').exists().withMessage('Password is required'),
        check('current_password')
            .not()
            .isEmpty()
            .withMessage('Password is required'),
        check('new_password')
            .not()
            .isEmpty()
            .withMessage('Password is required'),
        check('current_password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number'),
        check('new_password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number')
    ];
};

export const resetPasswordValidator = () => {
    return [
        check('new_password').exists().withMessage('Password is required'),
        check('new_password')
            .not()
            .isEmpty()
            .withMessage('Password is required'),
        check('new_password')
            .isLength({ min: 6 })
            .withMessage('Password must contain at least 6 characters')
            .matches(/\d/)
            .withMessage('Password must contain a number')
    ];
};

export const subjectValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty')
    ];
};

export const createPackageValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('description')
            .exists()
            .withMessage('Description is required')
            .not()
            .isEmpty()
            .withMessage('Description is not empty'),
        body('image')
            .exists()
            .withMessage('Image Preview is required')
            .not()
            .isEmpty()
            .withMessage('Image Preview is not empty'),
        body('price')
            .isInt({ min: 1 })
            .withMessage('Price must be number and greater 0')
            .toInt(),
        body('number_class')
            .isInt({ min: 1 })
            .withMessage('Number Classes must be number and greater 0')
            .toInt(),
        body('day_of_use')
            .isInt({ min: 1 })
            .withMessage('Day of use must be number and greater 0')
            .toInt()
    ];
};

export const editPackageValidator = () => {
    return [
        body('location_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid location_id')
            .toInt(),
        body('subject_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid subject_id')
            .toInt(),
        body('name')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('description')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Description is not empty'),
        body('image')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Image is not empty'),
        body('price')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Price must be number and greater 0')
            .toInt(),
        body('number_class')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Number classes must be number and greater 0')
            .toInt(),
        body('day_of_use')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Day of use must be number and greater 0')
            .toInt()
    ];
};

export const createCourseValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('description')
            .exists()
            .withMessage('Description is required')
            .not()
            .isEmpty()
            .withMessage('Description is not empty'),
        body('image')
            .exists()
            .withMessage('Image is required')
            .not()
            .isEmpty()
            .withMessage('Image is not empty'),
        body('tags')
            .optional({ nullable: true })
            .isArray()
            .withMessage('Invalid tag list')
    ];
};

export const editCourseValidator = () => {
    return [
        body('tags')
            .optional({ nullable: true })
            .isArray()
            .withMessage('Invalid tag list'),
        body('package_id_list')
            .optional({ nullable: true })
            .isArray()
            .withMessage('Invalid package list')
    ];
};

export const createCurriculumValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('description')
            .exists()
            .withMessage('Description is required')
            .not()
            .isEmpty()
            .withMessage('Description is not empty'),
        body('age_list')
            .exists()
            .withMessage('Age list is required')
            .isArray()
            .withMessage('Invalid age list')
    ];
};

export const editCurriculumValidator = () => {
    return [
        body('age_list')
            .optional({ nullable: true })
            .isArray()
            .withMessage('Invalid age list')
    ];
};

export const createLocationValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('currency')
            .exists()
            .withMessage('Currency is required')
            .not()
            .isEmpty()
            .withMessage('Currency is not empty'),
        body('percent_salary_student_absent')
            .exists()
            .withMessage('Percent salary student absent is required')
            .isNumeric()
            .withMessage('Percent salary student absent not number'),

        body('weekend_bonus')
            .exists()
            .withMessage('Weekend bonus is required')
            .isNumeric()
            .withMessage('Weekend bonus not number'),

        body('conversion_bonus')
            .exists()
            .withMessage('conversion_bonus is required')
            .isNumeric()
            .withMessage('conversion_bonus not number'),

        body('attendance_bonus')
            .exists()
            .withMessage('attendance_bonus is required')
            .isNumeric()
            .withMessage('attendance_bonus not number'),

        body('referral_bonus')
            .exists()
            .withMessage('referral_bonus is required')
            .isNumeric()
            .withMessage('referral_bonus not number'),

        body('percent_substitute_bonus')
            .exists()
            .withMessage('percent_substitute_bonus is required')
            .isNumeric()
            .withMessage('percent_substitute_bonus not number'),

        body('percent_absent_punish')
            .exists()
            .withMessage('percent_absent_punish is required')
            .isNumeric()
            .withMessage('percent_absent_punish not number'),

        body('percent_absent_punish_trial')
            .exists()
            .withMessage('percent_absent_punish_trial is required')
            .isNumeric()
            .withMessage('percent_absent_punish_trial not number'),

        body('percent_absent_punish_1h')
            .exists()
            .withMessage('percent_absent_punish_1h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_1h not number'),

        body('percent_absent_punish_2h')
            .exists()
            .withMessage('percent_absent_punish_2h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_2h not number'),

        body('percent_absent_punish_3h')
            .exists()
            .withMessage('percent_absent_punish_3h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_3h not number'),

        body('absent_punish_greater_3h')
            .exists()
            .withMessage('absent_punish_greater_3h is required')
            .isNumeric()
            .withMessage('absent_punish_greater_3h not number'),

        body('late_memo_punish')
            .exists()
            .withMessage('late_memo_punish is required')
            .isNumeric()
            .withMessage('late_memo_punish not number'),

        body('over_limit_punish')
            .exists()
            .withMessage('over_limit_punish is required')
            .isNumeric()
            .withMessage('over_limit_punish not number'),

        body('accept_time')
            .exists()
            .withMessage('Accept time is required')
            .isInt({ min: 1 })
            .withMessage('Accept time must be number and greater 0')
            .toInt(),
        body('cancel_time')
            .exists()
            .withMessage('Cancel time is required')
            .isInt({ min: 1 })
            .withMessage('Cancel time must be number and greater 0')
            .toInt()
    ];
};

export const editLocationValidator = () => {
    return [
        body('name')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('currency')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Currency is not empty'),

        body('percent_salary_student_absent')
            .exists()
            .withMessage('Percent salary student absent is required')
            .isNumeric()
            .withMessage('Percent salary student absent not number'),

        body('weekend_bonus')
            .exists()
            .withMessage('Weekend bonus is required')
            .isNumeric()
            .withMessage('Weekend bonus not number'),

        body('conversion_bonus')
            .exists()
            .withMessage('conversion_bonus is required')
            .isNumeric()
            .withMessage('conversion_bonus not number'),

        body('attendance_bonus')
            .exists()
            .withMessage('attendance_bonus is required')
            .isNumeric()
            .withMessage('attendance_bonus not number'),

        body('referral_bonus')
            .exists()
            .withMessage('referral_bonus is required')
            .isNumeric()
            .withMessage('referral_bonus not number'),

        body('percent_substitute_bonus')
            .exists()
            .withMessage('percent_substitute_bonus is required')
            .isNumeric()
            .withMessage('percent_substitute_bonus not number'),

        body('percent_absent_punish')
            .exists()
            .withMessage('percent_absent_punish is required')
            .isNumeric()
            .withMessage('percent_absent_punish not number'),

        body('percent_absent_punish_trial')
            .exists()
            .withMessage('percent_absent_punish_trial is required')
            .isNumeric()
            .withMessage('percent_absent_punish_trial not number'),

        body('percent_absent_punish_1h')
            .exists()
            .withMessage('percent_absent_punish_1h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_1h not number'),

        body('percent_absent_punish_2h')
            .exists()
            .withMessage('percent_absent_punish_2h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_2h not number'),

        body('percent_absent_punish_3h')
            .exists()
            .withMessage('percent_absent_punish_3h is required')
            .isNumeric()
            .withMessage('percent_absent_punish_3h not number'),

        body('absent_punish_greater_3h')
            .exists()
            .withMessage('absent_punish_greater_3h is required')
            .isNumeric()
            .withMessage('absent_punish_greater_3h not number'),

        body('late_memo_punish')
            .exists()
            .withMessage('late_memo_punish is required')
            .isNumeric()
            .withMessage('late_memo_punish not number'),

        body('over_limit_punish')
            .exists()
            .withMessage('over_limit_punish is required')
            .isNumeric()
            .withMessage('over_limit_punish not number'),

        body('accept_time')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Accept time must be number and greater 0')
            .toInt(),
        body('cancel_time')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Cancel time must be number and greater 0')
            .toInt()
    ];
};

export const unitValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty')
    ];
};

export const createBookingAdminValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 2, max: 3 })
            .withMessage('Not a valid status for create')
            .toInt()
    ];
};

export const createBookingStudentValidator = () => {
    return [
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('calendar_id')
            .exists()
            .withMessage('calendar_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('course_id')
            .exists()
            .withMessage('course_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('ordered_package_id')
            .exists()
            .withMessage('ordered_package_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('status')
            .not()
            .exists()
            .withMessage('Cannot set status on create'),
        body('teacher_note')
            .not()
            .exists()
            .withMessage('Student can only set student note'),
        body('admin_note')
            .not()
            .exists()
            .withMessage('Student can only set student note')
    ];
};

export const createBookingForUnmatchedRegularValidator = () => {
    return [
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('course_id')
            .exists()
            .withMessage('course_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('ordered_package_id')
            .exists()
            .withMessage('ordered_package_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('status')
            .not()
            .exists()
            .withMessage('Cannot set status on create'),
        body('teacher_note')
            .not()
            .exists()
            .withMessage('Student can only set student note'),
        body('admin_note')
            .not()
            .exists()
            .withMessage('Student can only set student note')
    ];
};

export const getTeachersValidator = () => {
    return [
        body('calendar.day_of_week')
            .optional({ nullable: true })
            .isInt({ min: 0, max: 6 })
            .withMessage('Not a valid day'),
        body('calendar.hour_of_day')
            .optional({ nullable: true })
            .isInt({ min: 0, max: 23 })
            .withMessage('Not a valid hour')
    ];
};

export const editBookingValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 8 })
            .withMessage('Not a valid status')
            .toInt(),
        body('student_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('teacher_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('calendar_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('course_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('ordered_package_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt()
    ];
};

export const rateBookingValidator = () => {
    return [
        body('rating')
            .exists()
            .withMessage('Need a rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Not a valid rating')
            .toInt()
    ];
};

export const newTrialBookingValidator = () => {
    return [
        body('ordered_package_id')
            .exists()
            .withMessage('order_package_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('unit_id')
            .exists()
            .withMessage('unit_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('start_time')
            .exists()
            .withMessage('start time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt()
    ];
};

export const newIeltsBookingValidator = () => {
    return [
        body('ordered_package_id')
            .exists()
            .withMessage('order_package_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('unit_id')
            .exists()
            .withMessage('unit_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('start_time')
            .exists()
            .withMessage('start time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt()
    ];
};

export const newTrialBookingValidatorForCrm = () => {
    return [
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('unit_id')
            .exists()
            .withMessage('unit_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('username').exists().withMessage('username is required'),
        body('start_time')
            .exists()
            .withMessage('start time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt()
    ];
};

export const newTrialTestIeltsResultValidatorForCrm = () => {
    return [
        body('unit_id')
            .exists()
            .withMessage('unit_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('username').exists().withMessage('username is required')
    ];
};

export const editTrialBookingValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 5 })
            .withMessage('Invalid status')
            .toInt(),
        body('admin_assessment.*.keyword')
            .exists()
            .withMessage('Need a keyword for an assessment')
            .notEmpty()
            .withMessage('keyword is not empty'),
        body('admin_assessment.*.point')
            .exists()
            .withMessage('Require a point')
            .isInt({ min: 0, max: MAX_ASSESSMENT_POINT })
            .withMessage('Invalid point')
            .toInt()
        // body('teacher_assessment.*.keyword')
        //     .exists()
        //     .withMessage('Need a keyword for an assessment')
        //     .notEmpty()
        //     .withMessage('keyword is not empty'),
        // body('teacher_assessment.*.point')
        //     .exists()
        //     .withMessage('Require a point')
        //     .isInt({ min: 0, max: MAX_ASSESSMENT_POINT })
        //     .withMessage('Invalid point')
        //     .toInt()
    ];
};

export const updateRecordBookingValidator = () => {
    return [
        body('record_link')
            .exists()
            .withMessage('Need the Record link')
            .notEmpty()
            .withMessage('Record link is not empty')
    ];
};

export const newCommentSuggestionValidator = () => {
    return [
        body('keyword')
            .exists()
            .withMessage('Need a keyword to create a new suggestion')
            .notEmpty()
            .withMessage('keyword is not empty')
            .isIn(MEMO_NOTE_FIELDS)
            .withMessage('invalid keyword'),
        body('type')
            .exists()
            .withMessage('Need a type for the new suggestion')
            .notEmpty()
            .withMessage('type is not empty')
            .isIn(Object.values(EnumCommentType))
            .withMessage('invalid type'),
        body('min_point')
            .exists()
            .withMessage('Need a point range for the new suggestion')
            .isInt({ min: 0 })
            .withMessage('invalid point'),
        body('max_point')
            .exists()
            .withMessage('Need a point range for the new suggestion')
            .isInt({ min: 0 })
            .withMessage('invalid point'),
        body('en_comment')
            .exists()
            .withMessage('Need the comment suggestion')
            .notEmpty()
            .withMessage('comment is not empty'),
        body('vi_comment')
            .exists()
            .withMessage('Need the comment suggestion')
            .notEmpty()
            .withMessage('comment is not empty')
    ];
};

export const adminOrderValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 3 })
            .withMessage('Not a valid status')
            .toInt(),
        body('type')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 3 })
            .withMessage('Not a valid type')
            .toInt(),
        body('price')
            .if(body('type').equals('3'))
            .notEmpty()
            .withMessage('Price needed')
            .isInt()
            .withMessage('Not a valid price')
            .toInt(),
        body('number_class')
            .if(body('type').equals('3'))
            .notEmpty()
            .withMessage('Number of class needed')
            .isInt()
            .withMessage('Not a valid number')
            .toInt()
    ];
};

export const adminPreOrderRevenueValidator = () => {
    return [
        body('revenue')
            .exists()
            .withMessage('Revenue is required')
            .not()
            .isEmpty()
            .withMessage('Revenue is required')
    ];
};

export const sendMailValidator = () => {
    return [
        check('email')
            .exists()
            .withMessage('Email is required')
            .not()
            .isEmpty()
            .withMessage('Email is required')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 3, max: 320 })
            .withMessage('Email must be between 3 to 320 characters')
    ];
};

export const sendUnicastMailValidator = () => {
    return [
        check('email')
            .exists()
            .withMessage('Email is required')
            .not()
            .isEmpty()
            .withMessage('Email is required')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 3, max: 320 })
            .withMessage('Email must be between 3 to 320 characters'),
        check('subject')
            .exists()
            .withMessage('Email subject is required')
            .not()
            .isEmpty()
            .withMessage('Email subject is required'),
        check('body')
            .exists()
            .withMessage('Email body is required')
            .not()
            .isEmpty()
            .withMessage('Email body is required')
    ];
};

export const sendMulticastMailValidator = () => {
    return [
        check('emails').exists().withMessage('Email list is required'),
        check('emails.*')
            .not()
            .isEmpty()
            .withMessage('Email is required')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 3, max: 320 })
            .withMessage('Email must be between 3 to 320 characters')
    ];
};

export const changeTeacherRegularRequestValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 3 })
            .withMessage('Not a valid status')
            .toInt()
    ];
};

export const newTeacherAbsentRequestValidator = () => {
    return [
        body('start_time')
            .exists()
            .withMessage('start time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt(),
        body('end_time')
            .exists()
            .withMessage('end time is required')
            .isInt()
            .withMessage('Invalid end time')
            .toInt()
    ];
};

export const changeTeacherAbsentRequestValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 4 })
            .withMessage('Invalid status')
            .toInt(),
        body('start_time')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid start_time')
            .toInt(),
        body('end_time')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid end_time')
            .toInt()
    ];
};

export const newStudentReservationRequestValidator = () => {
    return [
        body('ordered_package_id')
            .exists()
            .withMessage('ordered_package_id is required')
            .isInt()
            .withMessage('Invalid ordered package ID')
            .toInt(),
        body('start_time')
            .exists()
            .withMessage('start time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt(),
        body('end_time')
            .exists()
            .withMessage('end time is required')
            .isInt()
            .withMessage('Invalid end time')
            .toInt()
    ];
};

export const changeStudentReservationRequestValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 5 })
            .withMessage('Invalid status')
            .toInt(),
        body('price')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid price')
            .toInt(),
        body('number_of_days')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid start_time')
            .toInt()
    ];
};

export const newStudentExtensionRequestValidator = () => {
    return [
        body('ordered_package_id')
            .exists()
            .withMessage('ordered_package_id is required')
            .isInt()
            .withMessage('Invalid ordered package ID')
            .toInt()
    ];
};

export const changeStudentExtensionRequestValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 5 })
            .withMessage('Invalid status')
            .toInt(),
        body('price')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid price')
            .toInt(),
        body('start_time')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid start_time')
            .toInt(),
        body('end_time')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid end_time')
            .toInt()
    ];
};
export const changeTeacherUpgradeRequestValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 4 })
            .withMessage('Invalid status')
            .toInt()
    ];
};

export const roleValidator = () => {
    const roleApp = Object.values(RoleCode).filter((k) => typeof k == 'number');
    return [
        check('role').exists().withMessage('Role is required'),
        check('role').isIn(roleApp).withMessage('Invalid role')
    ];
};

export const createAdminValidate = () => {
    return [
        check('username')
            .exists()
            .withMessage('Username là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Username là bắt buộc')
            .isLength({
                min: 4,
                max: 32
            })
            .withMessage('Username must be between 3 to 32 characters'),
        check('password')
            .exists()
            .withMessage('Password là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Password là bắt buộc'),
        check('fullname').not().isEmpty().withMessage('Họ tên bắt buộc'),
        check('email')
            .exists()
            .withMessage('Email là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Email là bắt buộc')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 4, max: 32 })
            .withMessage('Email nên có từ 3 - 32 ký tự'),
        check('gender')
            .optional()
            .not()
            .isEmpty()
            .withMessage('Giới tính là bắt buộc')
            .isIn([0, 1, 2]),
        check('bod')
            .optional()
            .exists()
            .withMessage('Ngày sinh là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Ngày sinh sai định dạng'),
        check('phoneNumber')
            .optional()
            .exists()
            .withMessage('Số điện thoại là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Số điện thoại sai định dạng'),
        check('IDCard')
            .optional()
            .exists()
            .withMessage('Số CMND/CCCD là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Số CMND/CCCD sai định dạng'),
        check('IDCardBOD')
            .optional()
            .exists()
            .withMessage('Ngày cấp là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Ngày cấp sai định dạng'),
        check('bankingNumber')
            .optional()
            .exists()
            .withMessage('Số tài khoản là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Số tài khoản sai định dạng'),
        check('bankingName')
            .optional()
            .exists()
            .withMessage('Tên ngân hàng là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Tên ngân hàng sai định dạng'),

        check('is_active').exists().withMessage('Active là bắt buộc')
    ];
};

export const updateAdminValidate = () => {
    return [
        check('username')
            .optional()
            .exists()
            .withMessage('Username là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Username là bắt buộc')
            .isLength({
                min: 4,
                max: 32
            })
            .withMessage('Username must be between 3 to 32 characters'),
        check('fullname')
            .optional()
            .not()
            .isEmpty()
            .withMessage('Họ tên bắt buộc'),
        check('email')
            .exists()
            .withMessage('Email là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Email là bắt buộc')
            .matches(/.+\@.+\..+/)
            .withMessage('Email must contain @')
            .isLength({ min: 4, max: 32 })
            .withMessage('Email nên có từ 3 - 32 ký tự'),
        check('gender')
            .optional()
            .not()
            .isEmpty()
            .withMessage('Giới tính là bắt buộc')
            .isIn([0, 1, 2]),
        check('bod')
            .optional()
            .exists()
            .withMessage('Ngày sinh là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Ngày sinh là bắt buộc'),
        check('phoneNumber')
            .optional()
            .exists()
            .withMessage('Số điện thoại là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Số điện thoại là bắt buộc'),
        check('IDCard')
            .optional()
            .exists()
            .withMessage('Số CMND/CCCD là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Số CMND/CCCD là bắt buộc'),
        check('IDCardBOD')
            .optional()
            .exists()
            .withMessage('Ngày cấp là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Ngày cấp sai định dạng'),
        check('bankingNumber')
            .optional()
            .exists()
            .withMessage('Số tài khoản là bắt buộc')
            .not()
            .isEmpty()
            .isInt()
            .withMessage('Số tài khoản là bắt buộc'),
        check('bankingName')
            .optional()
            .exists()
            .withMessage('Tên ngân hàng là bắt buộc')
            .not()
            .isEmpty()
            .withMessage('Tên ngân hàng là bắt buộc'),
        check('is_active').optional().exists().withMessage('Active là bắt buộc')
    ];
};

export const updatePermissionAdminValidate = () => {
    return [
        check('permission')
            .exists()
            .withMessage('Quyền không được để rỗng')
            .isArray()
            .withMessage('Quyền không được để rỗng')
    ];
};
// bod: number;
// phoneNumber: string;
// IDCard: string;
// bankingNumber: number;
// bankingName: string;

export const createRegularCalendarValidator = () => {
    return [
        body('student_id')
            .exists()
            .withMessage('student_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('course_id')
            .exists()
            .withMessage('course_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('ordered_package_id')
            .exists()
            .withMessage('ordered_package_id is required')
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('regular_start_time')
            .exists()
            .withMessage('regular_start_time is required')
            .isInt()
            .withMessage('Invalid start time')
            .toInt()
    ];
};

export const changeRegularCalendarValidator = () => {
    return [
        body('status')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 4 })
            .withMessage('Not a valid status')
            .toInt(),
        body('teacher_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('course_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt(),
        body('ordered_package_id')
            .optional({ nullable: true })
            .isInt()
            .isInt()
            .withMessage('Invalid ID')
            .toInt()
    ];
};

export const createTeacherLevelValidator = () => {
    return [
        body('name')
            .exists()
            .withMessage('Name is required')
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('hourly_rates')
            .exists()
            .withMessage('Rates required')
            .isArray()
            .withMessage('Invalid rate array'),
        body('min_calendar_per_circle')
            .exists()
            .withMessage('Min open slots per circle required')
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('min_peak_time_per_circle')
            .exists()
            .withMessage('Min peak time slots per circle required')
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('max_missed_class_per_circle')
            .exists()
            .withMessage('Max missed class per circle required')
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('max_absent_request_per_circle')
            .exists()
            .withMessage('Max absent request per circle required')
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('class_accumulated_for_promotion')
            .exists()
            .withMessage('Accumulated classes for promotion required')
            .isInt()
            .withMessage('Invalid number')
            .toInt()
    ];
};

export const changeTeacherLevelValidator = () => {
    return [
        body('name')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Name is not empty'),
        body('is_active')
            .optional({ nullable: true })
            .isBoolean()
            .withMessage('Active or inactive? Only 2 options')
            .toBoolean(),
        body('hourly_rates')
            .optional({ nullable: true })
            .isArray()
            .withMessage('Invalid rate array'),
        body('min_calendar_per_circle')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('min_peak_time_per_circle')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('max_missed_class_per_circle')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('max_absent_request_per_circle')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid number')
            .toInt(),
        body('class_accumulated_for_promotion')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid number')
            .toInt()
    ];
};

export const updateTeacherRatingBooking = () => {
    return [
        body('vocabulary')
            .exists()
            .withMessage('vocabulary is required')
            .isInt({ min: 0, max: 10 })
            .withMessage('Invalid vocabulary')
            .toInt(),
        body('grammar')
            .exists()
            .withMessage('vocabulary is required')
            .isInt({ min: 0, max: 10 })
            .withMessage('Invalid vocabulary')
            .toInt(),
        body('listening')
            .exists()
            .withMessage('vocabulary is required')
            .isInt({ min: 0, max: 10 })
            .withMessage('Invalid vocabulary')
            .toInt(),
        body('speaking')
            .exists()
            .withMessage('vocabulary is required')
            .isInt({ min: 0, max: 10 })
            .withMessage('Invalid vocabulary')
            .toInt(),
        body('reading')
            .exists()
            .withMessage('vocabulary is required')
            .isInt({ min: 0, max: 10 })
            .withMessage('Invalid vocabulary')
            .toInt()
    ];
};

export const createTrialTeacher = () => {
    return [
        body('teacher_id')
            .exists()
            .withMessage('teacher_id is required')
            .isInt()
            .withMessage('Invalid teacher id')
    ];
};

export const createScheduledMemoValidator = () => {
    return [
        body('type')
            .exists()
            .withMessage('Type is required')
            .isInt()
            .withMessage('Invalid type')
            .toInt(),
        body('month')
            .if(body('type').equals(EnumScheduledMemoType.MONTHLY.toString()))
            .exists()
            .withMessage('Month needed')
            .isInt({ min: 1, max: 12 })
            .withMessage('Invalid month')
            .toInt(),
        body('month')
            .if(body('type').equals(EnumScheduledMemoType.COURSE.toString()))
            .not()
            .exists()
            .withMessage('Invalid month'),
        body('year')
            .if(body('type').equals(EnumScheduledMemoType.MONTHLY.toString()))
            .exists()
            .withMessage('Year needed')
            .isInt()
            .withMessage('Invalid year')
            .toInt(),
        body('year')
            .if(body('type').equals(EnumScheduledMemoType.COURSE.toString()))
            .not()
            .exists()
            .withMessage('Invalid year'),
        body('course_id')
            .if(body('type').equals(EnumScheduledMemoType.MONTHLY.toString()))
            .not()
            .exists()
            .withMessage('Invalid course ID'),
        body('course_id')
            .if(body('type').equals(EnumScheduledMemoType.COURSE.toString()))
            .exists()
            .withMessage('Course ID needed')
            .isInt()
            .withMessage('Invalid course ID')
            .toInt()
    ];
};

export const updateScheduledMemoByTeacher = () => {
    return [
        body('attendance_comment')
            .exists()
            .withMessage('Comment is required')
            .not()
            .isEmpty()
            .withMessage('Comment is not empty'),
        body('attitude_comment')
            .exists()
            .withMessage('Comment is required')
            .not()
            .isEmpty()
            .withMessage('Comment is not empty'),
        body('homework_comment')
            .exists()
            .withMessage('Comment is required')
            .not()
            .isEmpty()
            .withMessage('Comment is not empty')
    ];
};

export const newCouponValidator = () => {
    return [
        body('title')
            .exists()
            .withMessage('Title is required')
            .not()
            .isEmpty()
            .withMessage('Title is not empty'),
        body('code')
            .exists()
            .withMessage('Code is required')
            .not()
            .isEmpty()
            .withMessage('Code is not empty'),
        body('start_time_applied')
            .exists()
            .withMessage('start time to applied is required')
            .isInt()
            .withMessage('Invalid start time to applied')
            .toInt(),
        body('end_time_applied')
            .exists()
            .withMessage('end time to applied is required')
            .isInt()
            .withMessage('Invalid end time to applied')
            .toInt(),
        body('start_time_shown')
            .exists()
            .withMessage('start time to shown is required')
            .isInt()
            .withMessage('Invalid start time to applied')
            .toInt(),
        body('end_time_shown')
            .exists()
            .withMessage('end time to shown is required')
            .isInt()
            .withMessage('Invalid end time to applied')
            .toInt(),
        body('type')
            .exists()
            .withMessage('type is required')
            .isInt({ min: 1, max: 2 })
            .withMessage('Invalid type')
            .toInt(),
        body('percentage_off')
            .exists()
            .withMessage('percentage off is required')
            .isFloat({ min: 1, max: 100 })
            .withMessage('Invalid percentage off')
            .toFloat(),
        body('package_type')
            .exists()
            .withMessage('package_type is required')
            .isInt({ min: 1, max: 4 })
            .withMessage('Invalid package type')
            .toInt(),
        body('student_type')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 3 })
            .withMessage('Invalid student type')
            .toInt(),
        body('min_age')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Invalid min age')
            .toInt(),
        body('max_age')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Invalid max age')
            .toInt()
    ];
};

export const editCouponValidator = () => {
    return [
        body('id').not().exists().withMessage('Invalid field'),
        body('title')
            .optional({ nullable: true })
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Title is not empty'),
        body('code')
            .optional({ nullable: true })
            .not()
            .isEmpty()
            .withMessage('Code is not empty'),
        body('start_time_applied')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid start time to applied')
            .toInt(),
        body('end_time_applied')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid end time to applied')
            .toInt(),
        body('start_time_shown')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid start time to applied')
            .toInt(),
        body('end_time_shown')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Invalid end time to applied')
            .toInt(),
        body('type')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 2 })
            .withMessage('Invalid type')
            .toInt(),
        body('percentage_off')
            .optional({ nullable: true })
            .isFloat({ min: 1, max: 100 })
            .withMessage('Invalid percentage off')
            .toFloat(),
        body('package_type')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 2 })
            .withMessage('Invalid package type')
            .toInt(),
        body('student_type')
            .optional({ nullable: true })
            .isInt({ min: 1, max: 2 })
            .withMessage('Invalid student type')
            .toInt(),
        body('min_age')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Invalid min age')
            .toInt(),
        body('max_age')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('Invalid max age')
            .toInt()
    ];
};

// Request Query Params Validator

export default () => (req: Request, res: Response, next: NextFunction) => {
    try {
        const errors = validationResult(req).array();
        if (errors.length === 0) return next();

        const message = errors[0].msg;
        next(new BadRequestError(message));
    } catch (error) {
        next(error);
    }
};

export * from './template.validator';
export * from './event-notice.validator';
export * from './user.validator';
export * from './calendar.validator';
export * from './order.validator';
export * from './regular-calendar.validator';
export * from './booking.validator';

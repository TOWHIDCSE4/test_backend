import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, InternalError } from '../core/ApiError';
import CounterActions from '../actions/counter';
import CouponActions from '../actions/coupon';
import CourseActions from '../actions/course';
import LocationActions from '../actions/location';
import OrderedPackageActions from '../actions/ordered-package';
import PackageActions from '../actions/package';
import SubjectActions from '../actions/subject';
import { EnumCouponType } from '../models/coupon';
import Package from '../models/package';
import { EnumStudentType } from '../models/student';
import {
    createAliasName,
    createSlugsName
} from '../utils/create-alias-name-utils';
import { DEFAULT_SUBJECT_ID } from '../const/default-id';
import { EnumPackageOrderType } from '../const/package';
import OrderedPackage from '../models/ordered-package';
import { DAY_TO_MS } from '../const/date-time';
import moment from 'moment';
import LogServices, { EnumTypeChangeData } from '../services/logger';
const pickUpData = [
    '_id',
    'id',
    'location_id',
    'type',
    'subject_id',
    'name',
    'alias',
    'slug',
    'description',
    'price',
    'number_class',
    'day_of_use',
    'is_active',
    'is_support',
    'image',
    'expired_time',
    'new_student_coupon',
    'renew_student_coupon'
];
export default class PackageController {
    // With role Admin call API
    /*
     * Summary: Administrator lấy danh sách gói học phí
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */
    public static async getPackages(req: ProtectedRequest, res: Response) {
        const {
            page_size,
            page_number,
            search,
            location_id,
            subject_id,
            number_class,
            type,
            is_active
        } = req.query;

        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            location_id: parseInt(location_id as string),
            subject_id: parseInt(subject_id as string),
            number_class: parseInt(number_class as string),
            search: search as string,
            type: parseInt(type as string)
        };

        if (is_active) {
            filter.is_active = is_active === 'true';
        }

        const packages = await PackageActions.findAllAndPaginated2(filter);
        const temp = packages.map((p: any) => {
            let number_ordered_packages = 0;
            if (p?.ordered_packages?.length > 0) {
                number_ordered_packages = p?.ordered_packages.filter(
                    (op: OrderedPackage) => {
                        if (op.number_class > 0) {
                            if (!op.activation_date) {
                                return true;
                            }
                            const now = new Date();
                            if (
                                op.activation_date + op.day_of_use * DAY_TO_MS >
                                parseInt(moment(now).format('X')) * 1000
                            ) {
                                return true;
                            }
                        }

                        return false;
                    }
                ).length;

                delete p.ordered_packages;
            }

            p.number_ordered_packages = number_ordered_packages;

            if (p?.locations?.length > 0) {
                p.location = p.locations[0];
            }
            return p;
        });
        const count = await PackageActions.count(filter);

        const res_payload = {
            data: temp,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    // With role Student call API
    /*
     * Summary: Học viên lấy danh sách gói học phí
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     * Response:   - 200: success: Lay duoc danh sach
     */
    public static async getPackagesByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const {
            page_size,
            page_number,
            search,
            location_id,
            number_class,
            subject_id,
            type,
            is_show_on_student_page
        } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            location_id: parseInt(location_id as string),
            subject_id: parseInt(subject_id as string),
            number_class: parseInt(number_class as string),
            type: parseInt(type as string),
            search: search as string,
            is_active: true
        };
        if (is_show_on_student_page) {
            if (is_show_on_student_page == 'true') {
                filter.is_show_on_student_page = true;
            } else if (is_show_on_student_page == 'false') {
                filter.is_show_on_student_page = false;
            } else {
                filter.is_show_on_student_page = is_show_on_student_page;
            }
        }
        const packages = await PackageActions.findAllAndPaginatedForUser(
            filter
        );
        const count = await PackageActions.count(filter);
        const res_payload = {
            data: packages,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    // With role Admin call API
    /*
     * Summary: Admin tạo một gói học phí mới
     * Request type: POST
     * Body:       - name: Tên gói học phí
     *             - location_id: Khu vuc cua giao vien
     *             - subject_id: Mon hoc
     *             - description: Mô tả về gói học phí
     *             - price: Giá gói học phí
     *             - discount: Giảm giá
     *             - number_class: Số buổi học
     *             - day_of_use: Số ngày sử dụng
     *             - image: Url ảnh preview
     * Response:   - 200: success: Tao thanh cong
     *             - 400: bad request: Trung ten môn học
     */
    public static async createPackage(req: ProtectedRequest, res: Response) {
        const {
            name,
            location_id,
            subject_id,
            description,
            price,
            type,
            number_class,
            day_of_use,
            image,
            new_student_coupon_code,
            renew_student_coupon_code,
            learning_frequency_type,
            is_show_on_student_page
        } = req.body;
        const alias = createAliasName(name);
        const slug = createSlugsName(name);
        const pack = await PackageActions.findOne({ alias });
        if (pack) throw new BadRequestError(req.t('errors.package.name_exist'));

        let location = null;
        if (location_id !== -1) {
            location = await LocationActions.findOne({
                id: parseInt(location_id as string)
            });
            if (!location)
                throw new BadRequestError(req.t('errors.location.not_found'));
        }

        let subject;
        if (subject_id) {
            subject = await SubjectActions.findOne({
                id: parseInt(subject_id as string),
                is_active: true
            });
            if (!subject) {
                throw new BadRequestError(req.t('errors.subject.not_found'));
            }
        } else {
            subject = await SubjectActions.findOne({
                id: DEFAULT_SUBJECT_ID,
                is_active: true
            });
            if (!subject) {
                throw new InternalError(req.t('errors.subject.not_found'));
            }
        }

        let new_student_coupon = null;
        if (new_student_coupon_code) {
            new_student_coupon = await CouponActions.findOne({
                code: new_student_coupon_code,
                type: [EnumCouponType.DISCOUNT],
                package_type: [type],
                student_type: [EnumStudentType.NEW]
            });
            if (!new_student_coupon) {
                throw new BadRequestError(req.t('errors.coupon.not_found'));
            }
        }
        let renew_student_coupon = null;
        if (renew_student_coupon_code) {
            renew_student_coupon = await CouponActions.findOne({
                code: renew_student_coupon_code,
                type: [EnumCouponType.DISCOUNT],
                package_type: [type],
                student_type: [EnumStudentType.RENEW]
            });
            if (!renew_student_coupon) {
                throw new BadRequestError(req.t('errors.coupon.not_found'));
            }
        }

        /* Set expired date 30 days from now on */
        const expired_time = new Date();
        expired_time.setDate(expired_time.getDate() + 30);

        const counter = await CounterActions.findOne();
        const id = counter.package_id;
        await PackageActions.create({
            name,
            alias,
            slug,
            id,
            location_id: parseInt(location_id as string),
            subject_id: subject_id
                ? parseInt(subject_id as string)
                : DEFAULT_SUBJECT_ID,
            is_active: true,
            is_support: true,
            description,
            price: parseInt(price as string),
            number_class,
            day_of_use,
            expired_time,
            location,
            subject,
            type,
            image,
            new_student_coupon,
            renew_student_coupon,
            learning_frequency_type,
            is_show_on_student_page
        } as Package);
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async getPackageInfo(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const pack = await PackageActions.findOne({
            id: parseInt(id as string)
        });
        if (!pack) throw new BadRequestError(req.t('errors.package.not_found'));
        return new SuccessResponse('success', pack).send(res, req);
    }

    public static async getOrderedPackageByPackageId(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.params;

        const items = await PackageActions.findOrderedPackagesByPackageId(
            parseInt(id as string)
        );
        let result = [];
        if (items.length > 0) {
            result = items[0]?.ordered_packages || [];
        }

        if (result.length > 0) {
            result = result.filter((op: OrderedPackage) => {
                if (op.number_class > 0) {
                    if (!op.activation_date) {
                        return true;
                    }
                    const now = new Date();
                    if (
                        op.activation_date + op.day_of_use * DAY_TO_MS >
                        parseInt(moment(now).format('X')) * 1000
                    ) {
                        return true;
                    }
                }

                return false;
            });
        }

        return new SuccessResponse('success', result).send(res, req);
    }

    public static async editPackage(req: ProtectedRequest, res: Response) {
        const { id } = req.params;
        const diff = { ...req.body };
        const pack = await PackageActions.findOne({
            id: parseInt(id as string)
        });

        if (!pack) throw new BadRequestError(req.t('errors.package.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'PackageModel',
            pack,
            pickUpData
        );
        const alias = createAliasName(diff.name);
        if (alias !== pack.alias) {
            const check_name = await PackageActions.findOne({ alias });
            if (check_name)
                throw new BadRequestError(req.t('errors.package.name_exist'));
        }
        if (diff.location_id && diff.location_id !== -1) {
            diff.location = await LocationActions.findOne({
                id: parseInt(diff.location_id as string)
            });
            if (!diff.location)
                throw new BadRequestError(req.t('errors.location.not_found'));
            diff.location_id = parseInt(diff.location_id as string);
        } else {
            diff.location = pack.location;
            diff.location_id = pack.location_id;
        }

        diff.subject = null;
        if (diff.subject_id) {
            diff.subject = await SubjectActions.findOne({
                id: diff.subject_id,
                is_active: true
            });
            if (!diff.subject) {
                throw new BadRequestError(req.t('errors.subject.not_found'));
            }
        }

        if (diff.new_student_coupon_code) {
            if (
                (pack.new_student_coupon &&
                    pack.new_student_coupon.code !=
                        diff.new_student_coupon_code) ||
                !pack.new_student_coupon
            ) {
                diff.new_student_coupon = await CouponActions.findOne({
                    code: diff.new_student_coupon_code,
                    type: [EnumCouponType.DISCOUNT],
                    package_type: [pack.type],
                    student_type: [EnumStudentType.NEW]
                });
                if (!diff.new_student_coupon) {
                    throw new BadRequestError(req.t('errors.coupon.not_found'));
                }
                delete diff.new_student_coupon_code;
            }
        } else if (diff.new_student_coupon_code == null) {
            diff.new_student_coupon = null;
        }
        if (diff.renew_student_coupon_code) {
            if (
                (pack.renew_student_coupon &&
                    pack.renew_student_coupon.code !=
                        diff.renew_student_coupon_code) ||
                !pack.renew_student_coupon
            ) {
                diff.renew_student_coupon = await CouponActions.findOne({
                    code: diff.renew_student_coupon_code,
                    type: [EnumCouponType.DISCOUNT],
                    package_type: [pack.type],
                    student_type: [EnumStudentType.RENEW]
                });
                if (!diff.renew_student_coupon) {
                    throw new BadRequestError(req.t('errors.coupon.not_found'));
                }
                delete diff.renew_student_coupon_code;
            }
        } else if (diff.renew_student_coupon_code == null) {
            diff.renew_student_coupon = null;
        }

        if (diff.hasOwnProperty('is_active')) {
            diff.is_active = !!diff.is_active;
        }

        const new_data = await PackageActions.update(pack._id, {
            ...diff
        } as Package);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'PackageModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async removePackage(req: ProtectedRequest, res: Response) {
        const id = parseInt(req.params.id as string);
        const res_payload: any = {
            ok: true
        };
        const total_orders = await OrderedPackageActions.count({
            package_id: id
        });
        const pack = await PackageActions.findOne({ id });
        if (total_orders > 0) {
            if (!pack) {
                throw new InternalError('errors.oder.package_not_found');
            }
            const package_inactive = {
                is_active: false
            };
            await CourseActions.removeAPackageFromAllCourses(pack._id, id);
            await PackageActions.update(pack._id, {
                ...package_inactive
            } as Package);
            res_payload.warning = req.t('success.package.deactivate');
        } else {
            if (pack) {
                await CourseActions.removeAPackageFromAllCourses(pack._id, id);
                await PackageActions.remove(pack._id);
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getAllPackages(req: ProtectedRequest, res: Response) {
        const packages = await PackageActions.findAll({});
        const res_payload = {
            data: packages
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    public static async checkDiscountOfAPackageForAStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { package_id } = req.params;
        let user_id = null;
        if (req.user && req.user.isAdmin) {
            user_id = parseInt(req.query.user_id as string);
        } else {
            user_id = req.user.id;
        }
        const res_payload = {
            discount: 0
        };
        if (user_id) {
            const pack = await PackageActions.findOne({
                id: parseInt(package_id as string),
                is_active: true
            });
            if (pack) {
                const current_moment = new Date().getTime();
                const check_renew_student = await OrderedPackageActions.count({
                    user_id,
                    type: [
                        EnumPackageOrderType.PREMIUM,
                        EnumPackageOrderType.STANDARD
                    ],
                    activation_date: { $ne: null }
                });
                if (check_renew_student > 0) {
                    if (
                        pack.renew_student_coupon &&
                        pack.renew_student_coupon.start_time_applied <=
                            current_moment &&
                        pack.renew_student_coupon.end_time_applied >=
                            current_moment
                    ) {
                        res_payload.discount += _.round(
                            (pack.price *
                                pack.renew_student_coupon.percentage_off) /
                                100,
                            -3
                        );
                    }
                } else {
                    if (
                        pack.new_student_coupon &&
                        pack.new_student_coupon.start_time_applied <=
                            current_moment &&
                        pack.new_student_coupon.end_time_applied >=
                            current_moment
                    ) {
                        res_payload.discount += _.round(
                            (pack.price *
                                pack.new_student_coupon.percentage_off) /
                                100,
                            -3
                        );
                    }
                }
            }
        }
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
}

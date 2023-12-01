import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import _ from 'lodash';
import { NotFoundResponse, SuccessResponse } from './../core/ApiResponse';
import { BadRequestError, NotFoundError } from '../core/ApiError';
import OrderActions from '../actions/order';
import PreOrderActions from '../actions/pre-order';
import PackageActions from '../actions/package';
import CounterActions from '../actions/counter';
import CouponActions from '../actions/coupon';
import StudentActions from '../actions/student';
import OrderedPackageActions from '../actions/ordered-package';
import UserActions from '../actions/user';
import { EnumCouponType } from '../models/coupon';
import Order, { EnumOrderStatus } from '../models/order';
import { EnumPackageOrderType } from '../const/package';
import WalletActions from '../actions/wallet';
import OrderedPackageController from './ordered-package.controller';
import { POINT_VND_RATE } from '../models/wallet';
import WalletController from './wallet.controller';
import PreOrder, { EnumPreOrderStatus } from '../models/pre-order';
import LogServices, { EnumTypeChangeData } from '../services/logger';
import TemplateActions from '../actions/template';
import { ZaloOANotification } from '../const/notification';
import * as natsClient from '../services/nats/nats-client';
import BookingActions from '../actions/booking';
import RegularCalendarActions from '../actions/regular-calendar';
import CSCallManagementActions from '../actions/cs-call-management';
import CsCallManagementController from './cs-call-management.controller';

const pickUpData = [
    '_id',
    'type',
    'target',
    'title',
    'content',
    'start_time_shown',
    'end_time_shown',
    'is_active',
    'image'
];

export default class OrderController {
    /*
     * Summary: Admin getting all orders
     * Request type: GET
     */
    public static async getAllOrders(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, status, search, student_id, order_id } =
            req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            id: parseInt(search as string)
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        if (student_id) {
            filter.user_id = parseInt(student_id as string);
        }
        if (order_id) {
            filter.id = parseInt(order_id as string);
        }
        const ordersFiltered = await OrderActions.findAllAndPaginated(filter);
        const orders = new Array<any>();
        const orderedUsers = new Map();
        await Promise.all(
            ordersFiltered.map(async (order: Order) => {
                let user;
                /* Use a map to avoid re-request user profile to database */
                if (orderedUsers.has(order.user_id)) {
                    user = orderedUsers.get(order.user_id);
                } else {
                    user = await UserActions.findOne(
                        { id: order.user_id },
                        {
                            skype_account: 0,
                            intro: 0,
                            role: 0,
                            is_password_null: 0,
                            login_counter: 0,
                            last_login: 0,
                            last_login_ip: 0,
                            created_time: 0,
                            updated_time: 0
                        }
                    );
                    if (user) {
                        orderedUsers.set(order.user_id, user);
                    }
                }
                const orderedPackage = await OrderedPackageActions.findOne({
                    order_id: order.id
                });
                const order_info = Object.assign(
                    { user_info: user },
                    { orderedPackage: orderedPackage },
                    order.toJSON()
                );
                orders.push(order_info);
            })
        );
        const count = await OrderActions.count(filter);
        const res_payload = {
            data: orders,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    // code copy sửa cho nhanh
    public static async getAllPreOrders(req: ProtectedRequest, res: Response) {
        const { page_size, page_number, status, student_id } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string)
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        if (student_id) {
            filter.user_id = parseInt(student_id as string);
        }
        const ordersFiltered = await PreOrderActions.findAllAndPaginated(
            filter
        );
        const orders = new Array<any>();
        const orderedUsers = new Map();
        for (const order of ordersFiltered) {
            let user;
            /* Use a map to avoid re-request user profile to database */
            if (orderedUsers.has(order.user_id)) {
                user = orderedUsers.get(order.user_id);
            } else {
                user = await UserActions.findOne(
                    { id: order.user_id },
                    {
                        skype_account: 0,
                        intro: 0,
                        role: 0,
                        is_password_null: 0,
                        login_counter: 0,
                        last_login: 0,
                        last_login_ip: 0,
                        created_time: 0,
                        updated_time: 0
                    }
                );
                if (user) {
                    orderedUsers.set(order.user_id, user);
                }
            }
            const order_info = Object.assign(
                { user_info: user },
                order.toJSON()
            );
            orders.push(order_info);
        }
        const count = await PreOrderActions.count(filter);
        const res_payload = {
            data: orders,
            pagination: {
                total: count
            }
        };
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /*
     * Summary: Get the list of all orders made by 1 student
     */
    private static async getOrdersOfAnUser(
        req: ProtectedRequest,
        user_id: number
    ) {
        const { page_size, page_number, status } = req.query;
        const filter: any = {
            page_size: parseInt(page_size as string),
            page_number: parseInt(page_number as string),
            user_id
        };
        if (status) {
            if (Array.isArray(status)) {
                filter.status = status;
            } else {
                filter.status = [parseInt(status as string)];
            }
        }
        const orders = await OrderActions.findAllAndPaginated(filter);
        const count = await OrderActions.count(filter);
        const res_payload = {
            data: orders,
            pagination: {
                total: count
            }
        };
        return res_payload;
    }

    /*
     * Summary: Admin get the list of all orders made by 1 student
     * Request type: GET
     */
    /* TODO: Check to merge this to the function controller above */
    public static async getOrdersOfAnUserByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id } = req.params;
        if (!parseInt(user_id as string)) {
            throw new BadRequestError(req.t('errors.user.invalid_id'));
        }
        const res_payload = await OrderController.getOrdersOfAnUser(
            req,
            parseInt(user_id as string)
        );
        return new SuccessResponse('success', res_payload).send(res, req);
    }
    // With role Student call API
    /*
     * Summary: Học viên lấy danh sách gói học phí đã mua
     * Request type: GET
     * Parameters: - page_size: So entry hien thi 1 lan
     *             - page_number: So trang duoc hien thi trong danh sach
     *             - status: trạng thái gói học phí
     * Response:   - 200: success: Lay duoc danh sach
     */
    public static async getOrdersByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { id } = req.user;
        const res_payload = await OrderController.getOrdersOfAnUser(req, id);
        return new SuccessResponse('success', res_payload).send(res, req);
    }

    /**
     * @description Get detail of 1 order
     * @urlParam order_id <number> - ID of the order
     * @returns SuccessResponse of the order or an empty response
     */
    public static async getDetailOrder(req: ProtectedRequest, res: Response) {
        const { order_id } = req.params;
        const filter: any = {
            id: parseInt(order_id as string)
        };
        if (req.user && !req.user.isAdmin) {
            filter.user_id = req.user.id;
        }
        const order = await OrderActions.findOne(filter);
        if (order) {
            const ordered_packages = await OrderedPackageActions.findAll(
                {
                    order_id: parseInt(order_id as string)
                },
                { order: 0 }
            );
            const result = {
                order,
                ordered_packages
            };
            return new SuccessResponse(req.t('common.success'), result).send(
                res
            );
        } else {
            return new SuccessResponse(req.t('common.success'), {}).send(
                res,
                req
            );
        }
    }

    /*
     * Summary: Create an order buying 1 package for a student
     */
    public static async createOrder(
        req: ProtectedRequest,
        user_id: number,
        admin_set_field: { status: number; admin_note: string }
    ) {
        const { package_list, coupon_code, ispeak_order_id } = req.body;
        if (
            !package_list ||
            !Array.isArray(package_list) ||
            package_list.length <= 0
        ) {
            throw new BadRequestError(req.t('errors.order.no_package'));
        }
        const current_moment = new Date().getTime();
        let coupon: any = null;
        if (coupon_code) {
            coupon = await CouponActions.findOne({
                code: coupon_code,
                type: [EnumCouponType.SALE_OFF],
                start_time_applied: { $lt: current_moment },
                end_time_applied: { $gt: current_moment }
            });
            if (!coupon) {
                throw new BadRequestError(req.t('errors.coupon.not_found'));
            }
        }

        let price = 0;
        let discount = 0;
        let type: any = null;
        const ordered_packages = new Array<any>();
        const check_renew_student = await OrderedPackageActions.count({
            user_id,
            type: [EnumPackageOrderType.PREMIUM, EnumPackageOrderType.STANDARD],
            activation_date: { $ne: null }
        });
        await Promise.all(
            package_list.map(async (bought_package: any) => {
                /** Validate the packages first before we create a bunch of ordered_packages */
                if (!bought_package.package_id || bought_package.amount < 1) {
                    throw new BadRequestError(req.t('errors.order.no_package'));
                }
                if (bought_package.activation_date) {
                    if (!req.user.isAdmin) {
                        throw new BadRequestError(
                            req.t('errors.authentication.permission_denied')
                        );
                    }
                    if (isNaN(bought_package.activation_date))
                        throw new BadRequestError(
                            req.t(
                                'errors.ordered_package.invalid_activation_date'
                            )
                        );
                }
                const pack = await PackageActions.findOne({
                    id: bought_package.id,
                    is_active: true
                });
                if (!pack)
                    throw new BadRequestError(
                        req.t('errors.package.not_found')
                    );
                if (type == null) {
                    type = pack.type;
                } else {
                    if (type != pack.type) {
                        if (
                            type == EnumPackageOrderType.TRIAL ||
                            pack.type == EnumPackageOrderType.TRIAL
                        ) {
                            throw new BadRequestError(
                                req.t('errors.order.only_one_package_type')
                            );
                        }
                    }
                }
                if (
                    req.user &&
                    !req.user.isAdmin &&
                    pack.type == EnumPackageOrderType.TRIAL
                ) {
                    throw new BadRequestError(
                        req.t('errors.order.student_buy_trial')
                    );
                }

                price += pack.price;
                if (check_renew_student > 0) {
                    if (
                        pack.renew_student_coupon &&
                        pack.renew_student_coupon.start_time_applied <=
                            current_moment &&
                        pack.renew_student_coupon.end_time_applied >=
                            current_moment
                    ) {
                        discount += _.round(
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
                        discount += _.round(
                            (pack.price *
                                pack.new_student_coupon.percentage_off) /
                                100,
                            -3
                        );
                    }
                }
                for (let i = 0; i < bought_package.amount; i++) {
                    ordered_packages.push({
                        pack,
                        activation_date: bought_package.activation_date
                    });
                }
            })
        );

        const counter = await CounterActions.findOne();
        const id = counter.order_id;
        if (coupon) {
            discount += _.round((price * coupon.percentage_off) / 100, -3);
        }
        const total_bill = price - discount;

        const new_order: any = {
            id,
            user_id,
            price,
            discount,
            total_bill,
            status: EnumOrderStatus.PENDING,
            admin_note: admin_set_field.admin_note,
            ispeak_order_id
        };
        if (coupon) {
            new_order.coupon_code = coupon_code;
        }

        if (type == EnumPackageOrderType.TRIAL) {
            new_order.price = 0;
            new_order.discount = 0;
            new_order.total_bill = 0;
            new_order.status = EnumOrderStatus.PAID;
        }

        const descriptionTransaction = 'Paid for the order ' + new_order.id;
        const data = await WalletActions.decreaseBalance(
            {
                id: new_order.user_id
            },
            total_bill,
            total_bill / POINT_VND_RATE,
            descriptionTransaction
        );
        if (data.result) {
            new_order.status = EnumOrderStatus.PAID;
            const order = await OrderActions.create(new_order as Order);
            for (const ordered_package of ordered_packages) {
                await OrderedPackageController.createOrderedPackage(
                    req,
                    order,
                    ordered_package.pack,
                    ordered_package.activation_date
                );
            }

            return new_order;
        } else {
            throw new BadRequestError(data.message);
        }
    }

    public static async createPreOrderWithRevenueByStaff(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id, status, admin_note, revenue } = req.body;
        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const admin_set_field = {
            status: parseInt(status as string),
            admin_note
        };
        const { package_list } = req.body;
        if (
            !package_list ||
            !Array.isArray(package_list) ||
            package_list.length <= 0
        ) {
            throw new BadRequestError(req.t('errors.order.no_package'));
        }
        let price = 0;
        const discount = 0;
        let type: any = null;
        const ordered_packages = new Array<any>();
        await Promise.all(
            package_list.map(async (bought_package: any) => {
                if (!bought_package.package_id || bought_package.amount < 1) {
                    throw new BadRequestError(req.t('errors.order.no_package'));
                }
                if (bought_package.activation_date) {
                    if (isNaN(bought_package.activation_date))
                        throw new BadRequestError(
                            req.t(
                                'errors.ordered_package.invalid_activation_date'
                            )
                        );
                }
                if (bought_package.paid_number_class <= 0) {
                    throw new BadRequestError(
                        req.t(
                            'errors.ordered_package.invalid_paid_number_class'
                        )
                    );
                }
                const pack = await PackageActions.findOne({
                    id: bought_package.id,
                    is_active: true
                });
                if (!pack)
                    throw new BadRequestError(
                        req.t('errors.package.not_found')
                    );
                if (type == null) {
                    type = pack.type;
                } else {
                    if (type != pack.type) {
                        if (
                            type == EnumPackageOrderType.TRIAL ||
                            pack.type == EnumPackageOrderType.TRIAL
                        ) {
                            throw new BadRequestError(
                                req.t('errors.order.only_one_package_type')
                            );
                        }
                    }
                }
                if (bought_package.paid_number_class > pack.number_class) {
                    throw new BadRequestError(
                        req.t(
                            'errors.ordered_package.invalid_paid_number_class'
                        )
                    );
                }
                if (req.user && pack.type == EnumPackageOrderType.TRIAL) {
                    throw new BadRequestError(
                        req.t('errors.order.student_buy_trial')
                    );
                }
                price += pack.price * bought_package.amount;
                for (let i = 0; i < bought_package.amount; i++) {
                    ordered_packages.push({
                        pack,
                        activation_date: bought_package.activation_date,
                        paid_number_class: bought_package.paid_number_class
                    });
                }
            })
        );
        const total_bill = revenue;
        const new_order: any = {
            user_id,
            price,
            discount,
            total_bill,
            status: EnumPreOrderStatus.PENDING,
            admin_note: admin_set_field.admin_note,
            ordered_packages
        };
        const preOrder = await PreOrderActions.create(new_order as PreOrder);
        return new SuccessResponse(req.t('common.success'), {
            ok: true,
            preOrder
        }).send(res, req);
    }

    public static async acceptPreOrder(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) {
            throw new BadRequestError('');
        }
        const preOrder = await PreOrderActions.findOne({ _id });
        if (!preOrder || preOrder.status != EnumPreOrderStatus.PENDING) {
            throw new BadRequestError('');
        }
        const counter = await CounterActions.findOne();
        const id = counter.order_id;
        const new_order: any = {
            id,
            user_id: preOrder.user_id,
            price: preOrder.price,
            discount: preOrder.discount,
            total_bill: preOrder.total_bill,
            status: EnumOrderStatus.PENDING,
            admin_note: preOrder.admin_note
        };

        await WalletController.addFundsFunction(
            req,
            new_order.total_bill,
            new_order.user_id,
            new_order.total_bill / POINT_VND_RATE,
            id
        );

        const descriptionTransaction = 'Paid for the order ' + new_order.id;
        const data = await WalletActions.decreaseBalance(
            {
                id: new_order.user_id
            },
            new_order.total_bill,
            new_order.total_bill / POINT_VND_RATE,
            descriptionTransaction
        );
        if (data.result) {
            new_order.status = EnumOrderStatus.PAID;
            const order = await OrderActions.create(new_order as Order);
            for (const ordered_package of preOrder.ordered_packages as any) {
                const orderedPackageNew =
                    await OrderedPackageController.createOrderedPackage(
                        req,
                        order,
                        ordered_package.pack,
                        ordered_package.activation_date,
                        ordered_package.paid_number_class
                    );
                const current_moment = new Date().getTime();
                if (
                    ordered_package.pack &&
                    ordered_package.pack.type != EnumPackageOrderType.TRIAL &&
                    ordered_package.activation_date <= current_moment
                ) {
                    CsCallManagementController.createGreetingCall(
                        orderedPackageNew.user_id,
                        orderedPackageNew.id,
                        ordered_package.activation_date
                    );
                }
            }
            preOrder.order_id = order.id;
            preOrder.status = EnumPreOrderStatus.ACCEPTED;
            await preOrder.save();
        } else {
            throw new BadRequestError(data.message);
        }
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    public static async rejectPreOrder(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) {
            throw new BadRequestError('');
        }
        const preOrder = await PreOrderActions.findOne({ _id });
        if (!preOrder) {
            throw new BadRequestError('');
        }
        preOrder.status = EnumPreOrderStatus.REJECTED;
        await preOrder.save();
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    public static async deletePreOrder(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) {
            throw new BadRequestError('');
        }
        const preOrder = await PreOrderActions.findOne({ _id });
        if (!preOrder || !preOrder.order_id) {
            throw new NotFoundError('pre order not found');
        }
        const order = await OrderActions.findOne({ id: preOrder.order_id });
        if (!order) {
            throw new NotFoundError('order not found');
        }
        const orderedPackages = await OrderedPackageActions.findAll({
            order_id: preOrder.order_id
        });
        let check = null;
        for (const iterator of orderedPackages) {
            const temp = await BookingActions.findOne({
                ordered_package_id: iterator.id
            });
            if (temp) {
                check = temp.id;
                break;
            }
        }
        if (check) {
            throw new BadRequestError(
                'Ordered package has a booking: ' + check
            );
        }
        for (const iterator of orderedPackages) {
            const regulars = await RegularCalendarActions.findAll({
                ordered_package_id: iterator.id
            });
            await Promise.all(
                regulars.map(async (e) => {
                    await RegularCalendarActions.remove(e._id);
                })
            );
            await OrderedPackageActions.remove(iterator._id);
        }
        await OrderActions.remove(order._id);
        await PreOrderActions.remove(preOrder._id);
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    /*
     * Summary: Admin create an order when student want to buy a package
     * Request type: POST
     * Role: Admin
     */
    public static async createOrderForStudentByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { user_id, status, admin_note } = req.body;
        const user = await UserActions.findOne({ id: user_id });
        if (!user) throw new BadRequestError(req.t('errors.user.not_found'));
        const admin_set_field = {
            status: parseInt(status as string),
            admin_note
        };
        const { id: order_id } = await OrderController.createOrder(
            req,
            user_id,
            admin_set_field
        );
        return new SuccessResponse(req.t('common.success'), {
            ok: true,
            order_id
        }).send(res, req);
    }

    /*
     * Summary: Học viên mua gói học phí
     * Request type: POST
     * Body:       - package_id: Gói học phí học viên muốn mua
     * Response:   - 200: success: Tao thanh cong
     *             - 400: bad request: Trung ten môn học
     */
    public static async createOrderByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const user_id = req.user.id;
        const admin_set_field = {
            status: EnumOrderStatus.PENDING,
            admin_note: ''
        };
        await OrderController.createOrder(req, user_id, admin_set_field);
        return new SuccessResponse(req.t('common.success'), {
            ok: true
        }).send(res, req);
    }

    /*
     * Summary: Admin edit an order
     */
    public static async editOrderByAdmin(req: ProtectedRequest, res: Response) {
        const { order_id } = req.params;
        const { status, admin_note, package_list } = req.body;
        const order = await OrderActions.findOne({
            id: parseInt(order_id as string)
        });
        if (!order) throw new BadRequestError(req.t('errors.order.not_found'));
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.old,
            'OrderModel',
            order,
            pickUpData
        );

        const ordered_packages = new Array<any>();
        await Promise.all(
            package_list.map(async (bought_package: any) => {
                /** Validate the packages first before we edit a bunch of ordered_packages */
                if (!bought_package.ordered_package_id) {
                    throw new BadRequestError(req.t('errors.order.no_package'));
                }
                if (
                    bought_package.activation_date &&
                    isNaN(bought_package.activation_date)
                ) {
                    throw new BadRequestError(
                        req.t('errors.order.invalid_activation_date')
                    );
                }
                const pack = await OrderedPackageActions.findOne({
                    id: bought_package.ordered_package_id,
                    order_id: parseInt(order_id as string)
                });
                if (!pack) {
                    throw new BadRequestError(
                        req.t('errors.ordered_package.not_found')
                    );
                }
                if (bought_package.paid_number_class) {
                    if (isNaN(bought_package.paid_number_class)) {
                        throw new BadRequestError(
                            req.t('errors.order.invalid_paid_number_class')
                        );
                    }
                    if (
                        bought_package.paid_number_class >=
                        pack.original_number_class
                    ) {
                        throw new BadRequestError(
                            req.t('errors.order.invalid_paid_number_class')
                        );
                    }
                }
                const ordered_package: any = {
                    pack
                };
                if (bought_package.activation_date) {
                    ordered_package.activation_date =
                        bought_package.activation_date;
                }
                ordered_packages.push(ordered_package);
            })
        );
        if (status && status != order.status) {
            if (
                EnumOrderStatus.PAID == order.status ||
                EnumOrderStatus.CANCEL == order.status
            ) {
                throw new BadRequestError(
                    req.t('errors.order.completed_or_cancel')
                );
            }
        }

        const diff = {
            status:
                status && status != order.status
                    ? parseInt(status as string)
                    : order.status,
            admin_note
        };
        if (diff.status == EnumOrderStatus.PAID) {
            await Promise.all(
                ordered_packages.map(async (ordered_package: any) => {
                    await OrderedPackageController.editOrderedPackage(
                        req,
                        ordered_package.pack,
                        ordered_package.activation_date,
                        ordered_package.paid_number_class
                    );
                })
            );
        } else {
            await OrderedPackageActions.cancelAllPackagesInAnOrder(order.id);
        }
        const new_data = await OrderActions.update(order._id, {
            ...diff
        } as Order);
        LogServices.setChangeData(
            req,
            EnumTypeChangeData.new,
            'OrderModel',
            new_data,
            pickUpData
        );
        return new SuccessResponse('success', { ok: true }).send(res, req);
    }

    public static async cancelOrderByStudent(
        req: ProtectedRequest,
        res: Response
    ) {
        const { order_id } = req.params;
        if (!req.user.id) {
            throw new BadRequestError(
                req.t('errors.authentication.permission_denied')
            );
        }
        const order = await OrderActions.findOne({
            id: parseInt(order_id as string),
            user_id: req.user.id
        });
        if (!order) {
            throw new BadRequestError(req.t('errors.order.not_found'));
        }
        if (order.status != EnumOrderStatus.PENDING) {
            throw new BadRequestError(
                req.t('errors.order.completed_or_cancel')
            );
        }
        const diff = {
            status: EnumOrderStatus.CANCEL
        };
        await OrderedPackageActions.cancelAllPackagesInAnOrder(order.id);
        await OrderActions.update(order._id, { ...diff } as Order);
        return new SuccessResponse(req.t('common.success'), { ok: true }).send(
            res,
            req
        );
    }
}

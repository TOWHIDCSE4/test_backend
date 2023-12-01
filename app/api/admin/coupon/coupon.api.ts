import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CouponControllers from '../../../controllers/coupon.controller';
import ValidationResult, { newCouponValidator } from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/coupons',
    auth.validateToken(),
    auth.validatePermission([
        PERMISSIONS.pmp_create,
        PERMISSIONS.pmp_update,
        PERMISSIONS.mc_view
    ]),
    AsyncFunction(CouponControllers.getCouponsByAdmin)
);

router.get(
    '/admin/coupons/check/:code',
    auth.validateToken(),
    AsyncFunction(CouponControllers.checkCouponByAdmin)
);

router.post(
    '/admin/coupons',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mc_create]),
    newCouponValidator(),
    ValidationResult(),
    AsyncFunction(CouponControllers.createCoupon)
);

router.put(
    '/admin/coupons/:coupon_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mc_update]),
    AsyncFunction(CouponControllers.editCoupon)
);

router.delete(
    '/admin/coupons/:coupon_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.mc_delete]),
    AsyncFunction(CouponControllers.removeCoupon)
);

export default router;

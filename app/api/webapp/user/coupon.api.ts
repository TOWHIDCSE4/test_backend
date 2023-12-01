import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import CouponControllers from '../../../controllers/coupon.controller';
const router = express.Router();

router.get('/coupons', AsyncFunction(CouponControllers.getCouponsByUsers));

router.get(
    '/coupons/check/:code',
    AsyncFunction(CouponControllers.checkCouponByUsers)
);
export default router;

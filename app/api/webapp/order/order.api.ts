import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OrderControllers from '../../../controllers/order.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.get(
    '/orders',
    auth.validateToken(),
    AsyncFunction(OrderControllers.getOrdersByStudent)
);

router.post(
    '/orders',
    auth.validateToken(),
    AsyncFunction(OrderControllers.createOrderByStudent)
);

router.get(
    '/orders/:order_id',
    auth.validateToken(),
    AsyncFunction(OrderControllers.getDetailOrder)
);

router.put(
    '/orders/:order_id/cancel',
    auth.validateToken(),
    AsyncFunction(OrderControllers.cancelOrderByStudent)
);

export default router;

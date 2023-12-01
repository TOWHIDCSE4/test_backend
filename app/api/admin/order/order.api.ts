import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import OrderControllers from '../../../controllers/order.controller';
import ValidationResult, {
    adminOrderValidator,
    adminPreOrderRevenueValidator
} from '../../../validator';
import auth from '../../../auth/validate-request';
import { PERMISSIONS } from '../../../const/permission';

const router = express.Router();

router.get(
    '/admin/users/:user_id/orders',
    auth.validateToken(),
    AsyncFunction(OrderControllers.getOrdersOfAnUserByAdmin)
);

router.get(
    '/admin/orders',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.omao_view]),
    AsyncFunction(OrderControllers.getAllOrders)
);

router.get(
    '/admin/pre-orders',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_view]),
    AsyncFunction(OrderControllers.getAllPreOrders)
);

router.post(
    '/admin/pre-orders/accept',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_approve]),
    AsyncFunction(OrderControllers.acceptPreOrder)
);

router.post(
    '/admin/pre-orders/reject',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_reject]),
    AsyncFunction(OrderControllers.rejectPreOrder)
);

router.delete(
    '/admin/pre-orders/delete',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_remove]),
    AsyncFunction(OrderControllers.deletePreOrder)
);

router.post(
    '/admin/pre-orders-revenue',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_create_order]),
    adminOrderValidator(),
    adminPreOrderRevenueValidator(),
    ValidationResult(),
    AsyncFunction(OrderControllers.createPreOrderWithRevenueByStaff)
);
router.post(
    '/admin/orders',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.omao_create_trial]),
    adminOrderValidator(),
    ValidationResult(),
    AsyncFunction(OrderControllers.createOrderForStudentByAdmin)
);
router.put(
    '/admin/orders/:order_id',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.omao_update]),
    adminOrderValidator(),
    ValidationResult(),
    AsyncFunction(OrderControllers.editOrderByAdmin)
);

router.get(
    '/admin/orders/:order_id',
    auth.validateToken(),
    AsyncFunction(OrderControllers.getDetailOrder)
);

export default router;

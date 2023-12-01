import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import WalletController from '../../../controllers/wallet.controller';
import { PERMISSIONS } from '../../../const/permission';
import { services } from '../../../const/services';
import ZaloInteractiveHistoryController from '../../../controllers/zalo-interactive-history.controller';

const router = express.Router();

router.get(
    '/admin/zalo-interactive-history',
    auth.validateToken(),
    AsyncFunction(
        ZaloInteractiveHistoryController.getZaloInteractiveHistoryPaginated
    )
);

router.post(
    `/zalo-interactive-history/webhook`,
    AsyncFunction(ZaloInteractiveHistoryController.webhook)
);

router.get(
    '/notification/zalo-interactive-history/update-interaction-time',
    auth.validateService(services.notification),
    AsyncFunction(
        ZaloInteractiveHistoryController.updateInteractionTimeFromNotification
    )
);

export default router;

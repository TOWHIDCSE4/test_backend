import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import auth from '../../../auth/validate-request';
import WalletController from '../../../controllers/wallet.controller';
import { PERMISSIONS } from '../../../const/permission';
import { services } from '../../../const/services';

const router = express.Router();

router.get(
    '/admin/wallet/balance',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ompo_create_order]),
    AsyncFunction(WalletController.getBalanceByAdmin)
);

router.get(
    '/admin/wallet/transactions',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ssw_view_detail]),
    AsyncFunction(WalletController.getTransactionsByAdmin)
);

router.post(
    '/admin/wallet/add-funds',
    auth.validateToken(),
    AsyncFunction(WalletController.addFundsToWallet)
);

router.get(
    '/admin/wallets',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.ssw_view]),
    AsyncFunction(WalletController.getWalletsByAdmin)
);

router.get(
    '/admin/wallet/deposit-withdraw',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.wmdm_view]),
    AsyncFunction(WalletController.getWalletsHistory)
);
router.post(
    '/admin/wallet/deposit/accept',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.wmdm_approve]),
    AsyncFunction(WalletController.acceptDeposit)
);
router.post(
    '/admin/wallet/deposit/reject',
    auth.validateToken(),
    auth.validatePermission([PERMISSIONS.wmdm_reject]),
    AsyncFunction(WalletController.rejectDeposit)
);

router.post(
    '/admin/wallet/deposit/checking',
    auth.validateService(services.banking_checker),
    AsyncFunction(WalletController.checkingDeposit)
);

export default router;

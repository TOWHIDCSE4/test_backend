import express from 'express';
import AsyncFunction from '../../../core/async-handler';
import WalletController from '../../../controllers/wallet.controller';
import auth from '../../../auth/validate-request';
const router = express.Router();

router.post(
    '/student/wallet/deposit',
    auth.validateToken(),
    AsyncFunction(WalletController.deposit)
);

router.put(
    '/student/wallet/deposit',
    auth.validateToken(),
    AsyncFunction(WalletController.markPaid)
);

router.put(
    '/student/wallet/deposit/cancel',
    auth.validateToken(),
    AsyncFunction(WalletController.cancelDeposit)
);

router.get(
    '/student/wallet/history',
    auth.validateToken(),
    AsyncFunction(WalletController.getMyHistory)
);

router.get(
    '/student/wallet/history/check-order-appotapay',
    auth.validateToken(),
    AsyncFunction(WalletController.checkStatusOrderAppotapay)
);

router.get(
    '/student/wallet/get-balance',
    auth.validateToken(),
    AsyncFunction(WalletController.getBalance)
);

router.get(
    '/student/wallet/get-transaction-history',
    auth.validateToken(),
    AsyncFunction(WalletController.getTransactionHistory)
);

router.get(
    '/student/wallet/get-url-connect-visa',
    auth.validateToken(),
    AsyncFunction(WalletController.getUrlConnectVisa)
);

export default router;

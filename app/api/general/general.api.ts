import express from 'express';
import { Request, Response } from 'express';
import { BankList, BankAcount } from '../../const/bank-list';
import { SuccessResponse } from '../../core/ApiResponse';
import CourseControllers from '../../controllers/course.controller';
import AsyncFunction from '../../core/async-handler';
import _ from 'lodash';
import WalletActions from '../../actions/wallet';
import AlepayAction from '../../actions/alepay-history';
import WalletController from '../../controllers/wallet.controller';
const logger = require('dy-logger');

const router = express.Router();

router.get('/public/bank-list', (req: Request, res: Response) => {
    new SuccessResponse('success', BankList).send(res, req);
});

router.get('/public/bank-account', (req: Request, res: Response) => {
    new SuccessResponse('success', BankAcount).send(res, req);
});

router.get(
    '/public/courses',
    AsyncFunction(CourseControllers.getCoursesByAdmin)
);

router.get(
    '/public/courses/:id',
    AsyncFunction(CourseControllers.getCourseInfo)
);

router.post(
    '/payment/nganluong/webhook',
    async (req: Request, res: Response) => {
        logger.info('Alepay webhook');
        logger.info(JSON.stringify(req.body));
        await AlepayAction.create({
            data: req.body
        });
        if (req.body.cardTokenInfo) {
            const cardTokenInfo = req.body.cardTokenInfo;
            const wallet = await WalletActions.findOne({
                user_id: Number(cardTokenInfo.customerId)
            });
            if (wallet) {
                wallet.token_alepay = cardTokenInfo.token;
                await wallet.save();
            }
        }
        if (req.body.transactionInfo) {
            const transactionInfo = req.body.transactionInfo;
            if (transactionInfo.status === '000') {
                await WalletController.checkingDepositFunc({
                    order_id: transactionInfo.orderCode,
                    amount: transactionInfo.amount,
                    stk: transactionInfo.cardNumber,
                    detail: ''
                });
            }
        }
        return res.send('<h3>OK</h3>');
    }
);
export default router;

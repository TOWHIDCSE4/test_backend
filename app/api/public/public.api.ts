import _ from 'lodash';
import express from 'express';
import { Request, Response } from 'express';
import AsyncFunction from '../../core/async-handler';
import rateLimit from '../../utils/rate-limit-api';
import { BankList, BankAcount } from '../../const/bank-list';
import { SuccessResponse } from '../../core/ApiResponse';
import WalletActions from '../../actions/wallet';
import AlepayAction from '../../actions/alepay-history';
import AppotapayActions from '../../actions/appotapay-history';
import WalletController from '../../controllers/wallet.controller';
import CurriculumControllers from '../../controllers/curriculum.controller';
import ContactController from '../../controllers/contact.controller';
import CourseControllers from '../../controllers/course.controller';
import moment from 'moment';
import config from 'config';

const router = express.Router();

router.get(
    '/public/curriculums',
    AsyncFunction(CurriculumControllers.getCurriculums)
)

router.post('/public/signup-contract', rateLimit, ContactController.createContact)

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
    AsyncFunction(
        async (req: Request, res: Response) => {
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
        })
);


const api_key = process.env.APPOTAPAY_API_KEY ?? config.get('services.appotapay.api_key');
router.post(
    '/payment/appotapay/webhook',
    AsyncFunction(
        async (req: Request, res: Response) => {
            await AppotapayActions.create({
                data: req.body
            });
            if (req.body.errorCode === 0 && api_key === req.body.apiKey) {
                const walletHistory = await WalletActions.findHistory({
                    'code':req.body.orderId
                });
                if(walletHistory){
                    await WalletController.checkingDepositFunc({
                        order_id: walletHistory.code,
                        amount: walletHistory.price,
                        stk: "",
                        detail: {
                            appotapayTransId: req.body?.appotapayTransId,
                        }
                    });
                    return res.send('<h3>OK</h3>');
                }
            }
            return res.send('<h3>ERROR</h3>');

        }
    )

);

router.get('/public/util/server-time', (req: Request, res: Response) => {
    new SuccessResponse('success', moment().valueOf()).send(res);
});
export default router;
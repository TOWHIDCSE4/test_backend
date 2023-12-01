import { SuccessResponse } from './../core/ApiResponse';
import { BadRequestError } from './../core/ApiError';
import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import WalletActions from '../actions/wallet';
import AlepayActions from '../actions/alepay-history';
import WalletTransaction, {
    EnumTransactionType,
    EnumTransactionStatus,
    TransactionSource
} from '../models/wallet-transaction';
import WalletHistory, {
    EnumWalletHistoryType,
    EnumWalletHistoryStatus,
    HistoryAction,
    OrderSource
} from '../models/wallet-history';
import { POINT_VND_RATE } from '../models/wallet';
import HamiaNotiService from '../services/hamia-noti';
import AlepayService from '../services/alepay';
import AppotaPayService from '../services/appotapay';

export default class WalletController {
    public static async getBalanceByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const id = Number(req.query.id);
        if (!id) throw new BadRequestError();
        const data = await WalletActions.findOne({ user_id: id });
        return new SuccessResponse(req.t('common.success'), data).send(
            res,
            req
        );
    }
    public static async addFundsFunction(
        req: ProtectedRequest,
        price: number,
        userId: number,
        coin: number,
        order?: number
    ) {
        const source = TransactionSource.MANUAL;
        const source_data = { AMOUNT: price } as any;
        if (!Object.values(TransactionSource).includes(source)) {
            throw new BadRequestError();
        }
        let history = null;
        let description =
            (req.user?.username || 'Admin') +
            ' has created a deposit request for user ' +
            userId;
        if (order) {
            description += ' to pay for the order :' + order;
        }
        const newData: any = {
            user_id: userId,
            description: description,
            type: EnumWalletHistoryType.DEPOSIT,
            source: source,
            source_data: source_data,
            price: price,
            coin,
            status: EnumWalletHistoryStatus.PENDING,
            created_time: new Date(),
            updated_time: new Date(),
            history: []
        };
        history = await WalletActions.createHistory(newData);
        const descriptionTransaction = description;
        const data = await WalletActions.increaseBalance(
            {
                id: history.user_id
            },
            history.price,
            history.coin,
            descriptionTransaction
        );
        if (data.result) {
            history.status = EnumWalletHistoryStatus.DONE;
            history.transactionId = data.transaction._id;
        } else {
            history.status = EnumWalletHistoryStatus.FAILED;
        }
        await history.save();
        return data;
    }

    public static async addFundsToWallet(req: ProtectedRequest, res: Response) {
        const { price, coin, userId } = req.body;
        if (!price || !userId) throw new BadRequestError();
        const data = await WalletController.addFundsFunction(
            req,
            price,
            userId,
            coin
        );
        return new SuccessResponse(req.t('common.success'), data).send(
            res,
            req
        );
    }

    public static async deposit(req: ProtectedRequest, res: Response) {
        let { price, source, source_data, coin } = req.body;
        if (!price) throw new BadRequestError('price is required');
        if (!source) throw new BadRequestError('source is required');
        if (!Object.values(TransactionSource).includes(source)) {
            throw new BadRequestError();
        }
        let history = null;
        price = parseInt(price as string);
        coin = price / POINT_VND_RATE;
        if (source_data) {
            source_data.AMOUNT = price;
        }
        let description =
            'Created a deposit request, waiting for the user to pay the deposit order';

        const newData: any = {
            user_id: req.user.id,
            description: description,
            type: EnumWalletHistoryType.DEPOSIT,
            source: source,
            source_data: source_data,
            price: price,
            coin,
            status: EnumWalletHistoryStatus.PENDING,
            created_time: new Date(),
            updated_time: new Date(),
            history: []
        };
        history = await WalletActions.createHistory(newData);
        let id = String(history._id);
        id = id.substring(id.length - 6, id.length).toUpperCase();
        if (source_data) {
            source_data.DESCRIPTION = id;
        }
        history.code = id;
        history.history.push({
            time: new Date(),
            user: {
                email: req.user.email,
                full_name: req.user.name,
                id: req.user.id,
                phone_number: req.user.phone_number,
                username: req.user.username,
                _id: req.user._id
            },
            action: HistoryAction.DEPOSIT,
            description
        });
        history.markModified('source_data');
        history.markModified('history');
        await history.save();

        //call visa deposit
        if (source === OrderSource.VISA) {
            const dataWallet = await WalletActions.findOne({
                user_id: req.user.id
            });
            if (!dataWallet.token_alepay) {
                throw new BadRequestError();
            }
            const resData = await AlepayService.callDepositVisa({
                // customerToken: card.token,
                customerToken: dataWallet.token_alepay,
                orderCode: id,
                amount: price,
                orderDescription: id
            });
            if (resData.code === '000') {
                history.status = EnumWalletHistoryStatus.PROCESSING;
                description =
                    'Payment success with checkoutUrl :' + resData.checkoutUrl;
                history.history.push({
                    time: new Date(),
                    user: {
                        email: req.user.email,
                        full_name: req.user.name,
                        id: req.user.id,
                        phone_number: req.user.phone_number,
                        username: req.user.username,
                        _id: req.user._id
                    },
                    action: HistoryAction.DEPOSIT,
                    description
                });
            } else {
                history.status = EnumWalletHistoryStatus.FAILED;
                description = 'Payment Failed';
                history.history.push({
                    time: new Date(),
                    user: {
                        email: req.user.email,
                        full_name: req.user.name,
                        id: req.user.id,
                        phone_number: req.user.phone_number,
                        username: req.user.username,
                        _id: req.user._id
                    },
                    action: HistoryAction.DEPOSIT,
                    description,
                    meta: resData
                });
            }
            history.markModified('source_data');
            history.markModified('history');
            await history.save();
            return new SuccessResponse(req.t('common.success'), resData).send(
                res
            );
        }

        //call appotapay deposit
        if (
            [
                OrderSource.ATM_APPOTAPAY,
                OrderSource.BANK_APPOTAPAY,
                OrderSource.EWALLET_APPOTAPAY,
                OrderSource.CC_APPOTAPAY
            ].includes(source)
        ) {
            history.code = history._id;
            const xForwarded = req.headers['x-forwarded-for'] as any;
            let clientIp =
                xForwarded?.split(',').shift() || req.socket?.remoteAddress;
            console.log({
                a: req.headers['x-forwarded-for'],
                b: req.socket.remoteAddress,
                clientIp
            });
            if (clientIp == '::1') {
                clientIp = '103.53.171.140';
            }
            const resData = await AppotaPayService.createOrder({
                orderId: String(history._id),
                orderInfo: description,
                amount: price,
                paymentMethod: source,
                clientIp: clientIp
            });
            if (resData.status === 200) {
                history.status = EnumWalletHistoryStatus.PROCESSING;
                description = `Thanh toán nạp ${price} iXu vào English Plus`;
                history.history.push({
                    time: new Date(),
                    user: {
                        email: req.user.email,
                        full_name: req.user.name,
                        id: req.user.id,
                        phone_number: req.user.phone_number,
                        username: req.user.username,
                        _id: req.user._id
                    },
                    action: HistoryAction.DEPOSIT,
                    description
                });
                const source_data = {
                    ...history.source_data,
                    signature: resData.data.signature
                };
                history.source_data = source_data;
            } else {
                history.status = EnumWalletHistoryStatus.FAILED;
                description = 'Payment Failed';
                history.history.push({
                    time: new Date(),
                    user: {
                        email: req.user.email,
                        full_name: req.user.name,
                        id: req.user.id,
                        phone_number: req.user.phone_number,
                        username: req.user.username,
                        _id: req.user._id
                    },
                    action: HistoryAction.DEPOSIT,
                    description,
                    meta: resData.data
                });
            }
            history.markModified('source_data');
            history.markModified('history');
            await history.save();
            return new SuccessResponse(
                req.t('common.success'),
                resData.data
            ).send(res);
        }
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async markPaid(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) throw new BadRequestError('_id is required');
        const history = await WalletActions.getHistoryById(_id);
        if (!history) throw new BadRequestError('history is not valid');
        const description =
            'User has marked as paid, waiting for admin approval';
        history.description = description;
        history.status = EnumWalletHistoryStatus.PROCESSING;
        history.history.push({
            time: new Date(),
            user: {
                email: req.user.email,
                full_name: req.user.name,
                id: req.user.id,
                phone_number: req.user.phone_number,
                username: req.user.username,
                _id: req.user._id
            },
            action: HistoryAction.MARK_PAID,
            description
        });
        history.markModified('history');
        await history.save();
        HamiaNotiService.pushFCMByTagNoti(
            'Deposit',
            `${req.user.username} Deposit`,
            `${req.user.username} has marked a deposit money as paid.`,
            history
        );
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async cancelDeposit(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) throw new BadRequestError('_id is required');
        const history = await WalletActions.getHistoryById(_id);
        if (!history) throw new BadRequestError('history is not valid');
        const description = 'User has canceled the transaction';
        history.description = description;
        history.status = EnumWalletHistoryStatus.CANCEL;
        history.history.push({
            time: new Date(),
            user: {
                email: req.user.email,
                full_name: req.user.name,
                id: req.user.id,
                phone_number: req.user.phone_number,
                username: req.user.username,
                _id: req.user._id
            },
            action: HistoryAction.CANCEL_DEPOSIT,
            description
        });
        history.markModified('history');
        await history.save();
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async rejectDeposit(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) throw new BadRequestError('_id is required');
        const history = await WalletActions.getHistoryById(_id);
        if (!history) throw new BadRequestError('history is not valid');
        const user = req.user;
        if (!user) {
            throw new BadRequestError('user is not valid');
        }
        const description = user.username + ' has rejected this payment';
        history.description = description;
        history.status = EnumWalletHistoryStatus.REJECTED;
        history.history.push({
            time: new Date(),
            user: {
                email: user.email,
                full_name: user.fullname,
                id: user.id,
                phone_number: user.phoneNumber,
                username: user.username,
                _id: user._id
            },
            action: HistoryAction.REJECT_DEPOSIT,
            description
        });
        history.markModified('history');
        await history.save();
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async acceptDeposit(req: ProtectedRequest, res: Response) {
        const { _id } = req.body;
        if (!_id) throw new BadRequestError('_id is required');
        const history = await WalletActions.getHistoryById(_id);
        if (!history) throw new BadRequestError('history is not valid');
        const user = req.user;
        if (!user) {
            throw new BadRequestError('user is not valid');
        }
        const description = user.username + ' has accepted this payment';
        history.description = description;
        const descriptionTransaction =
            user.username + ' has accepted payment with code ' + history.code;

        const data = await WalletActions.increaseBalance(
            {
                id: history.user_id
            },
            history.price,
            history.coin,
            descriptionTransaction
        );
        if (data.result) {
            history.status = EnumWalletHistoryStatus.DONE;
            history.transactionId = data.transaction._id;
        } else {
            history.status = EnumWalletHistoryStatus.FAILED;
        }
        history.history.push({
            time: new Date(),
            user: {
                email: user.email,
                full_name: user.fullname,
                id: user.id,
                phone_number: user.phoneNumber,
                username: user.username,
                _id: user._id
            },
            action: HistoryAction.ACCEPT_DEPOSIT,
            description: history.description
        });
        history.markModified('history');
        await history.save();
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async getMyHistory(req: ProtectedRequest, res: Response) {
        const { page_number, page_size } = req.query;
        const result = await WalletActions.getHistoryByUser({
            user_id: req.user.id,
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string)
        });
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getWalletsHistory(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_number, page_size, user_id, status, source, code } =
            req.query;
        const result = await WalletActions.getHistoryByUser({
            status,
            source,
            code,
            user_id: user_id,
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string)
        });
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }
    public static async checkingDepositFunc({
        order_id,
        amount,
        stk,
        detail
    }: any) {
        if (!order_id) throw new BadRequestError('order_id is required');
        if (!amount) throw new BadRequestError('amount is required');

        const history = await WalletActions.findHistory({
            code: order_id,
            price: amount
        });
        if (!history) throw new BadRequestError('Transaction is not valid');
        if (history.status === EnumWalletHistoryStatus.DONE)
            throw new BadRequestError('Transaction has done');

        const description = 'AutoCheckingSystem has accepted this payment';
        history.description = description;
        const descriptionTransaction =
            'AutoCheckingSystem has accepted payment with code ' + history.code;

        const data = await WalletActions.increaseBalance(
            {
                id: history.user_id
            },
            history.price,
            history.coin,
            descriptionTransaction
        );
        if (data.result) {
            history.status = EnumWalletHistoryStatus.DONE;
            history.transactionId = data.transaction._id;
        } else {
            history.status = EnumWalletHistoryStatus.FAILED;
        }
        history.history.push({
            time: new Date(),
            user: null,
            action: HistoryAction.ACCEPT_DEPOSIT,
            description: history.description,
            meta: { order_id, amount, stk, detail }
        });
        history.markModified('history');
        await history.save();
        return history;
    }

    public static async checkingDeposit(req: ProtectedRequest, res: Response) {
        const { order_id, amount, stk, detail } = req.body;
        const history = await WalletController.checkingDepositFunc({
            order_id,
            amount,
            stk,
            detail
        });
        return new SuccessResponse(req.t('common.success'), history).send(
            res,
            req
        );
    }

    public static async getBalance(req: ProtectedRequest, res: Response) {
        const balance = await WalletActions.getBalance(req.user);
        return new SuccessResponse(req.t('common.success'), {
            balance: balance
        }).send(res, req);
    }

    public static async getTransactionHistory(
        req: ProtectedRequest,
        res: Response
    ) {
        //get transaction history of user
        const { page_number, page_size } = req.query;
        const result = await WalletActions.getTransactionsByUser({
            user_id: req.user.id,
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string)
        });
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getTransactionsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_number, page_size, user_id } = req.query;
        const result = await WalletActions.getTransactionsByUser({
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            user_id: parseInt(user_id as string)
        });
        const reports = result[0].paginatedResults;
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: reports,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getWalletsByAdmin(
        req: ProtectedRequest,
        res: Response
    ) {
        const { page_number, page_size, search } = req.query;
        const result = await WalletActions.getWallets({
            page_number: parseInt(page_number as string),
            page_size: parseInt(page_size as string),
            search
        });
        const wallets = result[0].paginatedResults;
        //calculate total in-come balance of users
        await Promise.all(
            wallets.map(async (wallet: any) => {
                const transactions = await WalletActions.getTransactionsByUser({
                    user_id: wallet.user_id
                });
                let totalIn = 0;
                transactions[0].paginatedResults.forEach((transaction: any) => {
                    if (
                        transaction.type === EnumTransactionType.IN &&
                        transaction.status === EnumTransactionStatus.DONE
                    ) {
                        totalIn += transaction.price / POINT_VND_RATE;
                    }
                });
                wallet.totalIn = totalIn;
            })
        );
        const total = result[0].totalResults[0]?.count;
        const res_payload = {
            data: wallets,
            pagination: {
                total: total
            }
        };
        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async getUrlConnectVisa(
        req: ProtectedRequest,
        res: Response
    ) {
        const res_payload = {
            status: false,
            url: '',
            card: {}
        };
        const data = await AlepayActions.findOne({
            'data.cardTokenInfo.customerId': String(req.user.id)
        });
        if (!data) {
            const resVisa = await AlepayService.buildUrlConnectVisaAlepay(
                req.user
            );
            if (resVisa) {
                res_payload.url = resVisa.url;
                res_payload.status = true;
            }
        } else {
            const card = data.data.cardTokenInfo;
            res_payload.status = true;
            res_payload.card = {
                email: card.email,
                cardNumber: card.cardNumber,
                cardHolderName: card.cardHolderName,
                cardExpireMonth: card.cardExpireMonth,
                cardExpireYear: card.cardExpireYear,
                paymentMethod: card.paymentMethod,
                customerId: card.customerId,
                bankCode: card.bankCode
            };
        }

        return new SuccessResponse(req.t('common.success'), res_payload).send(
            res,
            req
        );
    }

    public static async checkStatusOrderAppotapay(
        req: ProtectedRequest,
        res: Response
    ) {
        const orderId = req.query.orderId;
        if (orderId) {
            const resData = await AppotaPayService.checkOrder(orderId);
            if (resData.data) {
                const history = await WalletActions.findHistory({
                    code: orderId
                });
                if (history) {
                    const user = {
                        email: req.user.email,
                        full_name: req.user.name,
                        id: req.user.id,
                        phone_number: req.user.phone_number,
                        username: req.user.username,
                        _id: req.user._id
                    };
                    if (resData.data.errorCode == 0) {
                        await WalletController.checkingDepositFunc({
                            order_id: history.code,
                            amount: history.price,
                            stk: '',
                            detail: {
                                appotapayTransId:
                                    resData.data?.transaction?.appotapayTransId
                            }
                        });
                    } else if (resData.data.errorCode != 35) {
                        const description = resData.data.message;
                        history.description = description;
                        history.history.push({
                            time: new Date(),
                            user: user,
                            action: HistoryAction.DEPOSIT,
                            description,
                            meta: resData.data
                        });
                        history.status = EnumWalletHistoryStatus.FAILED;
                        history.markModified('history');
                        await history.save();
                    }
                }
            }
        }
        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }
}

import mongoose from 'mongoose';
import Wallet, { WalletModel } from '../models/wallet';
import WalletTransaction, {
    EnumTransactionType,
    EnumTransactionStatus,
    WalletTransactionModel
} from '../models/wallet-transaction';
import WalletHistory, { WalletHistoryModel } from '../models/wallet-history';
import User from '../models/user';
import UserActions from './user';
import { escapeRegExp } from 'lodash';
const logger = require('dy-logger');

export default class WalletActions {
    public static findOne(
        filter: any,
        select_fields?: object
    ): Promise<any | null> {
        return WalletModel.findOne(filter, {
            ...select_fields
        }).exec();
    }

    public static async getWallets(query: any): Promise<any[]> {
        const pageSize = query.page_size || 10;
        const pageNumber = query.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions: any = {};
        if (query.search) {
            const searchRegexStr = escapeRegExp(query.search);
            conditions['$or'] = [
                {
                    'user.full_name': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    'user.email': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                },
                {
                    'user.username': {
                        $regex: searchRegexStr,
                        $options: 'i'
                    }
                }
            ];
        }

        const aggregate = [
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $match: conditions },
            { $sort: { updated_time: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ];
        return WalletModel.aggregate(aggregate);
    }

    public static getBalance(user: User): Promise<number> {
        return new Promise((resolve, reject) => {
            WalletModel.findOne({
                user_id: user.id
            })
                .then(async (wallet) => {
                    if (wallet) {
                        resolve(wallet.total_balance);
                    } else {
                        logger.info(
                            'Wallet not found for user: ' +
                                user.username +
                                ' ==> init Wallet'
                        );
                        await this.initWallet(user);
                        resolve(0);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    static async initWallet(user: User): Promise<any> {
        const temp = await UserActions.findOne({ id: user.id });
        if (temp) {
            const newModel = new WalletModel({
                total_balance: 0,
                user_id: temp.id,
                user: temp,
                created_time: new Date(),
                updated_time: new Date()
            });
            return newModel.save();
        }
    }
    //return {result: true, message: "success"} if success else {result: false, message: "error"}
    public static async increaseBalance(
        user: any,
        price: number,
        coin: number,
        description: string
    ): Promise<any> {
        return new Promise(async (resolve) => {
            const currentBalance = await this.getBalance(user);
            const newBalance = currentBalance + coin;
            WalletModel.updateOne(
                { user_id: user.id },
                { total_balance: newBalance, updated_time: new Date() }
            )
                .then(async (n) => {
                    const transaction = await WalletTransactionModel.create({
                        old_balance: currentBalance,
                        new_balance: newBalance,
                        price: price,
                        coin: coin,
                        user_id: user.id,
                        user: user,
                        description: description,
                        type: EnumTransactionType.IN,
                        status: EnumTransactionStatus.DONE,
                        created_time: new Date(),
                        updated_time: new Date()
                    });
                    resolve({
                        result: true,
                        message: 'success',
                        content: n,
                        transaction
                    });
                })
                .catch(async (err) => {
                    resolve({ result: false, message: 'error ' + err.message });
                });
        });
    }

    public static async decreaseBalance(
        user: any,
        price: number,
        coin: number,
        description: string
    ): Promise<any> {
        return new Promise(async (resolve) => {
            const currentBalance = await this.getBalance(user);
            const newBalance = currentBalance - coin;
            if (newBalance < 0) {
                logger.error(`${user.username} Insufficient balance`);
                resolve({ result: false, message: 'Insufficient balance' });
            } else {
                WalletModel.updateOne(
                    { user_id: user.id },
                    { total_balance: newBalance, updated_time: new Date() }
                )
                    .then(async (n) => {
                        const transaction = await WalletTransactionModel.create(
                            {
                                old_balance: currentBalance,
                                new_balance: newBalance,
                                price: price,
                                coin: coin,
                                user_id: user.id,
                                user: user,
                                description: description,
                                type: EnumTransactionType.OUT,
                                status: EnumTransactionStatus.DONE,
                                created_time: new Date(),
                                updated_time: new Date()
                            }
                        );
                        resolve({
                            result: true,
                            message: 'success',
                            content: n,
                            transaction
                        });
                    })
                    .catch(async (err) => {
                        resolve({
                            result: false,
                            message: 'error ' + err.message
                        });
                    });
            }
        });
    }

    public static async getTransactionById(
        _id: string
    ): Promise<WalletTransaction | null> {
        return new Promise((resolve, reject) => {
            WalletTransactionModel.findOne({
                _id: _id
            })
                .then((transaction) => {
                    resolve(transaction);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static async getHistoryById(
        _id: string
    ): Promise<WalletHistory | null> {
        return new Promise((resolve, reject) => {
            WalletHistoryModel.findOne({
                _id: _id
            })
                .then((data) => {
                    resolve(data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static async findHistory(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            WalletHistoryModel.findOne(filter)
                .then((data) => {
                    resolve(data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static async createHistory(
        diff: WalletHistory
    ): Promise<WalletHistory> {
        return new Promise((resolve, reject) => {
            const newModel = new WalletHistoryModel(diff);
            newModel
                .save()
                .then((diff) => {
                    resolve(diff);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static async getHistoryByUser(query: any): Promise<any[]> {
        const pageSize = query.page_size || 20;
        const pageNumber = query.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = {} as any;
        if (query.user_id) {
            conditions['user_id'] = query.user_id;
        }
        if (query.status) {
            conditions['status'] = Number(query.status);
        }
        if (query.source) {
            conditions['source'] = query.source;
        }
        if (query.code) {
            conditions['code'] = query.code.toUpperCase();
        }
        return WalletHistoryModel.aggregate([
            { $match: conditions },
            { $sort: { created_time: -1 } },
            {
                $lookup: {
                    from: 'users',
                    let: {
                        user_id: '$user_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$user_id', '$id']
                                }
                            }
                        },
                        {
                            $project: {
                                username: 1,
                                id: 1,
                                full_name: 1,
                                phone_number: 1
                            }
                        }
                    ],
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ]);
    }

    public static async createTransaction(
        transaction: WalletTransaction
    ): Promise<WalletTransaction> {
        return new Promise((resolve, reject) => {
            const newModel = new WalletTransactionModel(transaction);
            newModel
                .save()
                .then((transaction) => {
                    resolve(transaction);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    public static async getTransactionsByUser(query: any): Promise<any[]> {
        const pageSize = query.page_size || 20;
        const pageNumber = query.page_number || 1;
        const skip = pageSize * (pageNumber - 1);
        const limit = pageSize;
        const conditions = {
            user_id: query.user_id
        };
        return WalletTransactionModel.aggregate([
            { $match: conditions },
            { $sort: { created_time: -1 } },
            {
                $facet: {
                    paginatedResults: [{ $skip: skip }, { $limit: limit }],
                    totalResults: [{ $count: 'count' }]
                }
            }
        ]);
    }
}

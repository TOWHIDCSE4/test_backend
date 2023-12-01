import config from 'config';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';

const base_url = config.get('services.appotapay.base_url');
const partner_code = config.get('services.appotapay.partner_code');
const api_key =
    process.env.APPOTAPAY_API_KEY ?? config.get('services.appotapay.api_key');
const secret_key =
    process.env.APPOTAPAY_SECRET_KEY ??
    config.get('services.appotapay.secret_key');
const notify_url = config.get('services.appotapay.notify_url');
const redirect_url = config.get('services.appotapay.redirect_url');

function ksort(obj: any) {
    const keys = Object.keys(obj).sort();
    let sortedObj = {} as any;
    for (var i in keys) {
        sortedObj[keys[i]] = obj[keys[i]];
    }
    return sortedObj;
}
const paymentMethod = {
    CC_APPOTAPAY: 'CC',
    ATM_APPOTAPAY: 'ATM',
    BANK_APPOTAPAY: 'VA',
    EWALLET_APPOTAPAY: 'EWALLET'
} as any;

export default class AlepayService {
    public static async buildToken() {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const data = {
            iss: partner_code || '',
            api_key: api_key || '',
            jti: `${api_key || ''}${currentTimestamp}`,
            exp: currentTimestamp + 3000
        };
        const token = await jwt.sign(data, secret_key as string);
        return token;
    }
    public static async buildSignature(requestBody: any) {
        requestBody = ksort(requestBody);
        let signData = '';
        for (let [key, value] of Object.entries(requestBody)) {
            if (typeof value === 'object') value = JSON.stringify(value);
            if (key !== 'signature') signData += `&${key}=${value}`;
        }
        signData = signData.substring(1);
        return CryptoJS.HmacSHA256(signData, secret_key as string).toString();
    }
    public static async createOrder(data: any) {
        data.paymentMethod = paymentMethod[data.paymentMethod];
        const baseData = {
            notifyUrl: notify_url,
            redirectUrl: redirect_url,
            action: 'PAY_WITH_RETURN_TOKEN',
            ...data
        };
        const token = await AlepayService.buildToken();
        const signature = await AlepayService.buildSignature(baseData);
        const config = {
            method: 'post',
            url: `${base_url}/api/v1.1/orders/payment/bank`,
            headers: {
                'X-APPOTAPAY-AUTH': token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                ...baseData,
                signature: signature
            })
        } as any;
        console.log({
            ...baseData,
            signature: signature
        });
        return axios(config);
    }
    public static async checkOrder(orderId: any) {
        const baseData = {
            orderId
        };
        const token = await AlepayService.buildToken();
        const signature = await AlepayService.buildSignature(baseData);
        const config = {
            method: 'post',
            url: `${base_url}/api/v1.1/orders/transaction/bank/status`,
            headers: {
                'X-APPOTAPAY-AUTH': token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                ...baseData,
                signature: signature
            })
        } as any;
        console.log({
            ...baseData,
            signature: signature
        });
        return axios(config);
    }
}

import { BadRequestError } from '../../core/ApiError';
import { ResponseStatus } from '../../core/ApiResponse';
import config from 'config';
import axios from 'axios';
import crypto from 'crypto';

function signHmacSha256(key: string, str: string) {
    let hmac = crypto.createHmac('sha256', key);
    let signed = hmac.update(Buffer.from(str, 'utf-8')).digest('hex');
    return signed;
}

export default class AlepayService {
    public static async buildUrlConnectVisaAlepay(user: any) {
        const url = `${config.get('services.alepay.base_url')}/request-profile`;
        const tokenKey = config.get('services.alepay.token_key') as string;
        const params = {
            tokenKey,
            id: user.id,
            firstName: user.first_name || 'Test',
            lastName: user.last_name || 'Test',
            street: 'Dịch Vọng Hậu',
            city: 'Hà Nội',
            state: 'Hà Nội',
            postalCode: '11310',
            country: user.country || 'VN',
            email: user.email || 'it@ispeak.vn',
            phoneNumber: user.phone_number || '0566662225',
            callback: config.get(
                'services.alepay.callback_connect_visa'
            ) as string,
            language: 'vi'
        };
        const urlParams = new URLSearchParams(params);
        urlParams.sort();
        let stringParams = decodeURIComponent(urlParams.toString());
        stringParams = stringParams.replace(/\+/gim, ' ');
        const checksum_key = config.get(
            'services.alepay.checksum_key'
        ) as string;
        const signature = signHmacSha256(checksum_key, stringParams);

        const res = await axios.post(url, { ...params, tokenKey, signature });
        return res.data;
    }

    public static async callDepositVisa({
        customerToken,
        orderCode,
        amount,
        orderDescription
    }: any) {
        const url = `${config.get(
            'services.alepay.base_url'
        )}/request-tokenization-payment`;
        const tokenKey = config.get('services.alepay.token_key') as string;
        const params = {
            tokenKey,
            customerToken,
            orderCode,
            amount,
            currency: 'VND',
            orderDescription,
            returnUrl: config.get(
                'services.alepay.callback_success_visa'
            ) as string,
            cancelUrl: config.get(
                'services.alepay.callback_cancel_visa'
            ) as string,
            paymentHours: '1',
            language: 'vi'
        };
        const urlParams = new URLSearchParams(params);
        urlParams.sort();
        let stringParams = decodeURIComponent(urlParams.toString());
        stringParams = stringParams.replace(/\+/gim, ' ');
        const checksum_key = config.get(
            'services.alepay.checksum_key'
        ) as string;
        const signature = signHmacSha256(checksum_key, stringParams);

        const res = await axios.post(url, { ...params, tokenKey, signature });
        return res.data;
    }
}

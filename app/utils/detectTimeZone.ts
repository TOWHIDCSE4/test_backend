const satelize = require('satelize');

/**
 * @param {string} ip - ip address.
 */
export const detectTimeZoneFromIp = (ip: string): Promise<string | null> =>
    new Promise((rel, rej) => {
        try {
            satelize.satelize({ ip }, function (err: any, payload: any) {
                if (payload) rel(payload.timezone);
                else rel(null);
            });
        } catch (error) {
            rel(null);
        }
    });

/**
 * @param {string} req - request from client.
 */
export const detectTimeZoneFromReq = (req: any): Promise<string | null> =>
    new Promise(async (rel, rej) => {
        try {
            let ip =
                req.header('x-forwarded-for') ||
                req.connection.remoteAddress ||
                '';
            if (ip.substr(0, 7) == '::ffff:') {
                ip = ip.substr(7);
            }
            const timezone = await detectTimeZoneFromIp(ip);
            rel(timezone);
        } catch (error) {
            rel(null);
        }
    });

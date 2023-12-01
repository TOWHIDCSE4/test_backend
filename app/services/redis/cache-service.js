const config = require('config');
const createClientRedis = require('./redis');

const client = createClientRedis({
    host: `${process.env.REDIS_HOST || config.get('services.redis.host')}`,
    port: `${process.env.REDIS_PORT || config.get('services.redis.port')}`,
    password: `${
        process.env.REDIS_PASSWORD || config.get('services.redis.password')
    }`
});
const ten_minute = 10 * 60;

exports.set = (key, objectCache, expired = ten_minute) => {
    const object = JSON.stringify(objectCache);

    return client.setAsync(`${key}`, object, 'EX', expired).then((result) => {
        return Promise.resolve(objectCache);
    });
};

exports.get = (key) => {
    return client.getAsync(`${key}`).then((result) => {
        try {
            const object = JSON.parse(result);
            return Promise.resolve(object);
        } catch (error) {
            return Promise.resolve(result);
        }
    });
};

exports.delete = (key) => {
    return client.delAsync(`${key}`).then((result) => {
        return Promise.resolve(key);
    });
};

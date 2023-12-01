const { createRedisConnection } = require('./connect');

module.exports = (redisConfig) => {
    const client = createRedisConnection(redisConfig);

    client.on('connect', () => {
        console.log('Redis is connected.');
    });

    client.on('error', (error) => {
        console.log('Redis is error.', error);
    });
    return client;
};

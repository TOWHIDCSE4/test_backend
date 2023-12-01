const redis = require('redis');

const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

exports.createRedisConnection = (args) => {
    return redis.createClient(args);
};

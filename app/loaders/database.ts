import Mongoose from 'mongoose';
const Glob = require('glob');
const logger = require('dy-logger');
import config from 'config';

const connect = async () => {
    const mongoUri: string =
        process.env.MONGO_URI || config.get('services.mongodb.uri');
    return new Promise((resolve, reject) => {
        Mongoose.Promise = global.Promise;

        Mongoose.connect(
            mongoUri,
            {
                useCreateIndex: true,
                // useNewUrlParser: true,
                // useUnifiedTopology: true,
                useFindAndModify: false
            },
            function (err) {
                if (err) throw err;
            }
        );

        process.on('SIGINT', function () {
            Mongoose.connection.close(function () {
                logger.info(
                    'Mongo Database disconnected through app termination'
                );
                process.exit(0);
            });
        });

        Mongoose.connection.on('connected', function () {
            resolve('Mongo Database connected');
        });

        Mongoose.connection.on('disconnected', function () {
            reject('Mongo Database disconnected');
        });

        let models = Glob.sync('app/models/*.ts');
        models.forEach(function (model: any) {
            import('../../' + model);
        });
    });
};

export default connect;

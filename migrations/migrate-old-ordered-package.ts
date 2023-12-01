const mongoose = require('mongoose');
import moment from 'moment';

const url = 'mongodb://localhost:27017/ispeak-backend';

import OrderedPackage, {
    OrderedPackageModel
} from '../app/models/ordered-package';
import { UserModel } from '../app/models/user';
let count = 0;

// ngày 5/12
// migrate lại create_time từ string về date
const migrate = async () => {
    await mongoose.connect(url);
    // migrate data
    await OrderedPackageModel.updateMany({}, [
        { $set: { created_time: { $toDate: '$created_time' } } }
    ]);
    process.exit(1);
};

migrate();

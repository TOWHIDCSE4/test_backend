const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import RegularCalendar, {
    RegularCalendarModel
} from '../app/models/regular-calendar';
let count = 0;
const update = async (iterator: RegularCalendar) => {
    try {
        iterator.created_time = new Date(iterator?.created_time || '');
        await iterator.save();
        count++;
    } catch (error) {
        console.log(error.message);
        await iterator.delete();
    }
};

const migrate = async () => {
    await mongoose.connect(url);
    // migrate data
    const data = await RegularCalendarModel.find({});
    console.log('======>Total', data.length);
    let arr: any = [];
    await Promise.all(
        data.map(async (e) => {
            await update(e);
        })
    );

    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();

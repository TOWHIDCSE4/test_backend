const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import Booking, { BookingModel } from '../app/models/booking';
import { UnitModel } from '../app/models/unit';
let count = 0;

const updateBooking = async (iterator: Booking) => {
    if (iterator.unit) {
        const unit = await UnitModel.findById(iterator.unit);
        if (unit) {
            iterator.unit_id = unit.id;
            await iterator.save();
            count++;
        }
    }
};

// ngày 16/11
// migrate lại unit old data booking do cronjob lỗi hôm 15
const migrate = async () => {
    await mongoose.connect(url);
    // migrate booking
    const bookings = await BookingModel.find({ unit_id: -1 });
    console.log('======>Total', bookings.length);
    let arr: any = [];
    for (const iterator of bookings) {
        if (arr.length === 20) {
            await Promise.all(arr);
            arr = [];
        } else {
            arr.push(updateBooking(iterator));
        }
    }
    // update data còn lại trong mảng
    if (arr.length) {
        await Promise.all(arr);
    }
    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();

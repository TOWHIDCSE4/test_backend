const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import { CustomerSupportStudentModel } from '../app/models/customer-support-student';
import { StudentModel } from '../app/models/student';
let count = 0;
// ngày 07/11
// thêm thông tin chăm sóc mặc định vào các user chưa có thông tin chăm sóc
const migrate = async () => {
    await mongoose.connect(url);
    const data = await StudentModel.find({});
    console.log('======>Total', data.length);
    for (const iterator of data) {
        if (iterator.staff_id) {
            const exits = await CustomerSupportStudentModel.findOne({
                user_id: iterator.user_id
            });
            if (!exits) {
                const subject = {
                    user_id: iterator.user_id,
                    supporter: {
                        staff_id: iterator.staff_id,
                        greeting_call: 0,
                        checking_call: 0,
                        scheduled: 0
                    },
                    customer_care: [
                        {
                            date: new Date(),
                            customer_type: 0,
                            type: 0,
                            parent_opinion: '',
                            video_feedback: '',
                            teacher_feedback: '',
                            note: '',
                            input_level: 0,
                            output_level: 0,
                            history: []
                        }
                    ],
                    ref: {}
                };
                const newModel = new CustomerSupportStudentModel({
                    ...subject,
                    created_time: new Date(),
                    updated_time: new Date()
                });
                await newModel.save();
                count++;
            }
        }
    }
    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();

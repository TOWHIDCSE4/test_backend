const mongoose = require('mongoose');
const url = 'mongodb://localhost:27017/ispeak-backend';

import { TeacherSalaryModel } from '../app/models/teacher-salary';
let count = 0;

const migrate = async () => {
    await mongoose.connect(url);
    // migrate data
    const data = await TeacherSalaryModel.find({});
    console.log(data[0].percent_absent_punish_first_3_premium);
    console.log('======>Total', data.length);
    let arr: any = [];
    await Promise.all(
        data.map(async (iterator) => {
            try {
                if (iterator?.percent_absent_punish_first_3_premium) {
                    iterator.percent_absent_punish_first_3_slot =
                        iterator?.percent_absent_punish_first_3_premium;
                }
                if (iterator.punish.total_punish_absent_first_3_premium) {
                    iterator.punish.total_punish_absent_first_3_slot =
                        iterator.punish.total_punish_absent_first_3_premium;
                    iterator.punish.list_absent_first_3_slot =
                        iterator?.punish.list_absent_first_3_premium;
                }
                count++;
                await iterator.save();
            } catch (error) {
                console.log(error.message);
            }
        })
    );

    console.log(`======>Updated ${count}`);
    process.exit(1);
};

migrate();

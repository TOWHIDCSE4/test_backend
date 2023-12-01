import { ProtectedRequest } from 'app-request';
import { Response } from 'express';
import moment from 'moment';
import config from 'config';
import _ from 'lodash';
import { SuccessResponse, ResponseStatus } from './../core/ApiResponse';
import BookingActions from '../actions/booking';
import TemplateActions from '../actions/template';
import Booking, { EnumBookingStatus } from '../models/booking';
import JobQueueServices from '../services/job-queue';
import { EmailTemplate, EMAIL_ADDRESS_EXCEPTION } from '../const/notification';
import { EnumPackageOrderType } from '../const/package';
import TeacherActions from '../actions/teacher';
import {
    LOCATION_ID_ASIAN,
    LOCATION_ID_BANNGU,
    LOCATION_ID_VIETNAM
} from '../const';
import LocationActions from '../actions/location';
import ReportBodActions from '../actions/report-bod';
import WalletActions from '../actions/wallet';
import {
    EnumWalletHistoryStatus,
    EnumWalletHistoryType,
    WalletHistoryModel
} from '../models/wallet-history';

const EMAIL_ADDRESS_BOD = JSON.parse(
    JSON.stringify(config.get('server.daily_report_mail'))
);
export default class DailReportController {
    public static async dailyReportAbsentCancel(
        req: ProtectedRequest,
        res: Response
    ) {
        const min = moment().startOf('day').subtract(1, 'day');
        const max = moment().endOf('day').subtract(1, 'day');
        const listBooking = await BookingActions.findAll({
            status: [
                EnumBookingStatus.STUDENT_ABSENT,
                EnumBookingStatus.CANCEL_BY_STUDENT,
                EnumBookingStatus.TEACHER_ABSENT,
                EnumBookingStatus.CANCEL_BY_TEACHER
            ],
            min_start_time: min.valueOf(),
            max_end_time: max.valueOf()
        });
        const template = await TemplateActions.findOne({
            code: EmailTemplate.DAILY_REPORT_ABSENT_CANCEL_TO_BOD
        });
        if (template) {
            const listStudentAbsent = listBooking
                .filter((e) => e.status === EnumBookingStatus.STUDENT_ABSENT)
                .sort((a, b) => {
                    return a.student_id - b.student_id;
                });
            const listStudentCancel = listBooking
                .filter((e) => e.status === EnumBookingStatus.CANCEL_BY_STUDENT)
                .sort((a, b) => {
                    return a.student_id - b.student_id;
                });
            const listTeacherAbsent = listBooking
                .filter((e) => e.status === EnumBookingStatus.TEACHER_ABSENT)
                .sort((a, b) => {
                    return a.teacher_id - b.teacher_id;
                });
            const listTeacherCancel = listBooking
                .filter((e) => e.status === EnumBookingStatus.CANCEL_BY_TEACHER)
                .sort((a, b) => {
                    return a.teacher_id - b.teacher_id;
                });

            const templatePayload = {
                date: min.format('DD/MM/YYYY'),
                date2: max.format('HH:mm DD/MM/YYYY'),
                number_class_not_done: listBooking.length,
                number_class_student_absent: listStudentAbsent.length,
                list_student_absent: listStudentAbsent
                    .map((e, index) => {
                        return `<p>${index + 1}. ${e.student.full_name}</p>`;
                    })
                    .join(''),
                number_class_student_cancel: listStudentCancel.length,
                list_student_cancel: listStudentCancel
                    .map((e, index) => {
                        return `<p>${index + 1}. ${e.student.full_name}</p>`;
                    })
                    .join(''),
                number_class_teacher_absent: listTeacherAbsent.length,
                list_teacher_absent: listTeacherAbsent
                    .map((e, index) => {
                        return `<p>${index + 1}. ${e.teacher.full_name}</p>`;
                    })
                    .join(''),
                number_class_teacher_cancel: listTeacherCancel.length,
                list_teacher_cancel: listTeacherCancel
                    .map((e, index) => {
                        return `<p>${index + 1}. ${e.teacher.full_name}</p>`;
                    })
                    .join('')
            };

            for (const iterator of EMAIL_ADDRESS_BOD) {
                await JobQueueServices.sendMailWithTemplate({
                    to: iterator,
                    subject: template.title,
                    body: template.content,
                    data: templatePayload
                });
            }
        }

        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }

    public static async storeSailyReportManagement({
        min,
        totalBooked,
        listDone,
        listDoneCA,
        listDoneVN,
        listDoneBN,
        listStudentAbsent,
        listStudentCancel,
        listTeacherAbsent,
        listTeacherCancel,
        listBookingTrial,
        listTeacher,
        totalNotDone,
        costCA,
        ratePHP,
        costVN,
        rateVND,
        costBN,
        rateUSD,
        totalCost,
        cost120
    }: any) {
        let report = await ReportBodActions.findOne({
            date: min.valueOf()
        });

        let revenueDay = 0;
        let costRevenueDay = 0;
        const startDay = moment(min.valueOf()).startOf('day');
        const endDay = moment(min.valueOf()).endOf('day');

        const listDeposit = await WalletHistoryModel.find({
            type: EnumWalletHistoryType.DEPOSIT,
            status: EnumWalletHistoryStatus.DONE,
            created_time: {
                $gte: startDay.toISOString(),
                $lte: endDay.toISOString()
            }
        });
        listDeposit.forEach((e) => {
            revenueDay += e.price;
        });
        costRevenueDay =
            revenueDay !== 0
                ? Number(((cost120 / revenueDay) * 100).toFixed(2))
                : 0;
        const data = {
            date: min.valueOf(),
            total_booked: totalBooked,
            total_done: listDone.length,
            total_done_ca: listDoneCA.length,
            total_done_vn: listDoneVN.length,
            total_done_bn: listDoneBN.length,
            total_not_done: totalNotDone,
            total_student_absent: listStudentAbsent.length,
            total_student_cancel: listStudentCancel.length,
            total_teacher_absent: listTeacherAbsent.length,
            total_teacher_cancel: listTeacherCancel.length,
            total_trial_booked: listBookingTrial.length,
            total_trial_done: listBookingTrial.filter(
                (e: any) => e.status === EnumBookingStatus.COMPLETED
            ).length,
            list_top_10_teacher: listTeacher,
            cost_ca: costCA,
            rate_ca_vnd: ratePHP,
            total_cost_ca: costCA * ratePHP,
            cost_vn: costVN,
            rate_vn_vnd: rateVND,
            total_cost_vn: costVN * rateVND,
            cost_bn: costBN,
            rate_bn_vnd: rateUSD,
            total_cost_bn: rateUSD * costBN,
            total_cost: totalCost,
            cost_120: cost120,
            revenue_day: revenueDay,
            cost_revenue_day: costRevenueDay
        };
        if (!report) {
            report = await ReportBodActions.create(data as any);
        } else {
            await ReportBodActions.update(report._id, data as any);
        }
    }

    public static renderHTMLTableTop10(listTeacher: any) {
        let text = `
<table style="border-collapse: collapse; width: 100%;" border="1">
<tbody>
<tr>
<td style="width: 10.0086%;"><strong>TT</strong></td>
<td style="width: 56.658%;"><strong>T&ecirc;n GV</strong></td>
<td style="width: 33.3333%;"><strong>Số lớp</strong></td>
</tr>
${listTeacher
    .map((e: any, index: number) => {
        return `<tr>
    <td style="width: 10.0086%;">${index + 1}</td>
    <td style="width: 56.658%;">${e.full_name}</td>
    <td style="width: 33.3333%;">${e.count}</td>
    </tr>`;
    })
    .join('')}
</tbody>
</table>`;
        return text;
    }
    public static formatNumber(number: any) {
        return new Intl.NumberFormat('en', { currency: 'VND' }).format(number);
    }
    public static async caculateCost(dataMonth: any, time: number) {
        const day = {
            totalCA: 0,
            totalVN: 0,
            totalBN: 0,
            total: 0,
            total120: 0
        };
        const week = {
            totalCA: 0,
            totalVN: 0,
            totalBN: 0,
            total: 0,
            total120: 0
        };
        const month = {
            totalCA: 0,
            totalVN: 0,
            totalBN: 0,
            total: 0,
            total120: 0
        };

        const startWeek = moment(time).startOf('week').valueOf();
        const endWeek = moment(time).endOf('week').valueOf();

        dataMonth.forEach((e: any) => {
            month.totalCA += e.total_cost_ca;
            month.totalVN += e.total_cost_vn;
            month.totalBN += e.total_cost_bn;
            month.total += e.total_cost;
            month.total120 += e.cost_120;
            if (e.date >= startWeek && e.date <= endWeek) {
                week.totalCA += e.total_cost_ca;
                week.totalVN += e.total_cost_vn;
                week.totalBN += e.total_cost_bn;
                week.total += e.total_cost;
                week.total120 += e.cost_120;
            }
            if (e.date === time) {
                day.totalCA = e.total_cost_ca;
                day.totalVN = e.total_cost_vn;
                day.totalBN = e.total_cost_bn;
                day.total = e.total_cost;
                day.total120 = e.cost_120;
            }
        });

        return {
            day: {
                totalCA: this.formatNumber(day.totalCA),
                totalVN: this.formatNumber(day.totalVN),
                totalBN: this.formatNumber(day.totalBN),
                total: this.formatNumber(day.total),
                total120: this.formatNumber(day.total120)
            },
            week: {
                totalCA: this.formatNumber(week.totalCA),
                totalVN: this.formatNumber(week.totalVN),
                totalBN: this.formatNumber(week.totalBN),
                total: this.formatNumber(week.total),
                total120: this.formatNumber(week.total120)
            },
            month: {
                totalCA: this.formatNumber(month.totalCA),
                totalVN: this.formatNumber(month.totalVN),
                totalBN: this.formatNumber(month.totalBN),
                total: this.formatNumber(month.total),
                total120: this.formatNumber(month.total120)
            }
        };
    }

    public static async caculateRevenue(dataMonth: any, time: number) {
        const revenue = {
            day: 0,
            cost_revenue_day: 0,
            week: 0,
            cost_revenue_week: 0,
            month: 0,
            cost_revenue_month: 0
        };
        let totalCostMonth = 0;
        let totalCostWeek = 0;
        const startWeek = moment(time).startOf('week').valueOf();
        const endWeek = moment(time).endOf('week').valueOf();

        dataMonth.forEach((e: any) => {
            revenue.month += e.revenue_day;
            totalCostMonth += e.cost_120;
            if (e.date >= startWeek && e.date <= endWeek) {
                revenue.week += e.revenue_day;
                totalCostWeek += e.cost_120;
            }
            if (e.date === time) {
                revenue.day = e.revenue_day;
                revenue.cost_revenue_day = e.cost_revenue_day;
            }
        });
        revenue.cost_revenue_month =
            revenue.month !== 0
                ? Number(((totalCostMonth / revenue.month) * 100).toFixed(2))
                : 0;
        revenue.cost_revenue_week =
            revenue.week !== 0
                ? Number(((totalCostWeek / revenue.week) * 100).toFixed(2))
                : 0;
        return {
            day: this.formatNumber(revenue.day),
            cost_revenue_day: revenue.cost_revenue_day,
            week: this.formatNumber(revenue.week),
            totalCostWeek,
            cost_revenue_week: revenue.cost_revenue_week,
            month: this.formatNumber(revenue.month),
            totalCostMonth,
            cost_revenue_month: revenue.cost_revenue_month
        };
    }

    public static async dailyReportManagementFunc(time: number) {
        const min = moment(time).startOf('day');
        const max = moment(time).endOf('day');
        const listBooking = await BookingActions.findAll({
            min_start_time: min.valueOf(),
            max_end_time: max.valueOf()
        });
        const template = await TemplateActions.findOne({
            code: EmailTemplate.DAILY_REPORT_MANAGEMENT
        });
        if (template) {
            const listBookingTrial = listBooking.filter(
                (e) => e.ordered_package.type === EnumPackageOrderType.TRIAL
            );
            const totalBooked = listBooking.length;
            let listTeacher: any = [];
            const listDone: Booking[] = [];
            const listStudentAbsent: Booking[] = [];
            const listStudentCancel: Booking[] = [];
            const listTeacherAbsent: Booking[] = [];
            const listTeacherCancel: Booking[] = [];
            listBooking.forEach((e) => {
                if (e.status === EnumBookingStatus.COMPLETED) {
                    listDone.push(e);
                }
                if (e.status === EnumBookingStatus.STUDENT_ABSENT) {
                    listStudentAbsent.push(e);
                }
                if (e.status === EnumBookingStatus.CANCEL_BY_STUDENT) {
                    listStudentCancel.push(e);
                }
                if (e.status === EnumBookingStatus.TEACHER_ABSENT) {
                    listTeacherAbsent.push(e);
                }
                if (e.status === EnumBookingStatus.CANCEL_BY_TEACHER) {
                    listTeacherCancel.push(e);
                }
                const index = listTeacher.findIndex(
                    (item: any) => item.user_id === e.teacher_id
                );
                if (index !== -1) {
                    listTeacher[index].count++;
                } else {
                    listTeacher.push({
                        user_id: e.teacher_id,
                        full_name: e.teacher.full_name,
                        username: e.teacher.username,
                        count: 1
                    });
                }
            });
            const totalNotDone =
                listStudentAbsent.length +
                listStudentCancel.length +
                listTeacherAbsent.length +
                listTeacherCancel.length;
            listTeacher.sort((a: any, b: any) => b.count - a.count);
            listTeacher = listTeacher.splice(0, 10);

            const listDoneCA: Booking[] = [];
            const listDoneVN: Booking[] = [];
            const listDoneBN: Booking[] = [];
            // to-do đưa vào setting location
            const ratePHP = 500;
            const rateUSD = 24000;
            const rateVND = 1;
            let costCA = 0;
            let costVN = 0;
            let costBN = 0;
            let totalCost = 0;
            await Promise.all(
                listDone.map(async (e) => {
                    const teacher = await TeacherActions.findOne({
                        user_id: e.teacher_id
                    });
                    if (teacher) {
                        if (teacher.location_id === LOCATION_ID_VIETNAM) {
                            listDoneVN.push(e);
                            costVN += teacher.hourly_rate / 2;
                        }
                        if (teacher.location_id === LOCATION_ID_ASIAN) {
                            listDoneCA.push(e);
                            costCA += teacher.hourly_rate / 2;
                        }
                        if (teacher.location_id === LOCATION_ID_BANNGU) {
                            listDoneBN.push(e);
                            costBN += teacher.hourly_rate / 2;
                        }
                    }
                })
            );
            totalCost = costVN * rateVND + ratePHP * costCA + rateUSD * costBN;
            const cost120 = totalCost * 1.2;

            await DailReportController.storeSailyReportManagement({
                min,
                totalBooked,
                listDone,
                listDoneCA,
                listDoneVN,
                listDoneBN,
                listStudentAbsent,
                listStudentCancel,
                listTeacherAbsent,
                listTeacherCancel,
                listBookingTrial,
                listTeacher,
                costCA,
                ratePHP,
                totalNotDone,
                costVN,
                rateVND,
                costBN,
                rateUSD,
                totalCost,
                cost120
            });
            const startMonth = moment(min.valueOf()).startOf('month');
            const endMonth = moment(min.valueOf()).endOf('month');
            const dataMonth = await ReportBodActions.findAll({
                date: {
                    $gte: startMonth.valueOf(),
                    $lte: endMonth.valueOf()
                }
            });
            const cost = await DailReportController.caculateCost(
                dataMonth,
                min.valueOf()
            );
            const revenue = await DailReportController.caculateRevenue(
                dataMonth,
                min.valueOf()
            );

            const table_top_10_gv =
                DailReportController.renderHTMLTableTop10(listTeacher);
            const templatePayload = {
                date: min.format('DD/MM/YYYY'),
                date2: max.format('HH:mm DD/MM/YYYY'),
                total: totalBooked,
                total_done: listDone.length,
                total_done_ca: listDoneCA.length,
                total_done_vn: listDoneVN.length,
                total_done_bn: listDoneBN.length,
                total_not_done: totalNotDone,
                total_student_absent: listStudentAbsent.length,
                total_teacher_absent: listTeacherAbsent.length,
                total_student_cancel: listStudentCancel.length,
                total_teacher_cancel: listTeacherCancel.length,
                total_trial_done: `${
                    listBookingTrial.filter(
                        (e: any) => e.status === EnumBookingStatus.COMPLETED
                    ).length
                } / Booked ${listBookingTrial.length}`,
                table_top_10_gv,
                cost,
                revenue
            };
            for (const iterator of EMAIL_ADDRESS_BOD) {
                await JobQueueServices.sendMailWithTemplate({
                    to: iterator,
                    subject: template.title,
                    body: template.content,
                    data: templatePayload
                });
            }
        }
    }
    public static async dailyReportManagement(
        req: ProtectedRequest,
        res: Response
    ) {
        const time = moment().subtract(1, 'day').valueOf();
        await DailReportController.dailyReportManagementFunc(time);
        return new SuccessResponse(req.t('common.success'), '').send(res, req);
    }
}

async function caculateMonth() {
    const start = moment().startOf('month');
    const end = moment().subtract(1, 'day');
    while (start.valueOf() < end.valueOf()) {
        console.log('caculate:', start.format('DD/MM/YYYY'));
        await DailReportController.dailyReportManagementFunc(start.valueOf());
        start.add(1, 'day');
    }
}
async function caculate() {
    const time = moment().subtract(1, 'day');
    await DailReportController.dailyReportManagementFunc(time.valueOf());
}
// caculateMonth();
// caculate();
// DailReportController.dailyReportAbsentCancel();

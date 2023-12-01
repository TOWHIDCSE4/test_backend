import fs from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';
import Handlebars from 'handlebars';

import UploadServices from '../upload';

export default class PdfGeneratorServices {
    public static async createPDF(data: any): Promise<string> {
        const template_html = fs.readFileSync(
            path.join(
                'app/services/pdf-generator',
                'recommendation-letter-template.html'
            ),
            'utf8'
        );
        const template = Handlebars.compile(template_html);
        const html = template(data);
        const pdf_path = path.join(
            `uploads`,
            `${data.student_name}_recommendation_letter.pdf`
        );
        const options = {
            width: '800px',
            headerTemplate: '<p></p>',
            footerTemplate: '<p></p>',
            displayHeaderFooter: false,
            margin: {
                top: '10px',
                bottom: '30px'
            },
            printBackground: true,
            path: pdf_path
        };
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'],
            headless: true
        });

        const page = await browser.newPage();
        await page.goto(`data:text/html;charset=UTF-8,${html}`, {
            waitUntil: 'networkidle0'
        });
        await page.pdf(options);
        await browser.close();
        const uploaded_link = await UploadServices.uploadFile(pdf_path);
        /** Remove the generated file here to save space */
        await fs.unlinkSync(pdf_path);
        return uploaded_link;
    }
}

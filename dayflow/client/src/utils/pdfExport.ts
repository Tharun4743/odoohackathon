import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import type { Payroll } from '../types';
import toast from 'react-hot-toast';

/**
 * Generates an official, perfectly-aligned vector PDF payslip.
 * Uses standard ASCII currency labels (Rs.) to avoid UTF-8 font glyph encoding issues.
 */
export const downloadPayslipPDF = (payslip: Payroll) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm
    let y = 14;

    // --- 1. TOP HEADER BANNER ---
    doc.setFillColor(24, 24, 27); // Stone 900
    doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'F');

    // Company Name & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('WORK SUITE HRMS', margin + 7, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(214, 211, 209);
    doc.text('Every workday, perfectly aligned.', margin + 7, y + 16.5);

    // Right Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('SALARY PAYSLIP', margin + contentWidth - 7, y + 9.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(214, 211, 209);
    doc.text(`Period: ${payslip.pay_period}  |  Generated: ${format(new Date(), 'dd-MM-yyyy')}`, margin + contentWidth - 7, y + 16.5, { align: 'right' });

    y += 29;

    // --- 2. EMPLOYEE DETAILS BOX ---
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(250, 250, 249);
    doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

    doc.setTextColor(28, 25, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('EMPLOYEE DETAILS', margin + 6, y + 6);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(87, 83, 78);

    const c1X = margin + 6;
    const c2X = margin + 68;
    const c3X = margin + 130;

    const empName = `${payslip.first_name || ''} ${payslip.last_name || ''}`.trim() || 'Employee';
    const empCode = payslip.employee_code || 'EMP-001';
    const deptName = payslip.department_name || 'General Operations';
    const designation = payslip.designation || 'Staff Member';

    doc.text(`Name: ${empName}`, c1X, y + 13.5);
    doc.text(`Employee Code: ${empCode}`, c1X, y + 20.5);

    doc.text(`Department: ${deptName}`, c2X, y + 13.5);
    doc.text(`Designation: ${designation}`, c2X, y + 20.5);

    doc.text(`Pay Period: ${payslip.pay_period}`, c3X, y + 13.5);
    doc.text(`Payment Status: Paid`, c3X, y + 20.5);

    y += 31;

    // --- 3. ATTENDANCE METRICS SUMMARY ---
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(245, 245, 244);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    doc.text('ATTENDANCE METRICS', margin + 6, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(87, 83, 78);

    const totalDays = Math.round(Number(payslip.total_working_days) || 30);
    const presentDays = Number(payslip.present_days !== undefined ? payslip.present_days : totalDays);
    const leaveDays = Number((payslip.paid_leave_days || 0) + (payslip.unpaid_leave_days || 0));
    const payableDays = Number(payslip.payable_days !== undefined ? payslip.payable_days : totalDays);

    const attY = y + 12.5;
    doc.text(`Total Days: ${totalDays}`, margin + 6, attY);
    doc.text(`Present Days: ${presentDays.toFixed(1)}`, margin + 52, attY);
    doc.text(`Total Leaves: ${leaveDays.toFixed(1)}`, margin + 100, attY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text(`Payable Days: ${payableDays.toFixed(1)}`, margin + 144, attY);

    y += 23;

    // --- 4. SALARY BREAKDOWN (TWO-COLUMN TABLES) ---
    const colWidth = (contentWidth - 6) / 2; // 88mm each

    // === EARNINGS COLUMN ===
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, colWidth, 58, 2, 2, 'D');

    doc.setFillColor(245, 245, 244);
    doc.rect(margin, y, colWidth, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    doc.text('EARNINGS', margin + 5, y + 5.2);
    doc.text('AMOUNT (INR)', margin + colWidth - 5, y + 5.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);

    const basicSalary = Number(payslip.basic_salary || 0);
    const allowances = Number(payslip.allowances || 0);
    const grossSalary = Number(payslip.gross_salary || (basicSalary + allowances));

    let rowY = y + 13.5;
    doc.text('Basic Salary', margin + 5, rowY);
    doc.text(`Rs. ${basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + colWidth - 5, rowY, { align: 'right' });

    rowY += 7.5;
    doc.text('House Rent Allowance (HRA)', margin + 5, rowY);
    doc.text(`Rs. ${allowances.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + colWidth - 5, rowY, { align: 'right' });

    rowY += 7.5;
    doc.text('Special / Fixed Allowance', margin + 5, rowY);
    doc.text('Rs. 0.00', margin + colWidth - 5, rowY, { align: 'right' });

    // Gross Line
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y + 46, margin + colWidth, y + 46);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 25, 23);
    doc.text('Gross Earnings', margin + 5, y + 52.5);
    doc.text(`Rs. ${grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + colWidth - 5, y + 52.5, { align: 'right' });

    // === DEDUCTIONS COLUMN ===
    const dedX = margin + colWidth + 6;
    doc.roundedRect(dedX, y, colWidth, 58, 2, 2, 'D');

    doc.setFillColor(245, 245, 244);
    doc.rect(dedX, y, colWidth, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(28, 25, 23);
    doc.text('DEDUCTIONS', dedX + 5, y + 5.2);
    doc.text('AMOUNT (INR)', dedX + colWidth - 5, y + 5.2, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);

    const deductions = Number(payslip.deductions || 0);

    let dRowY = y + 13.5;
    doc.text('Provident Fund (PF)', dedX + 5, dRowY);
    doc.text(`Rs. ${deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, dedX + colWidth - 5, dRowY, { align: 'right' });

    dRowY += 7.5;
    doc.text('Professional Tax', dedX + 5, dRowY);
    doc.text('Rs. 200.00', dedX + colWidth - 5, dRowY, { align: 'right' });

    dRowY += 7.5;
    doc.text('Unpaid Leave Loss', dedX + 5, dRowY);
    doc.text('Rs. 0.00', dedX + colWidth - 5, dRowY, { align: 'right' });

    // Total Deductions Line
    doc.setDrawColor(229, 231, 235);
    doc.line(dedX, y + 46, dedX + colWidth, y + 46);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 25, 23);
    doc.text('Total Deductions', dedX + 5, y + 52.5);
    doc.text(`Rs. ${deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, dedX + colWidth - 5, y + 52.5, { align: 'right' });

    y += 64;

    // --- 5. NET SALARY PAYABLE BANNER ---
    doc.setFillColor(24, 24, 27); // Solid Black
    doc.roundedRect(margin, y, contentWidth, 22, 2.5, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('NET SALARY PAYABLE', margin + 8, y + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(214, 211, 209);
    doc.text(`Computed on ${payableDays.toFixed(1)} verified payable days`, margin + 8, y + 15.5);

    const netSalary = Number(payslip.net_salary || (grossSalary - deductions));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rs. ${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, margin + contentWidth - 8, y + 13.5, { align: 'right' });

    y += 30;

    // --- 6. FOOTER NOTE ---
    doc.setTextColor(168, 162, 158);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('This is a computer-generated payslip from Work Suite HRMS. No physical signature is required.', pageWidth / 2, y, { align: 'center' });

    // Download PDF
    const filename = `payslip-${payslip.pay_period}-${payslip.employee_code || 'emp'}.pdf`;
    doc.save(filename);
    toast.success(`Payslip downloaded: ${filename}`);
  } catch (err) {
    console.error('❌ PDF generation failed:', err);
    toast.error('Failed to generate PDF. Opening print dialog...');
    window.print();
  }
};

/**
 * Captures any HTML element and downloads it as a PDF.
 * Uses html2canvas + jsPDF with full options and error recovery.
 */
export const downloadElementAsPDF = async (element: HTMLElement, filename: string, landscape = false) => {
  const toastId = toast.loading('Generating PDF...');
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    doc.addImage(imgData, 'PNG', margin, margin, imgWidth, Math.min(imgHeight, pageHeight - margin * 2));
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    toast.dismiss(toastId);
    toast.success('PDF downloaded successfully!');
  } catch (err) {
    toast.dismiss(toastId);
    console.error('❌ Canvas PDF export failed:', err);
    toast.error('Failed to generate canvas PDF. Launching print view...');
    window.print();
  }
};

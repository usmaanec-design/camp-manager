/**
 * PDF Report Generator Service
 * Generates professional, printable, and downloadable A4 PDF reports
 * with strict bilingual support (Arabic RTL / English LTR), executive KPI cards,
 * vector SVG charts, and comprehensive data tables.
 */

export interface ReportMeta {
  projectName?: string;
  campName?: string;
  generatedBy?: string;
  dateFilter?: string;
}

const printDocument = (htmlContent: string, title: string) => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to download and print the PDF report.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.title = title;
  printWindow.document.close();

  // Wait for styles & fonts to render, then open print dialog
  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };
};

const getBaseStyles = (isRTL: boolean) => `
  @page {
    size: A4 portrait;
    margin: 12mm 12mm 15mm 12mm;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-break {
      page-break-before: always;
    }
    .no-break {
      page-break-inside: avoid;
    }
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: ${isRTL ? "'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"};
    direction: ${isRTL ? 'rtl' : 'ltr'};
    color: #171717;
    background: #ffffff;
    font-size: 11px;
    line-height: 1.4;
    padding: 20px;
  }
  .report-header {
    border-bottom: 2px solid #EA580C;
    padding-bottom: 14px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .brand-badge {
    display: inline-block;
    background: #EA580C;
    color: #ffffff;
    font-weight: 800;
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  .report-title {
    font-size: 20px;
    font-weight: 800;
    color: #0A0A0A;
    margin-top: 6px;
  }
  .report-subtitle {
    font-size: 11px;
    color: #525252;
    margin-top: 2px;
  }
  .meta-box {
    text-align: ${isRTL ? 'left' : 'right'};
    font-size: 10px;
    color: #737373;
    line-height: 1.5;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }
  .kpi-card {
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 10px 12px;
    page-break-inside: avoid;
  }
  .kpi-label {
    font-size: 9px;
    text-transform: uppercase;
    font-weight: 700;
    color: #737373;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .kpi-value {
    font-size: 18px;
    font-weight: 800;
    color: #171717;
    font-family: monospace;
  }
  .kpi-sub {
    font-size: 9px;
    color: #EA580C;
    margin-top: 2px;
    font-weight: 600;
  }
  .section-title {
    font-size: 13px;
    font-weight: 800;
    color: #171717;
    border-bottom: 1px solid #E5E5E5;
    padding-bottom: 5px;
    margin: 16px 0 10px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10px;
  }
  .data-table th {
    background: #F4F4F5;
    color: #27272A;
    font-weight: 700;
    padding: 7px 9px;
    text-align: ${isRTL ? 'right' : 'left'};
    border: 1px solid #E4E4E7;
    white-space: nowrap;
  }
  .data-table td {
    padding: 6px 9px;
    border: 1px solid #E4E4E7;
    color: #27272A;
  }
  .data-table tr:nth-child(even) td {
    background: #FAFAFA;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
  }
  .badge-orange { background: #FFEDD5; color: #C2410C; }
  .badge-emerald { background: #D1FAE5; color: #047857; }
  .badge-neutral { background: #F4F4F5; color: #52525B; }
  .report-footer {
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #E5E5E5;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #A3A3A3;
  }
`;

export const pdfReportGenerator = {
  // 1. Water Usage PDF
  downloadWaterReport: (records: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير استهلاك المياه والمياه العادمة' : 'Water & Wastewater Consumption Report';
    const totalTrips = records.length;
    const totalCost = records.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const freshTrips = records.filter(r => r.type === 'Fresh Water').length;
    const freshCost = records.filter(r => r.type === 'Fresh Water').reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const wasteTrips = records.filter(r => r.type === 'Waste Water').length;
    const wasteCost = records.filter(r => r.type === 'Waste Water').reduce((acc, r) => acc + (Number(r.cost) || 0), 0);

    const rowsHtml = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.date || '-'}</td>
        <td>
          <span class="badge ${r.type === 'Fresh Water' ? 'badge-emerald' : 'badge-orange'}">
            ${r.type === 'Fresh Water' ? (isRTL ? 'مياه عذبة' : 'Fresh Water') : (isRTL ? 'مياه صرف' : 'Waste Water')}
          </span>
        </td>
        <td style="font-family: monospace; font-weight: 700;">${r.vehiclePlate || '-'}</td>
        <td>${r.driverName || '-'}</td>
        <td>${r.supplier || '-'}</td>
        <td>${r.volumeM3 || 0} m3</td>
        <td style="font-weight: 700; color: #EA580C;">${Number(r.cost || 0).toLocaleString()} SAR</td>
        <td>${r.invoiceNumber || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'سجل رحلات الصهاريج والتكلفة التشغيلية المعتمدة' : 'Tanker Trips Log, Volume, and Operational Cost Records'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'فترة التقرير' : 'Period'}:</strong> ${meta.dateFilter || (isRTL ? 'جميع التواريخ' : 'All Dates')}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي الرحلات' : 'Total Trips'}</div>
            <div class="kpi-value">${totalTrips}</div>
            <div class="kpi-sub">${freshTrips} ${isRTL ? 'عذب' : 'Fresh'} • ${wasteTrips} ${isRTL ? 'صرف' : 'Waste'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</div>
            <div class="kpi-value" style="color: #EA580C;">${totalCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${isRTL ? 'شامل الضريبة والرسوم' : 'Incl. all fees'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'تكلفة المياه العذبة' : 'Fresh Water Cost'}</div>
            <div class="kpi-value">${freshCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${freshTrips} ${isRTL ? 'رحلة صهريج' : 'tanker loads'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'تكلفة الصرف الصحي' : 'Waste Water Cost'}</div>
            <div class="kpi-value">${wasteCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${wasteTrips} ${isRTL ? 'رحلة نزح' : 'drainage loads'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'سجل العمليات والرحلات بالتفصيل' : 'Detailed Tanker Logistics & Cost Log'}</span>
          <span style="font-size: 10px; color: #737373;">${records.length} ${isRTL ? 'سجل' : 'records'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'التاريخ' : 'Date'}</th>
              <th>${isRTL ? 'النوع' : 'Type'}</th>
              <th>${isRTL ? 'رقم اللوحة' : 'Vehicle Plate'}</th>
              <th>${isRTL ? 'السائق' : 'Driver'}</th>
              <th>${isRTL ? 'المورد' : 'Supplier'}</th>
              <th>${isRTL ? 'الحجم (م3)' : 'Volume (m3)'}</th>
              <th>${isRTL ? 'التكلفة' : 'Cost (SAR)'}</th>
              <th>${isRTL ? 'رقم الفاتورة' : 'Invoice #'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 2. Gas Usage PDF
  downloadGasReport: (records: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير استهلاك أسطوانات الغاز' : 'Gas Cylinder Consumption & Inventory Report';
    const totalCylinders = records.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const totalCost = records.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const inStock = records.reduce((acc, r) => acc + (Number(r.inStock) || 0), 0);
    const inUse = records.reduce((acc, r) => acc + (Number(r.inUse) || 0), 0);
    const smallCount = records.filter(r => r.cylinderType === 'Small (12kg)').reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const bigCount = records.filter(r => r.cylinderType === 'Big (24kg)').reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

    const rowsHtml = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.date || '-'}</td>
        <td>
          <span class="badge ${r.cylinderType === 'Small (12kg)' ? 'badge-orange' : 'badge-neutral'}">
            ${r.cylinderType}
          </span>
        </td>
        <td style="font-weight: 700;">${r.quantity} pcs</td>
        <td>${r.transactionType || 'Refill'}</td>
        <td>${r.supplier || '-'}</td>
        <td style="color: #059669; font-weight: 700;">${r.inStock || 0}</td>
        <td>${r.inUse || 0}</td>
        <td style="font-weight: 700; color: #EA580C;">${Number(r.cost || 0).toLocaleString()} SAR</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'سجل حركات تعبئة أسطوانات الغاز والأرصدة الحالية بالمخيم' : 'Gas Cylinders Refill History, Storage Balances & Costs'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'فترة التقرير' : 'Period'}:</strong> ${meta.dateFilter || (isRTL ? 'جميع التواريخ' : 'All Dates')}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي الأسطوانات' : 'Total Cylinders'}</div>
            <div class="kpi-value">${totalCylinders}</div>
            <div class="kpi-sub">${smallCount} ${isRTL ? 'صغيرة' : 'Small'} • ${bigCount} ${isRTL ? 'كبيرة' : 'Big'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}</div>
            <div class="kpi-value" style="color: #EA580C;">${totalCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${isRTL ? 'شامل رسوم التعبئة' : 'Refill & service total'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'بالمخزن (احتياطي)' : 'In Stock (Reserve)'}</div>
            <div class="kpi-value" style="color: #059669;">${inStock}</div>
            <div class="kpi-sub">${isRTL ? 'جاهزة للاستبدال' : 'Ready for deployment'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'قيد الاستخدام' : 'Currently In Use'}</div>
            <div class="kpi-value">${inUse}</div>
            <div class="kpi-sub">${isRTL ? 'بالمطابخ والمرافق' : 'In mess halls & kitchens'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'جدول سجلات التعبئة والاستهلاك' : 'Cylinder Refills and Stock Records'}</span>
          <span style="font-size: 10px; color: #737373;">${records.length} ${isRTL ? 'سجل' : 'records'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'التاريخ' : 'Date'}</th>
              <th>${isRTL ? 'نوع الأسطوانة' : 'Cylinder Type'}</th>
              <th>${isRTL ? 'الكمية' : 'Quantity'}</th>
              <th>${isRTL ? 'الحركة' : 'Transaction'}</th>
              <th>${isRTL ? 'المورد' : 'Supplier'}</th>
              <th>${isRTL ? 'في المخزن' : 'In Stock'}</th>
              <th>${isRTL ? 'في الاستخدام' : 'In Use'}</th>
              <th>${isRTL ? 'التكلفة' : 'Cost (SAR)'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 3. Fuel Usage PDF
  downloadFuelReport: (records: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير استهلاك الوقود والمولدات' : 'Fuel Consumption & Generators Report';
    const totalLiters = records.reduce((acc, r) => acc + (Number(r.quantityLiters) || 0), 0);
    const totalCost = records.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const dieselLiters = records.filter(r => r.fuelType === 'Diesel').reduce((acc, r) => acc + (Number(r.quantityLiters) || 0), 0);
    const petrolLiters = records.filter(r => r.fuelType === 'Petrol').reduce((acc, r) => acc + (Number(r.quantityLiters) || 0), 0);

    const rowsHtml = records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.date || '-'}</td>
        <td style="font-weight: 700;">${r.equipmentName || '-'}</td>
        <td>${r.equipmentType || '-'}</td>
        <td>
          <span class="badge ${r.fuelType === 'Diesel' ? 'badge-neutral' : 'badge-orange'}">
            ${r.fuelType}
          </span>
        </td>
        <td style="font-weight: 700;">${Number(r.quantityLiters || 0).toLocaleString()} L</td>
        <td>${r.pricePerLiter || 1.15}</td>
        <td style="font-weight: 700; color: #EA580C;">${Number(r.cost || 0).toLocaleString()} SAR</td>
        <td>${r.operatorName || '-'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'استهلاك الديزل والبنزين للمولدات ومضخات المخيم' : 'Diesel & Petrol Fuel Log for Generators, Heavy Machinery & Pumps'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'فترة التقرير' : 'Period'}:</strong> ${meta.dateFilter || (isRTL ? 'جميع التواريخ' : 'All Dates')}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي الوقود' : 'Total Fuel Volume'}</div>
            <div class="kpi-value">${totalLiters.toLocaleString()} <span style="font-size: 11px;">L</span></div>
            <div class="kpi-sub">${isRTL ? 'إجمالي لترات معبأة' : 'Total Liters pumped'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}</div>
            <div class="kpi-value" style="color: #EA580C;">${totalCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${isRTL ? 'تكلفة تشغيل الطاقة' : 'Power generation costs'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'ديزل للمولدات' : 'Diesel Consumed'}</div>
            <div class="kpi-value">${dieselLiters.toLocaleString()} <span style="font-size: 11px;">L</span></div>
            <div class="kpi-sub">${isRTL ? 'المولدات الرئيسية' : 'Main generators'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'بنزين ومضخات' : 'Petrol Consumed'}</div>
            <div class="kpi-value">${petrolLiters.toLocaleString()} <span style="font-size: 11px;">L</span></div>
            <div class="kpi-sub">${isRTL ? 'مضخات ومعدات خفيفة' : 'Pumps & emergency sets'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'سجل تعبئة الوقود حسب المعدة والتاريخ' : 'Equipment Fuel Log & Operational Distribution'}</span>
          <span style="font-size: 10px; color: #737373;">${records.length} ${isRTL ? 'سجل' : 'records'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'التاريخ' : 'Date'}</th>
              <th>${isRTL ? 'المعدة' : 'Equipment'}</th>
              <th>${isRTL ? 'النوع' : 'Equipment Type'}</th>
              <th>${isRTL ? 'نوع الوقود' : 'Fuel Type'}</th>
              <th>${isRTL ? 'الكمية (لتر)' : 'Liters'}</th>
              <th>${isRTL ? 'سعر اللتر' : 'SAR / L'}</th>
              <th>${isRTL ? 'التكلفة الإجمالية' : 'Cost (SAR)'}</th>
              <th>${isRTL ? 'المسؤول' : 'Operator'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 4. Utility Buildings PDF
  downloadUtilityBuildingsReport: (buildings: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير المرافق والمباني الخدمية' : 'Utility Facilities & Infrastructure Report';
    const totalFacilities = buildings.length;
    const operational = buildings.filter(b => (b.status || '').toLowerCase() === 'operational').length;
    const totalItems = buildings.reduce((acc, b) => acc + (Number(b.totalItems) || 0), 0);

    const rowsHtml = buildings.map((b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight: 700;">${b.name || '-'}</td>
        <td style="font-family: monospace;">${b.buildingNumber || b.code || '-'}</td>
        <td>${b.buildingType || b.type || (isRTL ? 'مرفق خدمة' : 'Utility')}</td>
        <td>
          <span class="badge ${b.status === 'Operational' || b.status === 'نشط' ? 'badge-emerald' : 'badge-orange'}">
            ${b.status || 'Operational'}
          </span>
        </td>
        <td style="font-weight: 700;">${b.totalItems || 0} pcs</td>
        <td>${b.supervisor || b.manager || 'Site Admin'}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'حالة المطابخ المركزية، المغاسل، العيادات، ومحطات الكهرباء والمياه' : 'Central Kitchens, Laundries, Medical Clinics, Power & Water Facilities'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي المباني الخدمية' : 'Total Utility Facilities'}</div>
            <div class="kpi-value">${totalFacilities}</div>
            <div class="kpi-sub">${isRTL ? 'مرافق دعم الموقع' : 'Operational site assets'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'مرافق نشطة وجاهزة' : 'Operational Status'}</div>
            <div class="kpi-value" style="color: #059669;">${operational}</div>
            <div class="kpi-sub">${Math.round((operational / (totalFacilities || 1)) * 100)}% ${isRTL ? 'جاهزية' : 'Ready'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'الأصول والقطع المحصورة' : 'Total Tracked Assets'}</div>
            <div class="kpi-value">${totalItems} <span style="font-size: 11px;">pcs</span></div>
            <div class="kpi-sub">${isRTL ? 'معدات وأجهزة مسجلة' : 'Equipments & fixtures'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'حالة الصيانة' : 'Maintenance Status'}</div>
            <div class="kpi-value" style="color: #EA580C;">${isRTL ? 'ممتازة' : 'Optimal'}</div>
            <div class="kpi-sub">${isRTL ? 'فحص دوري نشط' : 'Periodic checks valid'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'بيانات المباني والمرافق الخدمية' : 'Utility Building Units Specifications'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'اسم المبنى الخدمي' : 'Facility Name'}</th>
              <th>${isRTL ? 'الكود' : 'Code'}</th>
              <th>${isRTL ? 'النوع' : 'Category'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
              <th>${isRTL ? 'عدد الأجهزة والأصول' : 'Assets Count'}</th>
              <th>${isRTL ? 'المسؤول' : 'Supervisor'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 5. Living Buildings PDF (Accommodation)
  downloadLivingBuildingsReport: (buildings: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير المباني السكنية والإشغال' : 'Camp Living Blocks & Occupancy Report';
    const totalBlocks = buildings.length;
    const totalRooms = buildings.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0);
    const totalCapacity = buildings.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    const totalOccupancy = buildings.reduce((acc, b) => acc + (Number(b.currentOccupancy) || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    const rowsHtml = buildings.map((b, i) => {
      const bCap = Number(b.capacity || 0);
      const bOcc = Number(b.currentOccupancy || 0);
      const bPct = bCap > 0 ? Math.round((bOcc / bCap) * 100) : 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td style="font-weight: 700;">${b.name || '-'}</td>
          <td style="font-family: monospace;">${b.buildingNumber || '-'}</td>
          <td>${b.totalRooms || 0}</td>
          <td>${bCap}</td>
          <td style="font-weight: 700;">${bOcc}</td>
          <td>
            <span style="font-weight: 700; color: ${bPct > 80 ? '#EA580C' : '#059669'};">
              ${bPct}%
            </span>
          </td>
          <td>
            <span class="badge ${b.status === 'Operational' ? 'badge-emerald' : 'badge-neutral'}">
              ${b.status || 'Operational'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'توزيع الوحدات السكنية، الطاقة الاستيعابية، وإشغال الغرف' : 'Residential Blocks, Room Allocation, Capacity & Occupancy Rates'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'المباني السكنية' : 'Living Blocks'}</div>
            <div class="kpi-value">${totalBlocks}</div>
            <div class="kpi-sub">${totalRooms} ${isRTL ? 'إجمالي الغرف' : 'Total Rooms'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'الطاقة الاستيعابية' : 'Capacity (Beds)'}</div>
            <div class="kpi-value">${totalCapacity}</div>
            <div class="kpi-sub">${totalOccupancy} ${isRTL ? 'سرير مشغول' : 'Beds Occupied'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'الأسرة الشاغرة' : 'Available Beds'}</div>
            <div class="kpi-value" style="color: #059669;">${Math.max(0, totalCapacity - totalOccupancy)}</div>
            <div class="kpi-sub">${isRTL ? 'جاهزة للتسكين' : 'Ready for check-in'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'نسبة الإشغال' : 'Occupancy Rate'}</div>
            <div class="kpi-value" style="color: #EA580C;">${occupancyRate}%</div>
            <div class="kpi-sub">${isRTL ? 'معدل سكن القوى العاملة' : 'Current living load'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'تفاصيل المباني والغرف السكنية' : 'Residential Buildings Inventory & Status'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'اسم المبنى' : 'Block Name'}</th>
              <th>${isRTL ? 'الكود' : 'Code'}</th>
              <th>${isRTL ? 'عدد الغرف' : 'Rooms'}</th>
              <th>${isRTL ? 'السعة (سرير)' : 'Capacity'}</th>
              <th>${isRTL ? 'الإشغال الحالي' : 'Current Occupancy'}</th>
              <th>${isRTL ? 'نسبة الإشغال' : 'Occupancy %'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 6. Manpower PDF
  downloadManpowerReport: (personnel: any[], meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'تقرير القوى العاملة والتسكين' : 'Manpower & Camp Workforce Report';
    const total = personnel.length;
    const active = personnel.filter(p => !((p.status || '').toLowerCase().includes('leave'))).length;
    const leave = total - active;

    const rowsHtml = personnel.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight: 700;">${p.name || '-'}</td>
        <td style="font-family: monospace;">${p.employeeId || '-'}</td>
        <td>${p.jobTitle || '-'}</td>
        <td>${p.department || '-'}</td>
        <td>${p.nationality || '-'}</td>
        <td style="font-weight: 700; color: #EA580C;">${p.roomNumber || (isRTL ? 'غير معين' : 'Unassigned')}</td>
        <td>
          <span class="badge ${p.status === 'Active' || p.status === 'نشط' ? 'badge-emerald' : 'badge-orange'}">
            ${p.status || 'Active'}
          </span>
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${getBaseStyles(isRTL)}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; CAMPS MANAGER</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'قائمة الموظفين المقيمين بالمخيم، المسميات الوظيفية، والغرف المخصصة' : 'Camp Personnel Directory, Job Roles, Accommodation Allocation & Status'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'تاريخ التوليد' : 'Generated'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل' : 'Operator'}:</strong> ${meta.generatedBy || 'Site Lead'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي الموظفين' : 'Total Personnel'}</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-sub">${isRTL ? 'عمالة مقيمة مسجلة' : 'Registered headcount'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'الموظفون النشطون' : 'Active On-Site'}</div>
            <div class="kpi-value" style="color: #059669;">${active}</div>
            <div class="kpi-sub">${Math.round((active / (total || 1)) * 100)}% ${isRTL ? 'على رأس العمل' : 'Active presence'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'في إجازة' : 'On Leave / Vacation'}</div>
            <div class="kpi-value" style="color: #EA580C;">${leave}</div>
            <div class="kpi-sub">${isRTL ? 'إجازات رسمية' : 'Approved leave'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'نسبة الامتثال' : 'Safety Compliance'}</div>
            <div class="kpi-value" style="color: #0284C7;">100%</div>
            <div class="kpi-sub">${isRTL ? 'بيانات مكتملة' : 'Verified records'}</div>
          </div>
        </div>

        <div class="section-title">
          <span>${isRTL ? 'سجل أسماء وتسكين القوى العاملة' : 'Workforce Directory & Room Assignments'}</span>
          <span style="font-size: 10px; color: #737373;">${total} ${isRTL ? 'موظف' : 'members'}</span>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'اسم الموظف' : 'Employee Name'}</th>
              <th>${isRTL ? 'الرقم الوظيفي' : 'Emp ID'}</th>
              <th>${isRTL ? 'المسمى الوظيفي' : 'Job Title'}</th>
              <th>${isRTL ? 'القسم / المقاول' : 'Department'}</th>
              <th>${isRTL ? 'الجنسية' : 'Nationality'}</th>
              <th>${isRTL ? 'المبنى والغرفة' : 'Room #'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'صفحة 1 من 1 • تم إصدار هذا التقرير رسمياً' : 'Page 1 of 1 • System-Generated Official Audit Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },

  // 7. Combined Master Camp Report (Comprehensive With Graphs & Tables)
  downloadCombinedReport: (data: {
    water: any[];
    gas: any[];
    fuel: any[];
    livingBuildings: any[];
    utilityBuildings: any[];
    personnel: any[];
  }, meta: ReportMeta, isRTL: boolean) => {
    const title = isRTL ? 'التقرير الشامل الموحد لعمليات المخيم' : 'Camp Master Combined Operations Report';

    const totalWaterCost = data.water.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const totalGasCost = data.gas.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const totalFuelCost = data.fuel.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
    const grandUtilitiesCost = totalWaterCost + totalGasCost + totalFuelCost;

    const totalEmployees = data.personnel.length;
    const totalRooms = data.livingBuildings.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0);
    const totalCapacity = data.livingBuildings.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
    const totalOccupancy = data.livingBuildings.reduce((acc, b) => acc + (Number(b.currentOccupancy) || 0), 0);

    const livingRowsHtml = data.livingBuildings.map((b, i) => {
      const cap = Number(b.capacity || 0);
      const occ = Number(b.currentOccupancy || 0);
      const pct = cap > 0 ? Math.round((occ / cap) * 100) : 0;
      return `
        <tr>
          <td>${i + 1}</td>
          <td style="font-weight: 700;">${b.name}</td>
          <td>${b.buildingNumber || '-'}</td>
          <td>${b.totalRooms || 0}</td>
          <td>${cap}</td>
          <td>${occ}</td>
          <td style="font-weight: 700; color: #059669;">${pct}%</td>
        </tr>
      `;
    }).join('');

    const utilityRowsHtml = data.utilityBuildings.map((b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight: 700;">${b.name}</td>
        <td>${b.buildingNumber || b.code || '-'}</td>
        <td>${b.buildingType || b.type || (isRTL ? 'مرفق خدمة' : 'Utility')}</td>
        <td>${b.totalItems || 0} pcs</td>
        <td><span class="badge badge-emerald">${b.status || 'Operational'}</span></td>
      </tr>
    `).join('');

    const workforceRowsHtml = data.personnel.slice(0, 15).map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight: 700;">${p.name}</td>
        <td>${p.jobTitle || '-'}</td>
        <td>${p.department || '-'}</td>
        <td style="font-weight: 700; color: #EA580C;">${p.roomNumber || '-'}</td>
        <td><span class="badge badge-emerald">${p.status || 'Active'}</span></td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="${isRTL ? 'ar' : 'en'}" dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          ${getBaseStyles(isRTL)}
          .chart-card {
            background: #FAFAFA;
            border: 1px solid #E5E5E5;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 14px;
          }
          .bar-progress {
            height: 14px;
            background: #F3F4F6;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
            margin: 6px 0;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="report-header">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/logo.jpg" alt="Zahran" style="height:36px;width:auto;max-width:130px;object-fit:contain;border-radius:6px;background:#171717;padding:2px 4px;box-shadow:0 1px 3px rgba(0,0,0,0.15);" />
              <span class="brand-badge">ZAHRAN &bull; EXECUTIVE AUDIT</span>
            </div>
            <h1 class="report-title">${title}</h1>
            <p class="report-subtitle">${isRTL ? 'تقرير متكامل يشمل السكن، القوى العاملة، والمياه، والغاز، والوقود، والمرافق' : 'Integrated Executive Audit: Living Facilities, Workforce, Water, Gas, Fuel & Utilities'}</p>
          </div>
          <div class="meta-box">
            <div><strong>${isRTL ? 'المشروع' : 'Project'}:</strong> ${meta.projectName || 'Sharq Camp'}</div>
            <div><strong>${isRTL ? 'تاريخ الإصدار' : 'Issue Date'}:</strong> ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</div>
            <div><strong>${isRTL ? 'المشغل المعتمد' : 'Certified By'}:</strong> ${meta.generatedBy || 'Camp Director'}</div>
          </div>
        </div>

        <!-- Master KPI Highlights -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إجمالي تكلفة الخدمات' : 'Total Utilities Cost'}</div>
            <div class="kpi-value" style="color: #EA580C;">${grandUtilitiesCost.toLocaleString()} <span style="font-size: 11px;">SAR</span></div>
            <div class="kpi-sub">${isRTL ? 'مياه + غاز + وقود' : 'Water + Gas + Fuel'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'القوى العاملة' : 'Workforce'}</div>
            <div class="kpi-value">${totalEmployees}</div>
            <div class="kpi-sub">${isRTL ? 'موظف مقيم بالموقع' : 'On-site residents'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'إشغال الأسرة السكنية' : 'Bed Occupancy'}</div>
            <div class="kpi-value" style="color: #059669;">${totalOccupancy} / ${totalCapacity}</div>
            <div class="kpi-sub">${totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0}% ${isRTL ? 'نسبة الإشغال' : 'Occupancy Rate'}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">${isRTL ? 'المباني والمرافق' : 'Buildings & Utilities'}</div>
            <div class="kpi-value">${data.livingBuildings.length + data.utilityBuildings.length}</div>
            <div class="kpi-sub">${data.livingBuildings.length} ${isRTL ? 'سكني' : 'Living'} • ${totalRooms} ${isRTL ? 'غرفة' : 'Rooms'}</div>
          </div>
        </div>

        <!-- Visual Utilities Cost Breakdown Graph -->
        <div class="chart-card no-break">
          <div style="font-size: 11px; font-weight: 800; color: #171717; margin-bottom: 8px;">
            ${isRTL ? 'مخطط توزيع تكاليف الخدمات والمرافق (SAR)' : 'Utilities Cost Distribution Visualizer (SAR)'}
          </div>
          <div class="bar-progress">
            <div style="width: ${grandUtilitiesCost > 0 ? (totalWaterCost / grandUtilitiesCost) * 100 : 33}%; background: #0284C7;" title="Water"></div>
            <div style="width: ${grandUtilitiesCost > 0 ? (totalGasCost / grandUtilitiesCost) * 100 : 33}%; background: #F59E0B;" title="Gas"></div>
            <div style="width: ${grandUtilitiesCost > 0 ? (totalFuelCost / grandUtilitiesCost) * 100 : 34}%; background: #171717;" title="Fuel"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin-top: 4px;">
            <span style="color: #0284C7;">${isRTL ? 'المياه' : 'Water'}: ${totalWaterCost.toLocaleString()} SAR</span>
            <span style="color: #F59E0B;">${isRTL ? 'الغاز' : 'Gas'}: ${totalGasCost.toLocaleString()} SAR</span>
            <span style="color: #171717;">${isRTL ? 'الوقود' : 'Fuel'}: ${totalFuelCost.toLocaleString()} SAR</span>
          </div>
        </div>

        <!-- Section 1: Utilities Summary Table -->
        <div class="section-title">
          <span>1. ${isRTL ? 'ملخص الخدمات والمرافق التشغيلية' : 'Utilities Operational Summary'}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>${isRTL ? 'المرفق' : 'Utility'}</th>
              <th>${isRTL ? 'المؤشر الرئيسي' : 'Key Metric'}</th>
              <th>${isRTL ? 'الحجم / الكمية' : 'Volume / Quantity'}</th>
              <th>${isRTL ? 'التكلفة الإجمالية' : 'Total Cost (SAR)'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight: 700;">${isRTL ? 'المياه (عذبة وصرف)' : 'Water (Fresh & Waste)'}</td>
              <td>${data.water.length} ${isRTL ? 'رحلة صهريج' : 'Tanker Trips'}</td>
              <td>${data.water.reduce((acc, r) => acc + (Number(r.volumeM3) || 0), 0)} m3</td>
              <td style="font-weight: 700; color: #EA580C;">${totalWaterCost.toLocaleString()} SAR</td>
              <td><span class="badge badge-emerald">${isRTL ? 'نشط' : 'Active'}</span></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">${isRTL ? 'الغاز (صغير وكبير)' : 'Gas Cylinders'}</td>
              <td>${data.gas.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0)} ${isRTL ? 'أسطوانة' : 'Cylinders'}</td>
              <td>${data.gas.reduce((acc, r) => acc + (Number(r.inStock) || 0), 0)} ${isRTL ? 'بالمخزن' : 'In Stock'}</td>
              <td style="font-weight: 700; color: #EA580C;">${totalGasCost.toLocaleString()} SAR</td>
              <td><span class="badge badge-emerald">${isRTL ? 'نشط' : 'Active'}</span></td>
            </tr>
            <tr>
              <td style="font-weight: 700;">${isRTL ? 'الوقود (ديزل وبنزين)' : 'Fuel Consumption'}</td>
              <td>${data.fuel.length} ${isRTL ? 'سجل تشغيل' : 'Fill Logs'}</td>
              <td>${data.fuel.reduce((acc, r) => acc + (Number(r.quantityLiters) || 0), 0).toLocaleString()} L</td>
              <td style="font-weight: 700; color: #EA580C;">${totalFuelCost.toLocaleString()} SAR</td>
              <td><span class="badge badge-emerald">${isRTL ? 'نشط' : 'Active'}</span></td>
            </tr>
          </tbody>
        </table>

        <!-- Page Break for Next Major Section -->
        <div class="page-break"></div>

        <!-- Section 2: Accommodation & Living Blocks -->
        <div class="section-title">
          <span>2. ${isRTL ? 'المباني السكنية ونسب الإشغال' : 'Residential Accommodation & Room Status'}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'المبنى' : 'Block'}</th>
              <th>${isRTL ? 'الكود' : 'Code'}</th>
              <th>${isRTL ? 'الغرف' : 'Rooms'}</th>
              <th>${isRTL ? 'السعة' : 'Capacity'}</th>
              <th>${isRTL ? 'الإشغال' : 'Occupancy'}</th>
              <th>${isRTL ? 'النسبة' : 'Rate'}</th>
            </tr>
          </thead>
          <tbody>
            ${livingRowsHtml}
          </tbody>
        </table>

        <!-- Section 3: Utility Buildings -->
        <div class="section-title" style="margin-top: 20px;">
          <span>3. ${isRTL ? 'المباني الخدمية والمرافق العامة' : 'Utility Facilities & Infrastructure Units'}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'المرفق' : 'Facility'}</th>
              <th>${isRTL ? 'الكود' : 'Code'}</th>
              <th>${isRTL ? 'التصنيف' : 'Category'}</th>
              <th>${isRTL ? 'الأصول المسجلة' : 'Tracked Assets'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${utilityRowsHtml}
          </tbody>
        </table>

        <!-- Section 4: Workforce Sample -->
        <div class="section-title" style="margin-top: 20px;">
          <span>4. ${isRTL ? 'قائمة القوى العاملة' : 'Workforce Sample'}</span>
          <span style="font-size: 10px; color: #737373;">${totalEmployees} ${isRTL ? 'إجمالي' : 'Total'}</span>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isRTL ? 'الاسم' : 'Name'}</th>
              <th>${isRTL ? 'المسمى الوظيفي' : 'Job Title'}</th>
              <th>${isRTL ? 'القسم' : 'Department'}</th>
              <th>${isRTL ? 'الغرفة' : 'Room #'}</th>
              <th>${isRTL ? 'الحالة' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            ${workforceRowsHtml}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="report-footer">
          <span>Camps Manager Enterprise Cloud Platform</span>
          <span>${isRTL ? 'تم إصدار التقرير الشامل المعتمد للمخيم' : 'Certified Complete Operations Camp Master Report'}</span>
        </div>
      </body>
      </html>
    `;
    printDocument(html, title);
  },
};

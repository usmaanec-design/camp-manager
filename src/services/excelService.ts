import * as XLSX from 'xlsx';
import { ExcelImportState, ExcelValidationError, JobTitleId } from '../types';
import { jobTitleService } from './jobTitleService';

export interface PersonnelExcelRow {
  rowNumber: number;
  idNumber: string;
  name: string;
  rawJobTitle: string;
  jobTitleId?: JobTitleId;
  iqamaNumber: string;
  roomNumber: string;
  nationality?: string;
  status: 'Valid' | 'Needs Mapping' | 'Error';
  errorMessage?: string;
}

export interface PersonnelExcelParseResult {
  fileName: string;
  fileSize: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  needsMappingRows: number;
  rows: PersonnelExcelRow[];
  unmappedTitles: string[];
}

export const excelService = {
  // Download official controlled personnel template
  downloadPersonnelTemplate(): void {
    const headers = ['ID NUMBER', 'NAME', 'JOB TITLE', 'IQAMA NUMBER', 'ROOM NUMBER', 'NATIONALITY'];
    
    // Sample rows showing official positions & approved nationalities
    const sampleRows = [
      {
        'ID NUMBER': 'EMP-2001',
        'NAME': 'Mohammad Saeed',
        'JOB TITLE': 'Labour',
        'IQAMA NUMBER': '2418293041',
        'ROOM NUMBER': 'A-101',
        'NATIONALITY': 'Pakistani',
      },
      {
        'ID NUMBER': 'EMP-2002',
        'NAME': 'Rajesh Sharma',
        'JOB TITLE': 'Supervisor',
        'IQAMA NUMBER': '2319283745',
        'ROOM NUMBER': 'A-102',
        'NATIONALITY': 'Indian',
      },
      {
        'ID NUMBER': 'EMP-2003',
        'NAME': 'Nazmul Islam',
        'JOB TITLE': 'Technician',
        'IQAMA NUMBER': '2518293847',
        'ROOM NUMBER': 'A-103',
        'NATIONALITY': 'Bangladeshi',
      },
      {
        'ID NUMBER': 'EMP-2004',
        'NAME': 'Ahmed Mansoor',
        'JOB TITLE': 'Foreman',
        'IQAMA NUMBER': '2210293841',
        'ROOM NUMBER': 'A-104',
        'NATIONALITY': 'Egyptian',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    
    // Create Reference sheet with official positions
    const officialTitles = jobTitleService.getJobTitles();
    const referenceData = (officialTitles || []).map((t) => ({
      'System ID': t.id,
      'English Title': t.labelEn,
      'Arabic Title': t.labelAr,
      'Accepted Aliases': Array.isArray(t.aliases) ? t.aliases.join(', ') : '',
    }));
    const refSheet = XLSX.utils.json_to_sheet(referenceData);

    // Create Reference sheet with approved fixed nationalities
    const nationalityData = [
      { 'Nationality (English)': 'Pakistani', 'الجنسية (العربية)': 'باكستاني' },
      { 'Nationality (English)': 'Indian', 'الجنسية (العربية)': 'هندي' },
      { 'Nationality (English)': 'Bangladeshi', 'الجنسية (العربية)': 'بنغلاديشي' },
      { 'Nationality (English)': 'Egyptian', 'الجنسية (العربية)': 'مصري' },
      { 'Nationality (English)': 'Palestinian', 'الجنسية (العربية)': 'فلسطيني' },
      { 'Nationality (English)': 'Sudanese', 'الجنسية (العربية)': 'سوداني' },
      { 'Nationality (English)': 'Syrian', 'الجنسية (العربية)': 'سوري' },
    ];
    const natSheet = XLSX.utils.json_to_sheet(nationalityData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personnel Data');
    XLSX.utils.book_append_sheet(wb, refSheet, 'Approved Job Titles');
    XLSX.utils.book_append_sheet(wb, natSheet, 'Approved Nationalities');

    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Official_Personnel_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      XLSX.writeFile(wb, 'Official_Personnel_Template.xlsx');
    }
  },

  // Parse and validate uploaded personnel Excel file
  async parseAndValidatePersonnelExcel(file: File): Promise<PersonnelExcelParseResult> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const rows: PersonnelExcelRow[] = [];
    const unmappedSet = new Set<string>();

    rawJson.forEach((row, idx) => {
      const rowNumber = idx + 2;

      // Extract values checking various casing/formats
      const idNumber = String(
        row['ID NUMBER'] || row['ID'] || row['Employee ID'] || row['idNumber'] || row['ID_NUMBER'] || ''
      ).trim();

      const name = String(
        row['NAME'] || row['Name'] || row['Employee Name'] || row['FULL NAME'] || row['name'] || ''
      ).trim();

      const rawJobTitle = String(
        row['JOB TITLE'] || row['Job Title'] || row['JOBTITLE'] || row['Position'] || row['jobTitle'] || ''
      ).trim();

      const iqamaNumber = String(
        row['IQAMA NUMBER'] || row['IQAMA'] || row['Iqama Number'] || row['Iqama'] || row['iqamaNumber'] || ''
      ).trim();

      const roomNumber = String(
        row['ROOM NUMBER'] || row['ROOM'] || row['Room Number'] || row['Room'] || row['roomNumber'] || ''
      ).trim();

      const rawNationality = String(
        row['NATIONALITY'] || row['Nationality'] || row['nationality'] || row['الجنسية'] || row['جنسية'] || ''
      ).trim();

      let nationality = 'Pakistani';
      if (rawNationality) {
        const s = rawNationality.toLowerCase();
        if (s.includes('pak') || s.includes('باكستان')) nationality = 'Pakistani';
        else if (s.includes('ind') || s.includes('هند')) nationality = 'Indian';
        else if (s.includes('bang') || s.includes('beng') || s.includes('بنغل') || s.includes('بنغال')) nationality = 'Bangladeshi';
        else if (s.includes('egy') || s.includes('مصر')) nationality = 'Egyptian';
        else if (s.includes('pal') || s.includes('فلسطين')) nationality = 'Palestinian';
        else if (s.includes('sod') || s.includes('sud') || s.includes('سودان')) nationality = 'Sudanese';
        else if (s.includes('syr') || s.includes('sor') || s.includes('سور')) nationality = 'Syrian';
      }

      let status: PersonnelExcelRow['status'] = 'Valid';
      let errorMessage = '';
      let jobTitleId: JobTitleId | undefined;

      // 1. Validate ID NUMBER
      if (!idNumber) {
        status = 'Error';
        errorMessage = 'ID NUMBER is required.';
      }
      // 2. Validate NAME
      else if (!name) {
        status = 'Error';
        errorMessage = 'NAME is required.';
      }
      // 3. Validate IQAMA NUMBER
      else if (!iqamaNumber) {
        status = 'Error';
        errorMessage = 'IQAMA NUMBER is required.';
      }
      // 4. Validate ROOM NUMBER
      else if (!roomNumber) {
        status = 'Error';
        errorMessage = 'ROOM NUMBER is required.';
      }
      // 5. Validate JOB TITLE with controlled dictionary
      else if (!rawJobTitle) {
        status = 'Error';
        errorMessage = 'JOB TITLE is missing.';
      } else {
        const norm = jobTitleService.normalizeJobTitle(rawJobTitle);
        if (norm.recognized && norm.jobTitleId) {
          jobTitleId = norm.jobTitleId;
        } else {
          status = 'Needs Mapping';
          errorMessage = `Unknown Job Title: "${rawJobTitle}". Please map to an official position.`;
          unmappedSet.add(rawJobTitle);
        }
      }

      rows.push({
        rowNumber,
        idNumber,
        name,
        rawJobTitle,
        jobTitleId,
        iqamaNumber,
        roomNumber,
        nationality,
        status,
        errorMessage,
      });
    });

    const validRows = rows.filter((r) => r.status === 'Valid').length;
    const errorRows = rows.filter((r) => r.status === 'Error').length;
    const needsMappingRows = rows.filter((r) => r.status === 'Needs Mapping').length;

    return {
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + ' KB',
      totalRows: rows.length,
      validRows,
      errorRows,
      needsMappingRows,
      rows,
      unmappedTitles: Array.from(unmappedSet),
    };
  },

  // General legacy parser for other modules (vehicles, inventory, etc.)
  async parseAndValidateExcel(
    file: File,
    targetModule: ExcelImportState['targetModule']
  ): Promise<ExcelImportState> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const errors: ExcelValidationError[] = [];
    const validRowsList: Record<string, any>[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = index + 2;
      let hasError = false;

      if (targetModule === 'projects') {
        if (!row['Project Name'] && !row['name']) {
          errors.push({ row: rowNum, column: 'Project Name', problem: 'Project Name is mandatory', status: 'Error' });
          hasError = true;
        }
        if (!row['Location'] && !row['location']) {
          errors.push({ row: rowNum, column: 'Location', problem: 'Location is missing', status: 'Error' });
          hasError = true;
        }
      } else if (targetModule === 'manpower') {
        if (!row['Employee Name'] && !row['employeeName']) {
          errors.push({ row: rowNum, column: 'Employee Name', problem: 'Missing employee name', status: 'Error' });
          hasError = true;
        }
        if (!row['Iqama / Badge ID'] && !row['employeeId']) {
          errors.push({ row: rowNum, column: 'Iqama / Badge ID', problem: 'Employee ID required', status: 'Error' });
          hasError = true;
        }
      } else if (targetModule === 'vehicles') {
        if (!row['Vehicle Number'] && !row['vehicleNumber']) {
          errors.push({ row: rowNum, column: 'Vehicle Number', problem: 'Vehicle number required', status: 'Error' });
          hasError = true;
        }
      } else if (targetModule === 'inventory') {
        if (!row['Item Name'] && !row['itemName']) {
          errors.push({ row: rowNum, column: 'Item Name', problem: 'Item description required', status: 'Error' });
          hasError = true;
        }
      } else if (targetModule === 'reports') {
        if (!row['Title'] && !row['title']) {
          errors.push({ row: rowNum, column: 'Title', problem: 'Report title missing', status: 'Error' });
          hasError = true;
        }
      }

      if (!hasError) {
        validRowsList.push(row);
      }
    });

    if (jsonData.length === 0) {
      errors.push({ row: 1, column: 'Sheet', problem: 'The uploaded spreadsheet is empty.', status: 'Error' });
    }

    return {
      fileName: file.name,
      fileSize: (file.size / 1024).toFixed(1) + ' KB',
      totalRows: jsonData.length,
      validRows: validRowsList.length,
      invalidRows: errors.length,
      errors,
      previewData: jsonData.slice(0, 10),
      targetModule,
    };
  },

  generateTemplate(targetModule: ExcelImportState['targetModule']) {
    if (targetModule === 'personnel' || targetModule === 'manpower') {
      this.downloadPersonnelTemplate();
      return;
    }

    let headers: string[] = [];
    let sampleRow: Record<string, any> = {};

    switch (targetModule) {
      case 'projects':
        headers = ['Project Name', 'Project Code', 'Location', 'Capacity', 'Manager Name', 'Manager Contact'];
        sampleRow = {
          'Project Name': 'AL-NAKHEEL CAMP',
          'Project Code': 'PRJ-NKH-05',
          'Location': 'Madinah Industrial Area',
          'Capacity': 500,
          'Manager Name': 'Eng. Omar Al-Zahrani',
          'Manager Contact': '+966 50 111 2222',
        };
        break;
      case 'vehicles':
        headers = ['Vehicle Number', 'Plate Number', 'Type', 'Driver Name', 'Project'];
        sampleRow = {
          'Vehicle Number': 'FLT-OLY-05',
          'Plate Number': '7789 KSA',
          'Type': 'Bus',
          'Driver Name': 'Anas Al-Mutawa',
          'Project': 'Sharq Camp',
        };
        break;
      case 'inventory':
        headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Threshold Level', 'Project'];
        sampleRow = {
          'Item Name': 'First Aid Station Kit',
          'Category': 'Safety & PPE',
          'Quantity': 45,
          'Unit': 'boxes',
          'Threshold Level': 15,
          'Project': 'Sharq Camp',
        };
        break;
      case 'reports':
        headers = ['Title', 'Report Type', 'Description', 'Priority', 'Project'];
        sampleRow = {
          'Title': 'Weekly Water Tank Chlorination Report',
          'Report Type': 'Daily Camp Operations',
          'Description': 'Water samples collected and chlorine levels verified.',
          'Priority': 'Medium',
          'Project': 'Sharq Camp',
        };
        break;
    }

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `CampsManager_${targetModule}_template.xlsx`);
  },

  downloadErrorReport(errors: ExcelValidationError[], originalFileName: string) {
    const errorRows = errors.map((e) => ({
      'Row Number': e.row,
      'Column Name': e.column,
      'Identified Issue': e.problem,
      'Severity': e.status,
    }));
    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, `Errors_${originalFileName.replace(/\.[^/.]+$/, '')}.xlsx`);
  },
};

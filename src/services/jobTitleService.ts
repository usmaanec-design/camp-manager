import { JobTitleDefinition, JobTitleId } from '../types';

export const DEFAULT_OFFICIAL_JOB_TITLES: JobTitleDefinition[] = [
  {
    id: 'LABOUR',
    labelEn: 'Labour',
    labelAr: 'عامل',
    aliases: ['labour', 'labor', 'lbor', 'laber', 'labourer', 'worker', 'عامل', 'عمال'],
  },
  {
    id: 'SUPERVISOR',
    labelEn: 'Supervisor',
    labelAr: 'مشرف',
    aliases: ['supervisor', 'superviser', 'sup', 'مشرف', 'مشرفين'],
  },
  {
    id: 'TECHNICIAN',
    labelEn: 'Technician',
    labelAr: 'فني',
    aliases: ['technician', 'technishion', 'tech', 'electrician', 'plumber', 'mechanic', 'فني', 'فنيين'],
  },
  {
    id: 'FOREMAN',
    labelEn: 'Foreman',
    labelAr: 'فورمان',
    aliases: ['foreman', 'forman', 'فورمان', 'مراقب'],
  },
  {
    id: 'CAMP_BOSS',
    labelEn: 'Camp Boss',
    labelAr: 'مسؤول المخيم',
    aliases: ['camp boss', 'campboss', 'camp manager', 'boss', 'مسؤول المخيم', 'مدير المخيم'],
  },
  {
    id: 'DISPATCHER',
    labelEn: 'Dispatcher',
    labelAr: 'منسق الحركة',
    aliases: ['dispatcher', 'dispature', 'dispatch', 'منسق الحركة', 'حركة'],
  },
  {
    id: 'CREWMAN',
    labelEn: 'Crewman',
    labelAr: 'عضو طاقم',
    aliases: ['crewman', 'crew', 'crew member', 'طاقم', 'عضو طاقم'],
  },
  {
    id: 'OFFICE_STAFF',
    labelEn: 'Office Staff',
    labelAr: 'موظف مكتب',
    aliases: ['office staff', 'office', 'clerk', 'admin staff', 'موظف مكتب', 'موظف إداري', 'سكرتير'],
  },
];

const STORAGE_KEY = 'camps_manager_job_titles_v1';

export const jobTitleService = {
  getJobTitles(): JobTitleDefinition[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_OFFICIAL_JOB_TITLES;
      }
    }
    return DEFAULT_OFFICIAL_JOB_TITLES;
  },

  saveJobTitles(titles: JobTitleDefinition[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(titles));
  },

  getJobTitleById(id: JobTitleId): JobTitleDefinition | undefined {
    return this.getJobTitles().find((j) => j.id === id);
  },

  getLabel(id: JobTitleId, lang: 'en' | 'ar' = 'en'): string {
    const title = this.getJobTitleById(id);
    if (!title) return id;
    return lang === 'ar' ? title.labelAr : title.labelEn;
  },

  normalizeJobTitle(input: string | undefined | null): {
    recognized: boolean;
    jobTitleId?: JobTitleId;
    rawInput: string;
  } {
    const raw = (input || '').trim();
    if (!raw) {
      return { recognized: false, rawInput: '' };
    }

    const clean = raw.toLowerCase().replace(/[\s\-_]+/g, ' ');
    const titles = this.getJobTitles();

    // 1. Direct match on ID
    const matchById = titles.find((t) => t.id.toLowerCase() === clean || t.id.replace('_', ' ').toLowerCase() === clean);
    if (matchById) {
      return { recognized: true, jobTitleId: matchById.id, rawInput: raw };
    }

    // 2. Direct match on English or Arabic labels
    const matchByLabel = titles.find(
      (t) => t.labelEn.toLowerCase() === clean || t.labelAr.toLowerCase() === clean
    );
    if (matchByLabel) {
      return { recognized: true, jobTitleId: matchByLabel.id, rawInput: raw };
    }

    // 3. Match against known aliases
    const matchByAlias = titles.find((t) =>
      t.aliases.some((alias) => alias.toLowerCase() === clean)
    );
    if (matchByAlias) {
      return { recognized: true, jobTitleId: matchByAlias.id, rawInput: raw };
    }

    // 4. Fuzzy / substring check for common typos
    const matchFuzzy = titles.find((t) =>
      t.aliases.some((alias) => clean.includes(alias.toLowerCase()) || alias.toLowerCase().includes(clean))
    );
    if (matchFuzzy) {
      return { recognized: true, jobTitleId: matchFuzzy.id, rawInput: raw };
    }

    return { recognized: false, rawInput: raw };
  },

  addAlias(id: JobTitleId, newAlias: string): boolean {
    const clean = newAlias.trim().toLowerCase();
    if (!clean) return false;
    const titles = this.getJobTitles();
    const item = titles.find((t) => t.id === id);
    if (item && !item.aliases.includes(clean)) {
      item.aliases.push(clean);
      this.saveJobTitles(titles);
      return true;
    }
    return false;
  },
};

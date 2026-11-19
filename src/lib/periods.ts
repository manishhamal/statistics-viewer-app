export function normalizePeriodLabel(value:string){return value.trim().replace(/\s+/g,' ');}
export function comparePeriods(a:{start_date:string},b:{start_date:string}){return new Date(a.start_date).getTime()-new Date(b.start_date).getTime();}

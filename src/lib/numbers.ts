export function formatNumber(value:number|string, maximumFractionDigits=2){const n=typeof value==='string'?Number(value):value;return Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits}).format(n):'—';}
export function formatValue(value:number|string,unit:string,scale:string){return `${formatNumber(value)} ${scale==='units'?'':scale} ${unit}`.trim();}

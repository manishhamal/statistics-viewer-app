export type Status = "staged" | "verified" | "published" | "rejected" | "superseded";
export interface Source { id:string; name:string; short_name:string; website_url:string; }
export interface Indicator { id:string; code:string; name:string; name_ne?:string|null; description?:string|null; unit:string; scale:string; frequency:string; }
export interface Period { id:string; type:string; label:string; label_ad:string; start_date:string; end_date:string; }
export interface Document { id:string; source_id:string; title:string; doc_type:string; publication_date:string; period_covered:string; coverage_type?:string; calendar_system?:string; language:string; file_hash:string; file_url?:string|null; status:string; }
export interface Observation { id:string; indicator_id:string; period_id:string; breakdown:Record<string,string>; value:number; unit:string; scale:string; is_provisional:boolean; document_id?:string|null; page_number?:number|null; table_ref?:string|null; status:Status; extraction_method:string; verified_at?:string|null; reviewed_by?:string|null; reviewed_at?:string|null; rejection_reason?:string|null; indicator?:Indicator; period?:Period; document?:Document; }

import { createClient } from "@supabase/supabase-js";
function env(name:string){const value=process.env[name];if(!value) throw new Error(`Missing ${name}`);return value;}
export function getDbClient(){return createClient(env("NEXT_PUBLIC_SUPABASE_URL"),env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));}
export function getAdminDbClient(){return createClient(env("NEXT_PUBLIC_SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{autoRefreshToken:false,persistSession:false}});}

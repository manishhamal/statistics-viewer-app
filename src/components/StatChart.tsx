"use client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function StatChart({data}:{data:{period:string,value:number}[]}){return <div className="h-80 rounded-xl border border-[#dce2e4] bg-white p-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="period" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="value" stroke="#2c6eaa" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}

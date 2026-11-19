
"use client";
import { useState } from 'react';
export default function DocumentRegistrationForm(){const [message,setMessage]=useState('');return <form onSubmit={e=>{e.preventDefault();setMessage('Registration requires a selected source and official PDF URL.')}} className="surface-panel p-6 space-y-4"><h2 className="text-xl font-bold">Source document details</h2><input required placeholder="Official PDF URL" className="w-full rounded-lg border p-3"/><input required placeholder="Document title" className="w-full rounded-lg border p-3"/><button className="rounded-lg bg-[#10283f] px-4 py-3 font-bold text-white">Download and register PDF</button>{message&&<p className="text-sm text-[#617080]">{message}</p>}</form>}

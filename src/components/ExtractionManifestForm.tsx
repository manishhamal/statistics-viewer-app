
"use client";
import { useState } from 'react';
export default function ExtractionManifestForm(){const [message,setMessage]=useState('');async function submit(){setMessage('Enter the registered document and evidence rows to stage a manifest.');}return <div className="surface-panel p-6 space-y-4"><h2 className="text-xl font-bold">Extraction manifest</h2><p className="text-sm text-[#617080]">Rows are staged privately and require curator review before publication.</p><button onClick={submit} className="rounded-lg bg-[#10283f] px-4 py-3 font-bold text-white">Prepare manifest</button>{message&&<p className="text-sm text-[#617080]">{message}</p>}</div>}

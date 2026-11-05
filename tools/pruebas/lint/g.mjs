import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const b=await chromium.launch(); const p=await b.newPage(); await p.goto('about:blank');
const names=await p.evaluate(()=>{ const s=new Set(); let o=window; while(o){ for(const k of Object.getOwnPropertyNames(o)) s.add(k); o=Object.getPrototypeOf(o); } return [...s].filter(k=>/^[A-Za-z_$][\w$]*$/.test(k)); });
fs.writeFileSync('globals.json', JSON.stringify(Object.fromEntries(names.map(n=>[n,'readonly'])))); console.log(names.length); await b.close();

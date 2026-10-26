import { readFile, writeFile } from "node:fs/promises";
const textFiles={"/":"public/index.html","/index.html":"public/index.html","/app.js":"public/app.js","/style.css":"public/style.css","/builder.css":"public/builder.css"};
const entries=[];
for(const [route,file] of Object.entries(textFiles)){const body=await readFile(file,"utf8"),type=route.endsWith(".js")?"text/javascript; charset=utf-8":route.endsWith(".css")?"text/css; charset=utf-8":"text/html; charset=utf-8";entries.push([route,{type,body}]);}
const logo=(await readFile("public/pharos-logo.png")).toString("base64");
await writeFile("src/generated-static.js",`// Generated from public assets by scripts/generate-static.mjs.\nexport const STATIC=new Map(${JSON.stringify(entries)});\nexport const LOGO_BASE64=${JSON.stringify(logo)};\n`);

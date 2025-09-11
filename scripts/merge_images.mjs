// Stub: merge image metadata into dist/site.json
import { promises as fs } from 'node:fs';

const inPath = process.argv[2] || 'dist/site.json';
const outPath = process.argv[3] || inPath;

async function main(){
  const data = JSON.parse(await fs.readFile(inPath, 'utf8'));
  // TODO: Add your image entries into chapters/sections/sub_objectives as needed.
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Images merge stub wrote', outPath);
}
main().catch(err=>{ console.error(err); process.exit(1); });

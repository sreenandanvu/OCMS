import fs from 'node:fs';

const file = new URL('../src/index.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const broken = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }]));";
const fixed = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }])));";
if (source.includes(broken)) {
  source = source.replace(broken, fixed);
  fs.writeFileSync(file, source);
  console.log('OCMS: repaired reports/performance route syntax');
} else {
  console.log('OCMS: no legacy performance syntax repair needed');
}

import fs from 'node:fs';

const file = new URL('../src/index.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

const broken = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }]));";
const fixed = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }])));";
if (source.includes(broken)) source = source.replace(broken, fixed);

const marker = "app.get('/api/dashboard', auth";
if (source.includes(marker) && !source.includes("'/api/me/student/documents'")) {
  const routes = `app.get('/api/me/student/documents', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Document.find({ student: s._id }).sort({ createdAt: -1 }) : []); });\napp.get('/api/me/student/attendance', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Attendance.find({ student: s._id }).sort({ date: -1 }) : []); });\napp.get('/api/me/student/results', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Result.find({ student: s._id, published: true }).populate('exam').sort({ createdAt: -1 }) : []); });\n`;
  source = source.replace(marker, routes + marker);
}

const assignmentMarker = "crud('assignments'";
if (source.includes(assignmentMarker) && !source.includes("'/api/assignments', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(assignmentMarker, "app.get('/api/assignments', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Assignment.find().sort({ createdAt: -1 })));\n" + assignmentMarker);
}
const timetableMarker = "crud('timetable'";
if (source.includes(timetableMarker) && !source.includes("'/api/timetable', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(timetableMarker, "app.get('/api/timetable', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Timetable.find().sort({ day: 1, period: 1 })));\n" + timetableMarker);
}
const communicationMarker = "crud('communications'";
if (source.includes(communicationMarker) && !source.includes("'/api/communications', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(communicationMarker, "app.get('/api/communications', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Communication.find().sort({ createdAt: -1 })));\n" + communicationMarker);
}

fs.writeFileSync(file, source);
console.log('OCMS: startup repair/compatibility checks complete');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '12mb' }));

const oid = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student', 'faculty'], default: 'student' },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  user: { type: oid, ref: 'User' }, name: { type: String, required: true },
  registerNo: { type: String, required: true, unique: true }, email: String, phone: String, dob: String,
  address: String, course: String, semester: Number, subjects: [String],
  academicHistory: [{ semester: Number, course: String, gpa: Number }],
  documents: [{ name: String, url: String }], status: { type: String, default: 'Active' },
  leaveBalance: { type: Number, default: 15 }
}, { timestamps: true });

const facultySchema = new mongoose.Schema({
  user: { type: oid, ref: 'User' }, name: { type: String, required: true }, employeeId: { type: String, required: true, unique: true },
  email: String, phone: String, department: String, designation: String, subjects: [String], classes: [String], timetable: [String]
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  student: { type: oid, ref: 'Student', required: true }, date: { type: Date, required: true }, course: String, semester: Number,
  subject: String, period: Number, status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  markedBy: { type: oid, ref: 'User' }, sessionCode: String, correctionReason: String
}, { timestamps: true });

const attendanceSessionSchema = new mongoose.Schema({
  code: { type: String, unique: true }, subject: String, course: String, semester: Number, period: Number,
  faculty: { type: oid, ref: 'Faculty' }, expiresAt: Date, active: { type: Boolean, default: true }
}, { timestamps: true });

const examSchema = new mongoose.Schema({
  name: { type: String, required: true }, course: String, semester: Number, date: Date, startTime: String, endTime: String,
  room: String, students: [oid], subjects: [String], questionPaperUrl: String, published: { type: Boolean, default: false }
}, { timestamps: true });

const resultSchema = new mongoose.Schema({
  exam: { type: oid, ref: 'Exam' }, student: { type: oid, ref: 'Student' }, subject: String, internal: Number,
  marks: Number, maxMarks: { type: Number, default: 100 }, grade: String, gradePoint: Number,
  published: { type: Boolean, default: false }, revaluation: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected'], default: 'None' }, revaluationReason: String
}, { timestamps: true });

const assignmentSchema = new mongoose.Schema({
  title: String, description: String, subject: String, faculty: { type: oid, ref: 'Faculty' }, dueDate: Date, resourceUrl: String,
  submissions: [{ student: { type: oid, ref: 'Student' }, submittedAt: Date, fileUrl: String, marks: Number, feedback: String }]
}, { timestamps: true });

const leaveSchema = new mongoose.Schema({
  applicant: { type: oid, ref: 'User' }, student: { type: oid, ref: 'Student' }, faculty: { type: oid, ref: 'Faculty' },
  from: Date, to: Date, reason: String, status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, decisionNote: String
}, { timestamps: true });

const timetableSchema = new mongoose.Schema({ course: String, semester: Number, day: String, period: Number, startTime: String, endTime: String, subject: String, faculty: String, room: String }, { timestamps: true });
const communicationSchema = new mongoose.Schema({ title: String, message: String, audience: { type: String, default: 'All' }, author: { type: oid, ref: 'User' } }, { timestamps: true });
const documentSchema = new mongoose.Schema({ student: { type: oid, ref: 'Student' }, name: String, type: String, url: String, verified: { type: Boolean, default: false } }, { timestamps: true });

const Model = {
  User: mongoose.model('User', userSchema), Student: mongoose.model('Student', studentSchema), Faculty: mongoose.model('Faculty', facultySchema),
  Attendance: mongoose.model('Attendance', attendanceSchema), AttendanceSession: mongoose.model('AttendanceSession', attendanceSessionSchema),
  Exam: mongoose.model('Exam', examSchema), Result: mongoose.model('Result', resultSchema), Assignment: mongoose.model('Assignment', assignmentSchema),
  Leave: mongoose.model('Leave', leaveSchema), Timetable: mongoose.model('Timetable', timetableSchema), Communication: mongoose.model('Communication', communicationSchema),
  Document: mongoose.model('Document', documentSchema)
};

const secret = () => process.env.JWT_SECRET || 'ocms-development-secret';
const sign = u => jwt.sign({ id: u._id, role: u.role, name: u.name }, secret(), { expiresIn: '1d' });
const auth = (req, res, next) => { try { const t = (req.headers.authorization || '').replace('Bearer ', ''); req.user = jwt.verify(t, secret()); next(); } catch { res.status(401).json({ message: 'Unauthorized' }); } };
const roles = (...r) => (req, res, next) => r.includes(req.user.role) ? next() : res.status(403).json({ message: 'Forbidden' });
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'OCMS API', version: '2.0' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!['student', 'faculty'].includes(role)) return res.status(403).json({ message: 'Only student and faculty self-registration is allowed' });
    if (await Model.User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });
    const u = await Model.User.create({ name, email, password: await bcrypt.hash(password, 12), role });
    if (role === 'student') {
      const n = `STU-${String(Date.now()).slice(-6)}`;
      await Model.Student.create({ user: u._id, name, registerNo: n, email, course: 'MCA', semester: 1 });
    } else {
      const n = `FAC-${String(Date.now()).slice(-6)}`;
      await Model.Faculty.create({ user: u._id, name, employeeId: n, email, designation: 'Faculty' });
    }
    res.status(201).json({ user: publicUser(u), token: sign(u) });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const u = await Model.User.findOne({ email: String(email || '').toLowerCase() });
    if (!u || !u.active || !(await bcrypt.compare(password || '', u.password))) return res.status(401).json({ message: 'Invalid email or password' });
    if (role && u.role !== role) return res.status(403).json({ message: `This account is registered as ${u.role}. Please use the ${u.role} portal.` });
    res.json({ user: publicUser(u), token: sign(u) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/auth/me', auth, async (req, res) => res.json(await Model.User.findById(req.user.id).select('-password')));

app.get('/api/me/student', auth, roles('student'), async (req, res) => {
  let s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!s) s = await Model.Student.create({ user: req.user.id, name: req.user.name, email: req.user.email, registerNo: `STU-${String(Date.now()).slice(-6)}`, course: 'MCA', semester: 1 });
  res.json(s);
});
app.patch('/api/me/student', auth, roles('student'), async (req, res) => {
  const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!s) return res.status(404).json({ message: 'Student profile not found' });
  const allowed = ['name', 'phone', 'dob', 'address', 'course', 'semester'];
  const data = Object.fromEntries(allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]));
  res.json(await Model.Student.findByIdAndUpdate(s._id, data, { new: true, runValidators: true }));
});
app.put('/api/me/student/subjects', auth, roles('student'), async (req, res) => {
  const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!s) return res.status(404).json({ message: 'Student profile not found' });
  res.json(await Model.Student.findByIdAndUpdate(s._id, { subjects: Array.isArray(req.body.subjects) ? req.body.subjects : [] }, { new: true }));
});
app.get('/api/me/faculty', auth, roles('faculty'), async (req, res) => {
  let f = await Model.Faculty.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!f) f = await Model.Faculty.create({ user: req.user.id, name: req.user.name, email: req.user.email, employeeId: `FAC-${String(Date.now()).slice(-6)}`, designation: 'Faculty' });
  res.json(f);
});
app.patch('/api/me/faculty', auth, roles('faculty'), async (req, res) => {
  const f = await Model.Faculty.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!f) return res.status(404).json({ message: 'Faculty profile not found' });
  const allowed = ['name', 'phone', 'department', 'designation', 'subjects', 'classes'];
  const data = Object.fromEntries(allowed.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]]));
  res.json(await Model.Faculty.findByIdAndUpdate(f._id, data, { new: true, runValidators: true }));
});

app.get('/api/users', auth, roles('admin'), async (_, res) => res.json(await Model.User.find().select('-password').sort({ createdAt: -1 })));
app.patch('/api/users/:id', auth, roles('admin'), async (req, res) => res.json(await Model.User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password')));

const crud = (path, key, opts = {}) => {
  const M = Model[key];
  app.get('/api/' + path, auth, async (req, res) => {
    let q = M.find().sort({ createdAt: -1 });
    if (opts.populate) q = q.populate(opts.populate);
    res.json(await q);
  });
  app.post('/api/' + path, auth, async (req, res) => {
    try {
      if (opts.writeRoles && !opts.writeRoles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
      res.status(201).json(await M.create({ ...req.body, ...(opts.owner ? { [opts.owner]: req.user.id } : {}) }));
    } catch (e) { res.status(400).json({ message: e.message }); }
  });
  app.put('/api/' + path + '/:id', auth, async (req, res) => {
    try {
      if (opts.writeRoles && !opts.writeRoles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
      res.json(await M.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));
    } catch (e) { res.status(400).json({ message: e.message }); }
  });
  app.delete('/api/' + path + '/:id', auth, roles('admin'), async (req, res) => { await M.findByIdAndDelete(req.params.id); res.status(204).end(); });
};
crud('students', 'Student', { writeRoles: ['admin'] });
crud('faculty', 'Faculty', { writeRoles: ['admin'] });
crud('attendance', 'Attendance', { populate: 'student', writeRoles: ['admin', 'faculty'] });
crud('exams', 'Exam', { writeRoles: ['admin', 'faculty'] });
crud('results', 'Result', { populate: ['student', 'exam'], writeRoles: ['admin', 'faculty'] });
crud('assignments', 'Assignment', { populate: 'faculty', writeRoles: ['admin', 'faculty'] });
crud('leaves', 'Leave', { populate: ['student', 'faculty'], writeRoles: ['admin', 'student', 'faculty'] });
crud('timetable', 'Timetable', { writeRoles: ['admin', 'faculty'] });
crud('communications', 'Communication', { populate: 'author', owner: 'author', writeRoles: ['admin', 'faculty'] });
crud('documents', 'Document', { populate: 'student', writeRoles: ['admin', 'student'] });

app.patch('/api/attendance/bulk', auth, roles('admin', 'faculty'), async (req, res) => {
  try { const records = (req.body.records || []).map(x => ({ ...x, markedBy: req.user.id })); res.status(201).json(await Model.Attendance.insertMany(records)); }
  catch (e) { res.status(400).json({ message: e.message }); }
});
app.post('/api/attendance/session', auth, roles('admin', 'faculty'), async (req, res) => {
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const faculty = await Model.Faculty.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  const session = await Model.AttendanceSession.create({ ...req.body, code, faculty: faculty?._id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  res.status(201).json(session);
});
app.post('/api/attendance/qr-checkin', auth, roles('student'), async (req, res) => {
  try {
    const { sessionCode } = req.body;
    const session = await Model.AttendanceSession.findOne({ code: String(sessionCode || '').toUpperCase(), active: true, expiresAt: { $gt: new Date() } });
    if (!session) return res.status(400).json({ message: 'Invalid or expired attendance QR session' });
    const student = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });
    const duplicate = await Model.Attendance.findOne({ student: student._id, sessionCode: session.code });
    if (duplicate) return res.status(409).json({ message: 'Attendance already recorded for this session' });
    res.status(201).json(await Model.Attendance.create({ student: student._id, sessionCode: session.code, subject: session.subject, course: session.course, semester: session.semester, period: session.period, date: new Date(), status: 'Present', markedBy: req.user.id }));
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.patch('/api/attendance/:id/correct', auth, roles('admin', 'faculty'), async (req, res) => res.json(await Model.Attendance.findByIdAndUpdate(req.params.id, { status: req.body.status, correctionReason: req.body.reason, markedBy: req.user.id }, { new: true })));

app.post('/api/exams/:id/register', auth, roles('student'), async (req, res) => {
  const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  if (!s) return res.status(404).json({ message: 'Student profile not found' });
  const e = await Model.Exam.findById(req.params.id); if (!e) return res.status(404).json({ message: 'Exam not found' });
  if (!e.students.some(id => String(id) === String(s._id))) e.students.push(s._id);
  await e.save(); res.json(e);
});
app.get('/api/exams/:id/hall-ticket', auth, roles('student'), async (req, res) => {
  const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
  const e = await Model.Exam.findById(req.params.id); if (!s || !e) return res.status(404).json({ message: 'Exam or student not found' });
  res.json({ student: s, exam: e, hallTicketNo: `HT-${String(s.registerNo).replace(/\W/g, '')}-${String(e._id).slice(-6).toUpperCase()}` });
});

app.patch('/api/leaves/:id/status', auth, roles('admin', 'faculty'), async (req, res) => {
  const leave = await Model.Leave.findByIdAndUpdate(req.params.id, { status: req.body.status, decisionNote: req.body.decisionNote }, { new: true });
  res.json(leave);
});
app.post('/api/results/:id/revaluation', auth, roles('student'), async (req, res) => res.json(await Model.Result.findByIdAndUpdate(req.params.id, { revaluation: 'Requested', revaluationReason: req.body.reason || '' }, { new: true })));
app.patch('/api/results/:id/publish', auth, roles('admin', 'faculty'), async (req, res) => res.json(await Model.Result.findByIdAndUpdate(req.params.id, { published: true }, { new: true })));
app.patch('/api/results/:id/revaluation/status', auth, roles('admin', 'faculty'), async (req, res) => res.json(await Model.Result.findByIdAndUpdate(req.params.id, { revaluation: req.body.status }, { new: true })));

app.post('/api/results/calculate', auth, async (req, res) => {
  const marks = Number(req.body.marks), maxMarks = Number(req.body.maxMarks || 100), pct = marks / maxMarks * 100;
  let grade = 'F', point = 0;
  if (pct >= 90) { grade = 'A+'; point = 10; } else if (pct >= 80) { grade = 'A'; point = 9; } else if (pct >= 70) { grade = 'B+'; point = 8; } else if (pct >= 60) { grade = 'B'; point = 7; } else if (pct >= 50) { grade = 'C'; point = 6; } else if (pct >= 40) { grade = 'D'; point = 5; }
  res.json({ percentage: Number(pct.toFixed(2)), grade, gradePoint: point });
});

app.get('/api/students/:id/attendance', auth, async (req, res) => res.json(await Model.Attendance.find({ student: req.params.id }).sort({ date: -1 })));
app.get('/api/students/:id/results', auth, async (req, res) => res.json(await Model.Result.find({ student: req.params.id, published: true }).populate('exam').sort({ createdAt: -1 })));
app.get('/api/students/:id/documents', auth, async (req, res) => res.json(await Model.Document.find({ student: req.params.id })));

app.get('/api/me/student/attendance', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Attendance.find({ student: s._id }).sort({ date: -1 }) : []); });
app.get('/api/me/student/results', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Result.find({ student: s._id, published: true }).populate('exam').sort({ createdAt: -1 }) : []); });
app.get('/api/me/student/assignments', auth, roles('student'), async (req, res) => res.json(await Model.Assignment.find().populate('faculty').sort({ dueDate: 1 })));
app.get('/api/me/student/leaves', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Leave.find({ student: s._id }).sort({ createdAt: -1 }) : []); });
app.get('/api/me/faculty/assignments', auth, roles('faculty'), async (req, res) => { const f = await Model.Faculty.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(f ? await Model.Assignment.find({ faculty: f._id }).sort({ dueDate: 1 }) : []); });

app.get('/api/dashboard', auth, async (req, res) => {
  if (req.user.role === 'student') {
    const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
    const attendance = s ? await Model.Attendance.find({ student: s._id }) : [];
    const results = s ? await Model.Result.find({ student: s._id, published: true }) : [];
    const present = attendance.filter(a => a.status === 'Present').length;
    return res.json({ role: 'student', student: s, attendanceRate: attendance.length ? Math.round(present / attendance.length * 100) : 0, attendance: attendance.length, results: results.length, assignments: await Model.Assignment.countDocuments(), exams: await Model.Exam.countDocuments({ course: s?.course }) });
  }
  if (req.user.role === 'faculty') {
    const f = await Model.Faculty.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] });
    return res.json({ role: 'faculty', faculty: f, students: await Model.Student.countDocuments(), attendance: await Model.Attendance.countDocuments(), exams: await Model.Exam.countDocuments(), assignments: f ? await Model.Assignment.countDocuments({ faculty: f._id }) : 0, pendingLeaves: await Model.Leave.countDocuments({ status: 'Pending' }) });
  }
  const [students, faculty, attendance, exams, results, pendingLeaves, assignments] = await Promise.all([Model.Student.countDocuments(), Model.Faculty.countDocuments(), Model.Attendance.countDocuments(), Model.Exam.countDocuments(), Model.Result.countDocuments(), Model.Leave.countDocuments({ status: 'Pending' }), Model.Assignment.countDocuments()]);
  const present = await Model.Attendance.countDocuments({ status: 'Present' });
  res.json({ role: 'admin', students, faculty, attendance, exams, results, pendingLeaves, assignments, presentAttendance: present, attendanceRate: attendance ? Math.round(present / attendance * 100) : 0 });
});

app.get('/api/reports/attendance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Attendance.aggregate([
  { $group: { _id: '$subject', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } } } },
  { $project: { _id: 0, subject: '$_id', total: 1, present: 1, percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] } } }
])));
app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }]));
app.get('/api/reports/low-attendance', auth, roles('admin', 'faculty'), async (_, res) => { const rows = await Model.Attendance.aggregate([{ $group: { _id: '$student', total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } } } }, { $project: { student: '$_id', percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } }, { $match: { percentage: { $lt: 75 } } }]); res.json(await Model.Student.populate(rows, { path: 'student', select: 'name registerNo course semester' })); });
app.get('/api/reports/class/:course', auth, roles('admin', 'faculty'), async (req, res) => { const students = await Model.Student.find({ course: req.params.course }); const ids = students.map(s => s._id); res.json({ course: req.params.course, students: students.length, results: await Model.Result.countDocuments({ student: { $in: ids } }), attendance: await Model.Attendance.countDocuments({ student: { $in: ids } }) }); });
app.post('/api/reports/custom', auth, roles('admin'), async (req, res) => {
  const selected = req.body.sections || ['students']; const out = {};
  if (selected.includes('students')) out.students = await Model.Student.find().sort({ course: 1, registerNo: 1 });
  if (selected.includes('faculty')) out.faculty = await Model.Faculty.find().sort({ department: 1, name: 1 });
  if (selected.includes('attendance')) out.attendance = await Model.Attendance.find().populate('student').sort({ date: -1 }).limit(1000);
  if (selected.includes('exams')) out.exams = await Model.Exam.find().sort({ date: -1 });
  if (selected.includes('results')) out.results = await Model.Result.find().populate('student exam').sort({ createdAt: -1 }).limit(1000);
  res.json(out);
});

async function seed() {
  if (!await Model.User.findOne({ email: 'admin@ocms.com' })) await Model.User.create({ name: 'OCMS Administrator', email: 'admin@ocms.com', password: await bcrypt.hash('admin123', 12), role: 'admin' });
}
const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ocms').then(async () => { await seed(); app.listen(port, () => console.log(`OCMS API running on ${port}`)); }).catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });

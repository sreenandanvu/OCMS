import fs from 'node:fs';

const file = new URL('../src/index.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');

// Repair the malformed performance aggregation from the legacy backend source.
const broken = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }]));";
const fixed = "app.get('/api/reports/performance', auth, roles('admin', 'faculty'), async (_, res) => res.json(await Model.Result.aggregate([{ $group: { _id: '$subject', avgMarks: { $avg: '$marks' }, count: { $sum: 1 } } }, { $project: { _id: 0, subject: '$_id', avgMarks: { $round: ['$avgMarks', 1] }, count: 1 } }])));";
if (source.includes(broken)) source = source.replace(broken, fixed);

// Student-only endpoints used by the student portal.
const dashboardMarker = "app.get('/api/dashboard', auth";
if (source.includes(dashboardMarker) && !source.includes("app.get('/api/me/student/documents'")) {
  const routes = `app.get('/api/me/student/documents', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Document.find({ student: s._id }).sort({ createdAt: -1 }) : []); });\napp.get('/api/me/student/attendance', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Attendance.find({ student: s._id }).sort({ date: -1 }) : []); });\napp.get('/api/me/student/results', auth, roles('student'), async (req, res) => { const s = await Model.Student.findOne({ $or: [{ user: req.user.id }, { email: req.user.email }] }); res.json(s ? await Model.Result.find({ student: s._id, published: true }).populate('exam').sort({ createdAt: -1 }) : []); });\n`;
  source = source.replace(dashboardMarker, routes + dashboardMarker);
}

// Explicitly allow authenticated students to read shared academic resources.
const assignmentMarker = "crud('assignments'";
if (source.includes(assignmentMarker) && !source.includes("app.get('/api/assignments', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(assignmentMarker, "app.get('/api/assignments', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Assignment.find().populate('faculty').sort({ dueDate: 1 })));\n" + assignmentMarker);
}
const timetableMarker = "crud('timetable'";
if (source.includes(timetableMarker) && !source.includes("app.get('/api/timetable', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(timetableMarker, "app.get('/api/timetable', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Timetable.find().sort({ day: 1, period: 1 })));\n" + timetableMarker);
}
const communicationMarker = "crud('communications'";
if (source.includes(communicationMarker) && !source.includes("app.get('/api/communications', auth, roles('admin', 'faculty', 'student')")) {
  source = source.replace(communicationMarker, "app.get('/api/communications', auth, roles('admin', 'faculty', 'student'), async (_, res) => res.json(await Model.Communication.find().populate('author', 'name email role').sort({ createdAt: -1 })));\n" + communicationMarker);
}

// Administrator account creation keeps User and Student/Faculty records linked.
const adminRouteMarker = "const port = process.env.PORT || 5000;";
if (source.includes(adminRouteMarker) && !source.includes("'/api/admin/students'")) {
  const adminRoutes = `app.post('/api/admin/students', auth, roles('admin'), async (req, res) => {\n  try {\n    const { name, email, password, registerNo, phone, dob, address, course, semester, status } = req.body;\n    if (!name || !email || !password || !registerNo || !course || !semester) return res.status(400).json({ message: 'Name, email, password, register number, course and semester are required' });\n    const normalizedEmail = String(email).trim().toLowerCase();\n    if (await Model.User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'Email already registered' });\n    if (await Model.Student.findOne({ registerNo })) return res.status(409).json({ message: 'Register number already exists' });\n    const user = await Model.User.create({ name, email: normalizedEmail, password: await bcrypt.hash(password, 12), role: 'student' });\n    try {\n      const student = await Model.Student.create({ user: user._id, name, registerNo, email: normalizedEmail, phone, dob, address, course, semester: Number(semester), status: status || 'Active' });\n      return res.status(201).json({ user: publicUser(user), student });\n    } catch (error) {\n      await Model.User.findByIdAndDelete(user._id);\n      throw error;\n    }\n  } catch (error) {\n    res.status(400).json({ message: error.message });\n  }\n});\n\napp.post('/api/admin/faculty', auth, roles('admin'), async (req, res) => {\n  try {\n    const { name, email, password, employeeId, phone, department, designation } = req.body;\n    if (!name || !email || !password || !employeeId) return res.status(400).json({ message: 'Name, email, password and employee ID are required' });\n    const normalizedEmail = String(email).trim().toLowerCase();\n    if (await Model.User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'Email already registered' });\n    if (await Model.Faculty.findOne({ employeeId })) return res.status(409).json({ message: 'Employee ID already exists' });\n    const user = await Model.User.create({ name, email: normalizedEmail, password: await bcrypt.hash(password, 12), role: 'faculty' });\n    try {\n      const faculty = await Model.Faculty.create({ user: user._id, name, employeeId, email: normalizedEmail, phone, department, designation });\n      return res.status(201).json({ user: publicUser(user), faculty });\n    } catch (error) {\n      await Model.User.findByIdAndDelete(user._id);\n      throw error;\n    }\n  } catch (error) {\n    res.status(400).json({ message: error.message });\n  }\n});\n\napp.get('/api/admin/users', auth, roles('admin'), async (_, res) => {\n  res.json(await Model.User.find().select('-password').sort({ createdAt: -1 }));\n});\n\n`;
  source = source.replace(adminRouteMarker, adminRoutes + adminRouteMarker);
}

fs.writeFileSync(file, source);
console.log('OCMS: startup repair and administrator compatibility checks complete');

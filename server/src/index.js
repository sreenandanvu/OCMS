import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, role: { type: String, enum: ['admin','student','faculty'], default: 'student' }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const studentSchema = new mongoose.Schema({ name: String, registerNo: { type: String, unique: true }, email: String, course: String, semester: Number, phone: String, status: { type: String, default: 'Active' } }, { timestamps: true });
const Student = mongoose.model('Student', studentSchema);
const facultySchema = new mongoose.Schema({ name: String, employeeId: { type: String, unique: true }, email: String, department: String, designation: String, phone: String }, { timestamps: true });
const Faculty = mongoose.model('Faculty', facultySchema);
const attendanceSchema = new mongoose.Schema({ student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, date: Date, course: String, subject: String, status: { type: String, enum: ['Present','Absent','Late'] } }, { timestamps: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);
const examSchema = new mongoose.Schema({ student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, exam: String, subject: String, marks: Number, maxMarks: { type: Number, default: 100 }, grade: String }, { timestamps: true });
const ExamResult = mongoose.model('ExamResult', examSchema);

const auth = (req,res,next) => { try { const token = (req.headers.authorization || '').replace('Bearer ',''); req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } catch { res.status(401).json({message:'Unauthorized'}); } };
const sign = u => jwt.sign({ id:u._id, role:u.role, name:u.name }, process.env.JWT_SECRET, {expiresIn:'1d'});

app.get('/api/health', (_,res)=>res.json({ok:true, service:'OCMS API'}));
app.post('/api/auth/register', async (req,res)=>{ try { const {name,email,password,role='student'}=req.body; const exists=await User.findOne({email}); if(exists) return res.status(409).json({message:'Email already registered'}); const user=await User.create({name,email,password:await bcrypt.hash(password,12),role}); res.status(201).json({user:{id:user._id,name:user.name,email:user.email,role:user.role},token:sign(user)}); } catch(e){res.status(400).json({message:e.message});} });
app.post('/api/auth/login', async (req,res)=>{ const user=await User.findOne({email:req.body.email}); if(!user || !(await bcrypt.compare(req.body.password,user.password))) return res.status(401).json({message:'Invalid credentials'}); res.json({user:{id:user._id,name:user.name,email:user.email,role:user.role},token:sign(user)}); });

for (const [path, Model] of [['students',Student],['faculty',Faculty],['attendance',Attendance],['results',ExamResult]]) {
  app.get(`/api/${path}`, auth, async (_,res)=>res.json(await Model.find().populate(path==='attendance' || path==='results' ? 'student' : '')));
  app.post(`/api/${path}`, auth, async (req,res)=>{ try { res.status(201).json(await Model.create(req.body)); } catch(e){res.status(400).json({message:e.message});} });
  app.put(`/api/${path}/:id`, auth, async (req,res)=>{ try { res.json(await Model.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true})); } catch(e){res.status(400).json({message:e.message});} });
  app.delete(`/api/${path}/:id`, auth, async (req,res)=>{ await Model.findByIdAndDelete(req.params.id); res.status(204).end(); });
}
app.get('/api/dashboard', auth, async (_,res)=>{ const [students,faculty,attendance,results]=await Promise.all([Student.countDocuments(),Faculty.countDocuments(),Attendance.countDocuments(),ExamResult.countDocuments()]); res.json({students,faculty,attendanceRecords:attendance,resultRecords:results}); });

const port=process.env.PORT||5000;
mongoose.connect(process.env.MONGO_URI||'mongodb://127.0.0.1:27017/ocms').then(()=>app.listen(port,()=>console.log(`OCMS API running on ${port}`))).catch(e=>{console.error('MongoDB connection failed:',e.message); process.exit(1);});

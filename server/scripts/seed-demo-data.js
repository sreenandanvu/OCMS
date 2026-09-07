import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const oid = mongoose.Schema.Types.ObjectId;
const User = mongoose.model('User', new mongoose.Schema({name:String,email:{type:String,unique:true},password:String,role:String,active:{type:Boolean,default:true}}));
const Student = mongoose.model('Student', new mongoose.Schema({user:oid,name:String,registerNo:{type:String,unique:true},email:String,phone:String,dob:String,address:String,course:String,semester:Number,subjects:[String],academicHistory:[Object],documents:[Object],status:String,leaveBalance:Number}));
const Faculty = mongoose.model('Faculty', new mongoose.Schema({user:oid,name:String,employeeId:{type:String,unique:true},email:String,phone:String,department:String,designation:String,subjects:[String],classes:[String],timetable:[String]}));
const Attendance = mongoose.model('Attendance', new mongoose.Schema({student:oid,date:Date,course:String,semester:Number,subject:String,period:Number,status:String,markedBy:oid,sessionCode:String,correctionReason:String}));
const Exam = mongoose.model('Exam', new mongoose.Schema({name:String,course:String,semester:Number,date:Date,startTime:String,endTime:String,room:String,students:[oid],subjects:[String],questionPaperUrl:String,published:Boolean}));
const Result = mongoose.model('Result', new mongoose.Schema({exam:oid,student:oid,subject:String,internal:Number,marks:Number,maxMarks:Number,grade:String,gradePoint:Number,published:Boolean,revaluation:String,revaluationReason:String}));
const Assignment = mongoose.model('Assignment', new mongoose.Schema({title:String,description:String,subject:String,faculty:oid,dueDate:Date,resourceUrl:String,submissions:[Object]}));
const Leave = mongoose.model('Leave', new mongoose.Schema({applicant:oid,student:oid,faculty:oid,from:Date,to:Date,reason:String,status:String,decisionNote:String}));
const Timetable = mongoose.model('Timetable', new mongoose.Schema({course:String,semester:Number,day:String,period:Number,startTime:String,endTime:String,subject:String,faculty:String,room:String}));
const Communication = mongoose.model('Communication', new mongoose.Schema({title:String,message:String,audience:String,author:oid}));
const Document = mongoose.model('Document', new mongoose.Schema({student:oid,name:String,type:String,url:String,verified:Boolean}));

const password = value => bcrypt.hash(value, 12);
const user = async data => {
  const existing = await User.findOne({ email:data.email });
  if (existing) return existing;
  return User.create({ ...data, password:await password(data.password) });
};

async function main(){
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ocms');

  const admin = await user({name:'OCMS Administrator',email:'admin@ocms.com',password:'admin123',role:'admin'});
  const facultyUsers = await Promise.all([
    user({name:'Dr. Anjali Menon',email:'anjali@ocms.com',password:'faculty123',role:'faculty'}),
    user({name:'Prof. Rahul Nair',email:'rahul@ocms.com',password:'faculty123',role:'faculty'}),
    user({name:'Prof. Meera Joseph',email:'meera@ocms.com',password:'faculty123',role:'faculty'})
  ]);
  const facultyData = [
    {name:'Dr. Anjali Menon',employeeId:'FAC-1001',email:'anjali@ocms.com',phone:'9876501001',department:'Computer Applications',designation:'Assistant Professor',subjects:['Advanced DBMS','Web Technologies'],classes:['MCA S1','MCA S2'],timetable:['Monday P1','Wednesday P3']},
    {name:'Prof. Rahul Nair',employeeId:'FAC-1002',email:'rahul@ocms.com',phone:'9876501002',department:'Computer Science',designation:'Associate Professor',subjects:['Data Structures','Algorithms'],classes:['MCA S1'],timetable:['Tuesday P2','Thursday P1']},
    {name:'Prof. Meera Joseph',employeeId:'FAC-1003',email:'meera@ocms.com',phone:'9876501003',department:'Mathematics',designation:'Assistant Professor',subjects:['Discrete Mathematics','Statistics'],classes:['MCA S1','MCA S2'],timetable:['Friday P2']}
  ];
  const faculties=[];
  for(let i=0;i<facultyData.length;i++){
    faculties.push(await Faculty.findOneAndUpdate({employeeId:facultyData[i].employeeId},{...facultyData[i],user:facultyUsers[i]._id},{upsert:true,new:true,setDefaultsOnInsert:true}));
  }

  const studentData = [
    ['Akhil Raj','STU-1001','akhil@ocms.com','9876502001','2003-04-18','Kowdiar, Thiruvananthapuram','MCA',1,['Data Structures','Advanced DBMS','Web Technologies','Discrete Mathematics']],
    ['Nandana S','STU-1002','nandana@ocms.com','9876502002','2003-08-09','Vyttila, Kochi','MCA',1,['Data Structures','Advanced DBMS','Web Technologies','Discrete Mathematics']],
    ['Arjun Kumar','STU-1003','arjun@ocms.com','9876502003','2002-11-27','Kollam, Kerala','MCA',2,['Algorithms','Operating Systems','Computer Networks','Software Engineering']],
    ['Devika P','STU-1004','devika@ocms.com','9876502004','2003-01-12','Palakkad, Kerala','MCA',1,['Data Structures','Advanced DBMS','Web Technologies','Discrete Mathematics']],
    ['Vishnu Mohan','STU-1005','vishnu@ocms.com','9876502005','2002-06-21','Kozhikode, Kerala','MCA',2,['Algorithms','Operating Systems','Computer Networks','Software Engineering']]
  ];
  const students=[];
  for(const s of studentData){
    const u=await user({name:s[0],email:s[2],password:'student123',role:'student'});
    students.push(await Student.findOneAndUpdate({registerNo:s[1]},{user:u._id,name:s[0],registerNo:s[1],email:s[2],phone:s[3],dob:s[4],address:s[5],course:s[6],semester:s[7],subjects:s[8],academicHistory:[{semester:1,course:'MCA',gpa:8.4},{semester:2,course:'MCA',gpa:8.8}],documents:[{name:'Previous Semester Mark List',url:'https://example.com/marksheet.pdf'}],status:'Active',leaveBalance:15},{upsert:true,new:true,setDefaultsOnInsert:true}));
  }

  const exam1=await Exam.findOneAndUpdate({name:'MCA Semester 1 Mid Examination'},{name:'MCA Semester 1 Mid Examination',course:'MCA',semester:1,date:new Date('2026-09-18'),startTime:'10:00',endTime:'13:00',room:'Lab 2',students:students.slice(0,4).map(s=>s._id),subjects:['Data Structures','Advanced DBMS','Web Technologies'],questionPaperUrl:'https://example.com/question-paper/mca-s1-mid.pdf',published:true},{upsert:true,new:true,setDefaultsOnInsert:true});
  const exam2=await Exam.findOneAndUpdate({name:'MCA Semester 2 Internal Assessment'},{name:'MCA Semester 2 Internal Assessment',course:'MCA',semester:2,date:new Date('2026-10-05'),startTime:'14:00',endTime:'16:00',room:'Room 204',students:[students[2]._id,students[4]._id],subjects:['Algorithms','Operating Systems'],questionPaperUrl:'https://example.com/question-paper/mca-s2-internal.pdf',published:false},{upsert:true,new:true,setDefaultsOnInsert:true});

  const resultRows=[
    [students[0],exam1,'Data Structures',18,86,'A',9,'None',''],
    [students[0],exam1,'Advanced DBMS',17,82,'A',9,'Requested','Marks verification requested'],
    [students[1],exam1,'Data Structures',16,74,'B+',8,'None',''],
    [students[1],exam1,'Web Technologies',19,91,'A+',10,'None',''],
    [students[3],exam1,'Advanced DBMS',15,68,'B',7,'None',''],
    [students[2],exam2,'Algorithms',18,88,'A',9,'None',''],
    [students[4],exam2,'Operating Systems',17,79,'B+',8,'None','']
  ];
  for(const r of resultRows){
    await Result.findOneAndUpdate({exam:r[1]._id,student:r[0]._id,subject:r[2]},{exam:r[1]._id,student:r[0]._id,subject:r[2],internal:r[3],marks:r[4],maxMarks:100,grade:r[5],gradePoint:r[6],published:r[1]===exam1,revaluation:r[7],revaluationReason:r[8]},{upsert:true,new:true,setDefaultsOnInsert:true});
  }

  const attendanceData=[
    [students[0],1,'Data Structures','Present',1],[students[0],2,'Advanced DBMS','Present',2],[students[0],3,'Web Technologies','Late',3],[students[0],4,'Discrete Mathematics','Present',4],
    [students[1],1,'Data Structures','Present',1],[students[1],2,'Advanced DBMS','Absent',2],[students[1],3,'Web Technologies','Present',3],[students[1],4,'Discrete Mathematics','Present',4],
    [students[2],1,'Algorithms','Present',1],[students[2],2,'Operating Systems','Present',2],[students[2],3,'Computer Networks','Present',3],
    [students[3],1,'Data Structures','Absent',1],[students[3],2,'Advanced DBMS','Absent',2],[students[3],3,'Web Technologies','Present',3],[students[3],4,'Discrete Mathematics','Absent',4],
    [students[4],1,'Algorithms','Present',1],[students[4],2,'Operating Systems','Late',2]
  ];
  for(let i=0;i<attendanceData.length;i++){
    const a=attendanceData[i];
    await Attendance.findOneAndUpdate({student:a[0]._id,date:new Date(`2026-09-${String(1+Math.floor(i/4)).padStart(2,'0')}`),subject:a[2],period:a[4]},{student:a[0]._id,date:new Date(`2026-09-${String(1+Math.floor(i/4)).padStart(2,'0')}`),course:'MCA',semester:a[0].semester,subject:a[2],period:a[4],status:a[3],markedBy:admin._id,sessionCode:`DEMO${String(i+1).padStart(3,'0')}`,correctionReason:a[3]==='Late'?'Demo late arrival':''},{upsert:true,new:true,setDefaultsOnInsert:true});
  }

  const assignmentData=[
    ['Build a REST API','Design and implement a REST API for a college module.','Web Technologies',faculties[0]._id,'2026-09-20','https://example.com/resources/rest-api.pdf'],
    ['Database Normalization','Normalize a college database through 3NF with an ER diagram.','Advanced DBMS',faculties[0]._id,'2026-09-23','https://example.com/resources/dbms.pdf'],
    ['Graph Algorithms','Implement BFS and DFS and compare their complexity.','Algorithms',faculties[1]._id,'2026-09-27','https://example.com/resources/graphs.pdf']
  ];
  for(const a of assignmentData) await Assignment.findOneAndUpdate({title:a[0]},{title:a[0],description:a[1],subject:a[2],faculty:a[3],dueDate:new Date(a[4]),resourceUrl:a[5],submissions:[{student:students[0]._id,submittedAt:new Date('2026-09-08'),fileUrl:'https://example.com/submissions/akhil.pdf',marks:18,feedback:'Good implementation.'}]},{upsert:true,new:true,setDefaultsOnInsert:true});

  const timetableData=[
    ['MCA',1,'Monday',1,'09:00','10:00','Data Structures','Prof. Rahul Nair','Room 101'],
    ['MCA',1,'Monday',2,'10:00','11:00','Advanced DBMS','Dr. Anjali Menon','Lab 2'],
    ['MCA',1,'Tuesday',1,'09:00','10:00','Web Technologies','Dr. Anjali Menon','Lab 1'],
    ['MCA',1,'Wednesday',2,'10:00','11:00','Discrete Mathematics','Prof. Meera Joseph','Room 203'],
    ['MCA',2,'Thursday',1,'09:00','10:00','Algorithms','Prof. Rahul Nair','Room 204'],
    ['MCA',2,'Friday',2,'10:00','11:00','Operating Systems','Dr. Anjali Menon','Room 205']
  ];
  for(const t of timetableData) await Timetable.findOneAndUpdate({course:t[0],semester:t[1],day:t[2],period:t[3]},{course:t[0],semester:t[1],day:t[2],period:t[3],startTime:t[4],endTime:t[5],subject:t[6],faculty:t[7],room:t[8]},{upsert:true,new:true,setDefaultsOnInsert:true});

  const notices=[
    ['Semester 1 Internal Exam Schedule','The Semester 1 internal examination timetable has been published. Please check the Examinations module.','Students'],
    ['Assignment Submission Reminder','Students are requested to submit pending assignments before their due dates.','Students'],
    ['Faculty Meeting','Monthly academic coordination meeting is scheduled for Friday at 3:00 PM in Seminar Hall.','Faculty']
  ];
  for(const n of notices) await Communication.findOneAndUpdate({title:n[0]},{title:n[0],message:n[1],audience:n[2],author:admin._id},{upsert:true,new:true,setDefaultsOnInsert:true});

  const leaveData=[
    {student:students[0]._id,applicant:students[0].user,from:'2026-09-12',to:'2026-09-13',reason:'Family function',status:'Pending',decisionNote:''},
    {student:students[1]._id,applicant:students[1].user,from:'2026-08-20',to:'2026-08-21',reason:'Medical appointment',status:'Approved',decisionNote:'Approved by administrator'},
    {faculty:faculties[1]._id,applicant:faculties[1].user,from:'2026-09-25',to:'2026-09-25',reason:'Personal work',status:'Pending',decisionNote:''}
  ];
  for(const l of leaveData) await Leave.findOneAndUpdate({applicant:l.applicant,from:new Date(l.from),reason:l.reason},l,{upsert:true,new:true,setDefaultsOnInsert:true});

  for(const s of students){
    await Document.findOneAndUpdate({student:s._id,name:'Student ID Card'},{student:s._id,name:'Student ID Card',type:'Identity',url:`https://example.com/documents/${s.registerNo}-id.pdf`,verified:true},{upsert:true,new:true,setDefaultsOnInsert:true});
    await Document.findOneAndUpdate({student:s._id,name:'Semester Mark List'},{student:s._id,name:'Semester Mark List',type:'Academic',url:`https://example.com/documents/${s.registerNo}-marks.pdf`,verified:true},{upsert:true,new:true,setDefaultsOnInsert:true});
  }

  console.log('OCMS demo data ready: students, faculty, attendance, exams, results, assignments, timetable, leaves, communication and documents.');
  await mongoose.disconnect();
}

main().catch(async error=>{ console.error('OCMS demo seed failed:',error.message); await mongoose.disconnect().catch(()=>{}); process.exit(1); });

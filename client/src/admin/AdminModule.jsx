import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  FileText,
  GraduationCap,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getId = (value) => value?._id || value?.id || '';

async function api(path, options = {}) {
  const token = localStorage.getItem('ocms_token');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = response.status === 204
    ? null
    : await response.json().catch(() => ({ message: 'Invalid server response' }));

  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status})`);
  }

  return data;
}

const MODULES = {
  students: {
    title: 'Student Management',
    description: 'Create, update and maintain official student records.',
    endpoint: '/students',
    fields: [
      ['name', 'Name', 'text', true],
      ['registerNo', 'Register No', 'text', true],
      ['email', 'Email', 'email', true],
      ['phone', 'Phone', 'text', false],
      ['dob', 'Date of Birth', 'date', false],
      ['address', 'Address', 'text', false],
      ['course', 'Course', 'text', true],
      ['semester', 'Semester', 'number', true],
      ['status', 'Status', 'text', true],
    ],
  },
  faculty: {
    title: 'Faculty Management',
    description: 'Create, update and maintain faculty profiles.',
    endpoint: '/faculty',
    fields: [
      ['name', 'Name', 'text', true],
      ['employeeId', 'Employee ID', 'text', true],
      ['email', 'Email', 'email', true],
      ['phone', 'Phone', 'text', false],
      ['department', 'Department', 'text', false],
      ['designation', 'Designation', 'text', false],
    ],
  },
  assignments: {
    title: 'Assignment Management',
    description: 'Create and maintain academic assignments.',
    endpoint: '/assignments',
    fields: [
      ['title', 'Title', 'text', true],
      ['description', 'Description', 'text', true],
      ['subject', 'Subject', 'text', true],
      ['dueDate', 'Due Date', 'date', true],
      ['resourceUrl', 'Resource URL', 'url', false],
    ],
  },
  timetable: {
    title: 'Timetable Management',
    description: 'Maintain course, period, room and faculty schedules.',
    endpoint: '/timetable',
    fields: [
      ['course', 'Course', 'text', true],
      ['semester', 'Semester', 'number', true],
      ['day', 'Day', 'text', true],
      ['period', 'Period', 'number', true],
      ['startTime', 'Start Time', 'time', true],
      ['endTime', 'End Time', 'time', true],
      ['subject', 'Subject', 'text', true],
      ['faculty', 'Faculty', 'text', true],
      ['room', 'Room', 'text', true],
    ],
  },
  communications: {
    title: 'Communication Management',
    description: 'Publish announcements for the college community.',
    endpoint: '/communications',
    fields: [
      ['title', 'Title', 'text', true],
      ['message', 'Message', 'textarea', true],
      ['audience', 'Audience', 'select', true],
    ],
  },
};

function AdminModule({ page }) {
  switch (page) {
    case 'students':
    case 'faculty':
    case 'assignments':
    case 'timetable':
    case 'communications':
      return <CrudModule moduleKey={page} />;
    case 'attendance':
      return <AttendanceModule />;
    case 'exams':
      return <ExaminationModule />;
    case 'leaves':
      return <LeaveModule />;
    case 'reports':
      return <ReportsModule />;
    default:
      return <EmptyState title="Module not found" />;
  }
}

function PageHeader({ title, description, action }) {
  return (
    <div className="hero compact">
      <div>
        <span className="pill">ADMINISTRATOR</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Toolbar({ search, setSearch, onRefresh, rows, title }) {
  return (
    <div className="toolbar">
      <div className="search">
        <Search size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search records..."
        />
      </div>
      <button className="secondary" onClick={onRefresh} type="button">
        <RefreshCw size={15} /> Refresh
      </button>
      <button className="secondary" onClick={() => exportExcel(rows, title)} type="button">
        <Download size={15} /> Excel
      </button>
      <button className="secondary" onClick={() => printRows(rows, title)} type="button">
        <Printer size={15} /> Print
      </button>
    </div>
  );
}

function CrudModule({ moduleKey }) {
  const config = MODULES[moduleKey];
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api(config.endpoint);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [moduleKey]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [rows, search]);

  const save = async (form) => {
    const payload = normalizeForm(form, config.fields);
    try {
      await api(`${config.endpoint}${editing?.[0]?._id ? `/${editing[0]._id}` : ''}`, {
        method: editing?.[0]?._id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!id || !window.confirm('Delete this record? This action cannot be undone.')) return;
    try {
      await api(`${config.endpoint}/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="content">
      <PageHeader
        title={config.title}
        description={config.description}
        action={(
          <button className="primary" onClick={() => setEditing([null, {}])} type="button">
            <Plus size={17} /> Add record
          </button>
        )}
      />

      <div className="panel">
        <Toolbar
          search={search}
          setSearch={setSearch}
          onRefresh={load}
          rows={filteredRows}
          title={config.title}
        />
        {error && <ErrorBanner message={error} />}
        {loading ? (
          <Loading />
        ) : filteredRows.length ? (
          <DataTable
            rows={filteredRows}
            fields={config.fields}
            onEdit={(row) => setEditing([row, toForm(row, config.fields)])}
            onDelete={remove}
          />
        ) : (
          <EmptyState title="No records found" action={() => setEditing([null, {}])} />
        )}
      </div>

      {editing && (
        <FormModal
          title={editing[0]?._id ? `Edit ${config.title}` : `Add ${config.title}`}
          fields={config.fields}
          initial={editing[1]}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </section>
  );
}

function AttendanceModule() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [session, setSession] = useState(null);
  const [form, setForm] = useState({
    student: '',
    date: new Date().toISOString().slice(0, 10),
    course: 'MCA',
    semester: 1,
    subject: '',
    period: 1,
    status: 'Present',
  });
  const [sessionForm, setSessionForm] = useState({
    subject: '',
    course: 'MCA',
    semester: 1,
    period: 1,
  });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [attendance, studentRows] = await Promise.all([
        api('/attendance'),
        api('/students'),
      ]);
      setRows(Array.isArray(attendance) ? attendance : []);
      setStudents(Array.isArray(studentRows) ? studentRows : []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
  );

  const markAttendance = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          semester: Number(form.semester),
          period: Number(form.period),
        }),
      });
      setForm((current) => ({ ...current, student: '', subject: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const createSession = async () => {
    setError('');
    try {
      const created = await api('/attendance/session', {
        method: 'POST',
        body: JSON.stringify({
          ...sessionForm,
          semester: Number(sessionForm.semester),
          period: Number(sessionForm.period),
        }),
      });
      setSession(created);
    } catch (err) {
      setError(err.message);
    }
  };

  const correct = async (row) => {
    const status = window.prompt('Enter Present, Absent or Late:', row.status);
    if (!status) return;
    const normalized = status.trim();
    if (!['Present', 'Absent', 'Late'].includes(normalized)) {
      setError('Invalid attendance status.');
      return;
    }
    try {
      await api(`/attendance/${row._id}/correct`, {
        method: 'PATCH',
        body: JSON.stringify({ status: normalized, reason: 'Admin correction' }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="content">
      <PageHeader
        title="Attendance Management"
        description="Mark, review, correct and generate QR attendance sessions."
      />
      {error && <ErrorBanner message={error} />}

      <div className="grid2">
        <div className="panel">
          <PanelTitle title="Mark attendance" sub="Create an authorized attendance record" />
          <form onSubmit={markAttendance}>
            <div className="form-grid">
              <label>
                Student
                <select required value={form.student} onChange={(e) => setForm({ ...form, student: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.registerNo} — {student.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
              <label>Course<input required value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} /></label>
              <label>Semester<input required min="1" type="number" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></label>
              <label>Subject<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
              <label>Period<input required min="1" type="number" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></label>
              <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Present</option><option>Absent</option><option>Late</option></select></label>
            </div>
            <button className="primary" type="submit"><CheckCircle2 size={15} /> Save attendance</button>
          </form>
        </div>

        <div className="panel">
          <PanelTitle title="QR attendance session" sub="Create a session valid for 10 minutes" />
          <div className="form-grid">
            <label>Subject<input value={sessionForm.subject} onChange={(e) => setSessionForm({ ...sessionForm, subject: e.target.value })} /></label>
            <label>Course<input value={sessionForm.course} onChange={(e) => setSessionForm({ ...sessionForm, course: e.target.value })} /></label>
            <label>Semester<input min="1" type="number" value={sessionForm.semester} onChange={(e) => setSessionForm({ ...sessionForm, semester: e.target.value })} /></label>
            <label>Period<input min="1" type="number" value={sessionForm.period} onChange={(e) => setSessionForm({ ...sessionForm, period: e.target.value })} /></label>
          </div>
          <button className="primary" type="button" onClick={createSession}><QrCode size={16} /> Generate QR</button>
          {session && (
            <div className="qr-card" style={{ marginTop: 16, textAlign: 'center' }}>
              <QRCodeSVG value={session.code} size={160} />
              <b style={{ display: 'block', marginTop: 10 }}>{session.code}</b>
              <small>Expires {new Date(session.expiresAt).toLocaleTimeString()}</small>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search attendance..." /></div>
          <button className="secondary" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button>
          <button className="secondary" type="button" onClick={() => exportExcel(filteredRows, 'Attendance Report')}><Download size={15} /> Excel</button>
        </div>
        {filteredRows.length ? (
          <DataTable
            rows={filteredRows}
            fields={[
              ['date', 'Date'],
              ['student', 'Student'],
              ['subject', 'Subject'],
              ['period', 'Period'],
              ['status', 'Status'],
            ]}
            onEdit={correct}
            editLabel="Correct"
          />
        ) : <EmptyState title="No attendance records" />}
      </div>
    </section>
  );
}

function ExaminationModule() {
  const [tab, setTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [examRows, resultRows, studentRows] = await Promise.all([
        api('/exams'),
        api('/results'),
        api('/students'),
      ]);
      setExams(examRows || []);
      setResults(resultRows || []);
      setStudents(studentRows || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const saveExam = async (form) => {
    try {
      const payload = {
        ...form,
        semester: Number(form.semester),
        subjects: String(form.subjects || '').split(',').map((value) => value.trim()).filter(Boolean),
      };
      await api(`/exams${editingExam?._id ? `/${editingExam._id}` : ''}`, {
        method: editingExam?._id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditingExam(null);
      await load();
    } catch (err) { setError(err.message); }
  };

  const saveResult = async (form) => {
    try {
      const marks = Number(form.marks);
      const maxMarks = Number(form.maxMarks || 100);
      const calculated = await api('/results/calculate', {
        method: 'POST',
        body: JSON.stringify({ marks, maxMarks }),
      });
      const payload = {
        ...form,
        internal: Number(form.internal || 0),
        marks,
        maxMarks,
        grade: calculated.grade,
        gradePoint: calculated.gradePoint,
      };
      await api(`/results${editingResult?._id ? `/${editingResult._id}` : ''}`, {
        method: editingResult?._id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setEditingResult(null);
      await load();
    } catch (err) { setError(err.message); }
  };

  const publish = async (id) => {
    try { await api(`/results/${id}/publish`, { method: 'PATCH' }); await load(); }
    catch (err) { setError(err.message); }
  };

  const revaluation = async (row, status) => {
    try {
      await api(`/results/${row._id}/revaluation/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) { setError(err.message); }
  };

  const filteredExams = exams.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const filteredResults = results.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="content">
      <PageHeader
        title="Examination Management"
        description="Schedule exams, maintain marks, calculate grades and publish results."
        action={tab === 'exams' ? <button className="primary" onClick={() => setEditingExam({})} type="button"><Plus size={17} /> Schedule exam</button> : <button className="primary" onClick={() => setEditingResult({})} type="button"><Plus size={17} /> Add result</button>}
      />
      {error && <ErrorBanner message={error} />}

      <div className="tabs">
        <button className={tab === 'exams' ? 'active' : ''} onClick={() => setTab('exams')} type="button">Exam schedule</button>
        <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')} type="button">Marks & results</button>
      </div>

      <div className="panel">
        <div className="toolbar">
          <div className="search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search examinations..." /></div>
          <button className="secondary" onClick={load} type="button"><RefreshCw size={15} /> Refresh</button>
          <button className="secondary" onClick={() => exportExcel(tab === 'exams' ? filteredExams : filteredResults, tab === 'exams' ? 'Examinations' : 'Results')} type="button"><Download size={15} /> Excel</button>
        </div>

        {tab === 'exams' ? (
          filteredExams.length ? (
            <DataTable
              rows={filteredExams}
              fields={[
                ['name', 'Exam'], ['course', 'Course'], ['semester', 'Semester'], ['date', 'Date'],
                ['startTime', 'Start'], ['endTime', 'End'], ['room', 'Room'], ['students', 'Registered'],
              ]}
              onEdit={(row) => setEditingExam(row)}
              onDelete={async (id) => { try { await api(`/exams/${id}`, { method: 'DELETE' }); await load(); } catch (err) { setError(err.message); } }}
            />
          ) : <EmptyState title="No examinations scheduled" action={() => setEditingExam({})} />
        ) : (
          filteredResults.length ? (
            <ResultTable rows={filteredResults} onEdit={setEditingResult} onPublish={publish} onRevaluation={revaluation} />
          ) : <EmptyState title="No result records" action={() => setEditingResult({})} />
        )}
      </div>

      {editingExam && (
        <FormModal
          title={editingExam._id ? 'Edit examination' : 'Schedule examination'}
          fields={[
            ['name', 'Exam Name', 'text', true], ['course', 'Course', 'text', true], ['semester', 'Semester', 'number', true],
            ['date', 'Date', 'date', true], ['startTime', 'Start Time', 'time', true], ['endTime', 'End Time', 'time', true],
            ['room', 'Room', 'text', true], ['subjects', 'Subjects (comma separated)', 'text', true], ['questionPaperUrl', 'Question Paper URL', 'url', false],
          ]}
          initial={{ ...editingExam, subjects: Array.isArray(editingExam.subjects) ? editingExam.subjects.join(', ') : editingExam.subjects || '' }}
          onClose={() => setEditingExam(null)}
          onSave={saveExam}
        />
      )}

      {editingResult && (
        <FormModal
          title={editingResult._id ? 'Edit result' : 'Add result'}
          fields={[
            ['student', 'Student ID', 'select-student', true], ['exam', 'Exam ID', 'select-exam', true],
            ['subject', 'Subject', 'text', true], ['internal', 'Internal Marks', 'number', true],
            ['marks', 'Marks', 'number', true], ['maxMarks', 'Maximum Marks', 'number', true],
          ]}
          initial={editingResult}
          options={{ students, exams }}
          onClose={() => setEditingResult(null)}
          onSave={saveResult}
        />
      )}
    </section>
  );
}

function ResultTable({ rows, onEdit, onPublish, onRevaluation }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Student</th><th>Exam</th><th>Subject</th><th>Internal</th><th>Marks</th><th>Grade</th><th>Revaluation</th><th>Published</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              <td>{format(row.student)}</td>
              <td>{format(row.exam)}</td>
              <td>{format(row.subject)}</td>
              <td>{format(row.internal)}</td>
              <td>{format(row.marks)} / {format(row.maxMarks)}</td>
              <td>{format(row.grade)}</td>
              <td>{format(row.revaluation)}</td>
              <td>{row.published ? 'Published' : 'Draft'}</td>
              <td>
                <button className="icon-btn" onClick={() => onEdit(row)} type="button"><Edit3 size={14} /></button>
                {!row.published && <button className="secondary small" onClick={() => onPublish(row._id)} type="button">Publish</button>}
                {row.revaluation === 'Requested' && <>
                  <button className="mini" onClick={() => onRevaluation(row, 'Approved')} type="button">Approve</button>
                  <button className="mini danger" onClick={() => onRevaluation(row, 'Rejected')} type="button">Reject</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaveModule() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try { setRows(await api('/leaves')); } catch (err) { setError(err.message); }
  };

  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    try {
      await api(`/leaves/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, decisionNote: `Reviewed by administrator` }),
      });
      await load();
    } catch (err) { setError(err.message); }
  };

  return (
    <section className="content">
      <PageHeader title="Leave Management" description="Review and decide pending student and faculty leave requests." />
      {error && <ErrorBanner message={error} />}
      <div className="panel">
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Applicant</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Decision</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>{format(row.student) || format(row.faculty) || 'Applicant'}</td>
                    <td>{formatDate(row.from)}</td>
                    <td>{formatDate(row.to)}</td>
                    <td>{format(row.reason)}</td>
                    <td><Status value={row.status} /></td>
                    <td>{row.status === 'Pending' && <><button className="mini" onClick={() => decide(row._id, 'Approved')} type="button">Approve</button><button className="mini danger" onClick={() => decide(row._id, 'Rejected')} type="button">Reject</button></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No leave requests" />}
      </div>
    </section>
  );
}

function ReportsModule() {
  const [attendance, setAttendance] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [a, p, l] = await Promise.all([
        api('/reports/attendance'),
        api('/reports/performance'),
        api('/reports/low-attendance'),
      ]);
      setAttendance(a || []);
      setPerformance(p || []);
      setLowAttendance(l || []);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="content">
      <PageHeader title="Reports & Analytics" description="Monitor attendance, academic performance and low-attendance students." />
      {error && <ErrorBanner message={error} />}
      <div className="grid2">
        <div className="panel"><PanelTitle title="Attendance by subject" sub="Present percentage" />{attendance.length ? <BarList rows={attendance} value="percentage" /> : <EmptyState title="No attendance data" />}</div>
        <div className="panel"><PanelTitle title="Performance by subject" sub="Average marks" />{performance.length ? <BarList rows={performance} value="avgMarks" /> : <EmptyState title="No result data" />}</div>
      </div>
      <div className="panel">
        <PanelTitle title="Low-attendance students" sub="Students below the 75% threshold" />
        {lowAttendance.length ? (
          <div className="table-wrap"><table><thead><tr><th>Student</th><th>Register No</th><th>Course</th><th>Semester</th><th>Attendance</th></tr></thead><tbody>{lowAttendance.map((row, index) => <tr key={index}><td>{format(row.student?.name)}</td><td>{format(row.student?.registerNo)}</td><td>{format(row.student?.course)}</td><td>{format(row.student?.semester)}</td><td><Status value={`${Math.round(row.percentage)}%`} /></td></tr>)}</tbody></table></div>
        ) : <EmptyState title="No low-attendance students" />}
      </div>
    </section>
  );
}

function FormModal({ title, fields, initial = {}, options = {}, onClose, onSave }) {
  const [form, setForm] = useState(initial);

  const submit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  return (
    <div className="modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} type="button"><X /></button>
        </div>
        <div className="form-grid">
          {fields.map(([name, label, type, required]) => (
            <label className={type === 'textarea' ? 'full' : ''} key={name}>
              {label}
              {type === 'textarea' ? (
                <textarea required={required} value={form[name] ?? ''} onChange={(e) => setValue(name, e.target.value)} />
              ) : type === 'select' ? (
                <select required={required} value={form[name] ?? 'All'} onChange={(e) => setValue(name, e.target.value)}><option>All</option><option>Students</option><option>Faculty</option><option>Admin</option></select>
              ) : type === 'select-student' ? (
                <select required={required} value={getId(form[name]) || form[name] || ''} onChange={(e) => setValue(name, e.target.value)}><option value="">Select student</option>{(options.students || []).map((student) => <option key={student._id} value={student._id}>{student.registerNo} — {student.name}</option>)}</select>
              ) : type === 'select-exam' ? (
                <select required={required} value={getId(form[name]) || form[name] || ''} onChange={(e) => setValue(name, e.target.value)}><option value="">Select exam</option>{(options.exams || []).map((exam) => <option key={exam._id} value={exam._id}>{exam.name}</option>)}</select>
              ) : (
                <input required={required} type={type} value={Array.isArray(form[name]) ? form[name].join(', ') : (form[name] ?? '')} onChange={(e) => setValue(name, type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />
              )}
            </label>
          ))}
        </div>
        <div className="actions">
          <button className="secondary" onClick={onClose} type="button">Cancel</button>
          <button className="primary" type="submit"><CheckCircle2 size={15} /> Save</button>
        </div>
      </form>
    </div>
  );
}

function DataTable({ rows, fields, onEdit, onDelete, editLabel = null }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{fields.map(([key, label]) => <th key={key}>{label}</th>)}<th>Actions</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getId(row) || JSON.stringify(row)}>
              {fields.map(([key]) => <td key={key}>{key === 'date' ? formatDate(row[key]) : format(row[key])}</td>)}
              <td>
                <button className="icon-btn" onClick={() => onEdit(row)} type="button" title={editLabel || 'Edit'}><Edit3 size={14} /></button>
                {onDelete && <button className="icon-btn danger" onClick={() => onDelete(getId(row))} type="button"><Trash2 size={14} /></button>}
                {editLabel && <button className="secondary small" onClick={() => onEdit(row)} type="button">{editLabel}</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanelTitle({ title, sub }) {
  return <div className="panel-title"><h3>{title}</h3><small>{sub}</small></div>;
}

function ErrorBanner({ message }) {
  return <div className="error banner"><AlertTriangle size={15} /> {message}</div>;
}

function Loading() {
  return <div className="loading"><RefreshCw className="spin" /> Loading...</div>;
}

function EmptyState({ title, action }) {
  return <div className="empty"><div className="empty-icon"><FileText /></div><h3>{title}</h3>{action && <button className="primary" onClick={action} type="button"><Plus size={15} /> Create record</button>}</div>;
}

function Status({ value }) {
  return <span className={`status ${value || ''}`}>{value || '—'}</span>;
}

function BarList({ rows, value }) {
  return <div className="bars">{rows.map((row, index) => <div className="bar-row" key={index}><span>{row.subject || 'Unknown'}</span><div><i style={{ width: `${Math.min(100, Number(row[value]) || 0)}%` }} /></div><b>{Number(row[value] || 0).toFixed(1)}</b></div>)}</div>;
}

function format(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return value.name || value.registerNo || value.email || value._id || '—';
  return String(value);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function normalizeForm(form, fields) {
  const data = { ...form };
  delete data._id;
  delete data.createdAt;
  delete data.updatedAt;

  fields.forEach(([name, , type]) => {
    if (type === 'number' && data[name] !== '') data[name] = Number(data[name]);
    if (name === 'subjects' && typeof data[name] === 'string') {
      data[name] = data[name].split(',').map((value) => value.trim()).filter(Boolean);
    }
  });

  return data;
}

function toForm(row, fields) {
  const form = { ...row };
  fields.forEach(([name]) => {
    if (Array.isArray(form[name])) form[name] = form[name].join(', ');
  });
  return form;
}

function exportExcel(rows, title) {
  const data = rows.map((row) => {
    const output = { ...row };
    Object.keys(output).forEach((key) => {
      if (typeof output[key] === 'object') output[key] = format(output[key]);
    });
    return output;
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, `${title.replace(/\W+/g, '-')}.xlsx`);
}

function printRows(rows, title) {
  const documentPdf = new jsPDF();
  documentPdf.setFontSize(16);
  documentPdf.text(title, 14, 18);
  documentPdf.setFontSize(9);
  let y = 28;
  rows.slice(0, 45).forEach((row, index) => {
    const line = `${index + 1}. ${Object.entries(row)
      .filter(([key]) => !['_id', '__v'].includes(key))
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${format(value)}`)
      .join(' | ')}`;
    documentPdf.text(line.slice(0, 145), 14, y);
    y += 6;
    if (y > 285) {
      documentPdf.addPage();
      y = 18;
    }
  });
  documentPdf.save(`${title.replace(/\W+/g, '-')}.pdf`);
}

export default AdminModule;

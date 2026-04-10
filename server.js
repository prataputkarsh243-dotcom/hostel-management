const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// =====================================
// 🎯 STATIC FILES & PATH FIX
// =====================================
app.use(express.static(__dirname)); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// =====================================
// 🗄️ CLOUD DATABASE CONNECTION (MONGODB ATLAS)
// =====================================
// Tumhari naya connection string yahan hai
const dbURI = "mongodb+srv://hosteladmin:MyHostel123@cluster0.qcnxfrm.mongodb.net/hostelProDB?retryWrites=true&w=majority";

mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Atlas (Cloud) Connected! 🚀"))
    .catch(err => console.log("❌ DB Connection Error: ", err.message));

// =====================================
// 📝 MODELS
// =====================================
const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({
    studentId: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true },
    password: { type: String },
    room: String,
    totalFee: { type: Number, default: 50000 },
    paidFee: { type: Number, default: 0 }
}));

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', new mongoose.Schema({
    studentId: String, studentName: String, roomNumber: String,
    category: String, issue: String, status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
}));

// =====================================
// 🔑 API ROUTES
// =====================================

app.post('/api/students', async (req, res) => {
    try {
        const { name, email, password, room } = req.body;
        const studentId = "#S" + Math.floor(100 + Math.random() * 900);
        const newStudent = new Student({ studentId, name, email, password: password || 'pass123', room });
        await newStudent.save();
        res.json({ success: true, studentId });
    } catch (err) { res.json({ success: false, message: "Error!" }); }
});

app.post('/api/login', async (req, res) => {
    const { role, identifier, password } = req.body;
    if (role === 'admin') {
        if (identifier === 'admin@hostel.com' && password === 'admin123') return res.json({ success: true, role: 'admin' });
    } else {
        const student = await Student.findOne({ email: identifier, password: password });
        if (student) return res.json({ success: true, role: 'student', studentData: student });
    }
    res.json({ success: false });
});

app.get('/api/dashboard-stats', async (req, res) => {
    const totalStudents = await Student.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
    const students = await Student.find();
    const totalPaid = students.reduce((sum, s) => sum + s.paidFee, 0);
    res.json({ totalStudents, roomsAvailable: 20 - totalStudents, pendingComplaints, monthlyRevenue: `₹${totalPaid.toLocaleString()}` });
});

app.get('/api/students', async (req, res) => res.json(await Student.find()));
app.get('/api/analytics', async (req, res) => {
    const students = await Student.find().limit(5);
    const pending = await Complaint.countDocuments({ status: 'Pending' });
    const solved = await Complaint.countDocuments({ status: 'Solved' });
    res.json({ revenueData: students.map(s => ({ name: s.name, paid: s.paidFee })), complaintStats: { pending, solved } });
});

app.get('/api/rooms', (req, res) => res.json([{ roomNumber: "101", totalBeds: 2, occupiedBeds: 1 }, { roomNumber: "102", totalBeds: 2, occupiedBeds: 2 }]));
app.post('/api/pay-fee', async (req, res) => { await Student.findOneAndUpdate({ studentId: req.body.studentId }, { $inc: { paidFee: Number(req.body.amount) } }); res.json({ success: true }); });
app.post('/api/complaints', async (req, res) => { await new Complaint(req.body).save(); res.json({ success: true }); });
app.get('/api/complaints', async (req, res) => res.json(await Complaint.find().sort({ date: -1 })));
app.put('/api/complaints/:id/solve', async (req, res) => { await Complaint.findByIdAndUpdate(req.params.id, { status: 'Solved' }); res.json({ success: true }); });
app.delete('/api/students/:id', async (req, res) => { await Student.findOneAndDelete({ studentId: req.params.id }); res.json({ success: true }); });

// =====================================
// 🚀 DYNAMIC PORT FOR RENDER
// =====================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server Live on Port: ${PORT}`));
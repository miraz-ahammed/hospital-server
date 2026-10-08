const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.CLIENT_URI;

// Middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('You successfully connected to MongoDB!');

    // ডেটাবেস ও কালেকশন
    const db = client.db('hospitalDB');
    const departments = db.collection('departments');
    const doctors = db.collection('doctors');
    const appointments = db.collection('appointments');

    // ================= DEPARTMENTS =================

    // সব ডিপার্টমেন্ট দেখা
    app.get('/departments', async (req, res) => {
      const result = await departments.find().toArray();
      res.send(result);
    });

    // নতুন ডিপার্টমেন্ট যোগ
    app.post('/departments', async (req, res) => {
      const { name, description, icon } = req.body;
      if (!name) return res.status(400).send({ message: 'name is required' });
      const result = await departments.insertOne({
        name,
        description,
        icon,
        createdAt: new Date(),
      });
      res.send(result);
    });

    // ডিপার্টমেন্ট আপডেট
    app.patch('/departments/:id', async (req, res) => {
      const result = await departments.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    // ডিপার্টমেন্ট ডিলিট
    app.delete('/departments/:id', async (req, res) => {
      const result = await departments.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // ================= DOCTORS =================

    // সব ডাক্তার (?department=Cardiology দিয়ে ফিল্টার করা যাবে)
    app.get('/doctors', async (req, res) => {
      const query = {};
      if (req.query.department) query.department = req.query.department;
      const result = await doctors.find(query).toArray();
      res.send(result);
    });

    // একজন ডাক্তার
    app.get('/doctors/:id', async (req, res) => {
      const result = await doctors.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // নতুন ডাক্তার যোগ
    app.post('/doctors', async (req, res) => {
      const { name, department, specialization, experience, fee, image, bio } =
        req.body;
      if (!name || !department)
        return res
          .status(400)
          .send({ message: 'name and department are required' });
      const result = await doctors.insertOne({
        name,
        department,
        specialization,
        experience,
        fee,
        image,
        bio,
        createdAt: new Date(),
      });
      res.send(result);
    });

    // ডাক্তার আপডেট
    app.patch('/doctors/:id', async (req, res) => {
      const result = await doctors.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    // ডাক্তার ডিলিট
    app.delete('/doctors/:id', async (req, res) => {
      const result = await doctors.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // ================= APPOINTMENTS =================

    // সব অ্যাপয়েন্টমেন্ট (?email=... দিয়ে একজন রোগীর গুলো)
    app.get('/appointments', async (req, res) => {
      const query = {};
      if (req.query.email) query.patientEmail = req.query.email;
      const result = await appointments
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // অ্যাপয়েন্টমেন্ট বুক করা
    app.post('/appointments', async (req, res) => {
      const { patientName, patientEmail, phone, doctorId, date, timeSlot, reason } =
        req.body;

      if (!patientName || !patientEmail || !doctorId || !date || !timeSlot) {
        return res.status(400).send({ message: 'Missing required fields' });
      }

      // একই ডাক্তার, একই দিন, একই স্লটে ডাবল বুকিং আটকানো
      const alreadyBooked = await appointments.findOne({
        doctorId,
        date,
        timeSlot,
        status: { $ne: 'cancelled' },
      });
      if (alreadyBooked) {
        return res
          .status(409)
          .send({ message: 'This time slot is already booked' });
      }

      const result = await appointments.insertOne({
        patientName,
        patientEmail,
        phone,
        doctorId,
        date,
        timeSlot,
        reason,
        status: 'pending',
        createdAt: new Date(),
      });
      res.send(result);
    });

    // স্ট্যাটাস বদলানো (pending, confirmed, completed, cancelled)
    app.patch('/appointments/:id', async (req, res) => {
      const { status } = req.body;
      const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
      if (!allowed.includes(status)) {
        return res.status(400).send({ message: 'Invalid status' });
      }
      const result = await appointments.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status } }
      );
      res.send(result);
    });

    // অ্যাপয়েন্টমেন্ট ডিলিট
    app.delete('/appointments/:id', async (req, res) => {
      const result = await appointments.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}
run();

// টেস্ট রুট
app.get('/', (req, res) => {
  res.send('Hospital server is running');
});



    // শুধু ডেভেলপমেন্টে ডেটা সিড করার জন্য (কাজ শেষে মুছে ফেলবে)
    app.post('/seed/departments', async (req, res) => {
      const data = [
        { name: 'Cardiology', description: 'Heart Care', icon: 'heart' },
        { name: 'Neurology', description: 'Brain & Nerves', icon: 'brain' },
        { name: 'Orthopedics', description: 'Bone & Joint', icon: 'bone' },
        { name: 'Pediatrics', description: 'Child Care', icon: 'baby' },
        { name: 'Gynecology', description: "Women's Health", icon: 'female' },
        { name: 'Oncology', description: 'Cancer Care', icon: 'ribbon' },
        { name: 'Internal Medicine', description: 'General Medicine', icon: 'stethoscope' },
        { name: 'Emergency', description: '24/7 Emergency', icon: 'ambulance' },
      ].map((d) => ({ ...d, createdAt: new Date() }));

      const result = await departments.insertMany(data);
      res.send(result);
    });


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
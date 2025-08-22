require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Proposal = require('./models/Proposal');
const Project = require('./models/Project');

const { SERVER_URL, PORT } = process.env;
const API_URL = `${SERVER_URL}:${PORT}/api`;

const NUM_MENTORS = 2;
const NUM_STUDENTS = 50;

const seed = process.argv || 'default_seed';
console.log(`Using seed: ${seed}`);
const rng = crypto.createHash('sha256').update(String(seed)).digest();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();
    console.log('Clearing existing data...');
    await Project.deleteMany({});
    await Proposal.deleteMany({});
    await User.deleteMany({});
    console.log('Existing data cleared');
    console.log('Seeding data...');

    const hashedPassword = await bcrypt.hash('123', 10);
    const hod = await User.create({
      fullName: 'Dr. Head of Department',
      email: 'firassharary3@gmail.com',
      idNumber: '100000000',
      phoneNumber: '050-1234567',
      role: 'hod',
      password: hashedPassword,
    });
    const hodToken = jwt.sign({ id: hod._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('HOD created and logged in');

    const registerAndLogin = async (userData) => {
      try {
        await axios.post(`${API_URL}/auth/register`, userData);
      } catch (error) {
        if (error.response) {
          console.error(`Registration failed for ${userData.email}:`, error.response.data);
          if (error.response.data.error !== 'User already exists') {
            throw error;
          }
        } else {
          throw error;
        }
      }
      const response = await axios.post(`${API_URL}/auth/login`, {
        idNumber: userData.idNumber,
        password: userData.password,
      });
      const user = await User.findOne({ idNumber: userData.idNumber }).lean();
      return { token: response.data.token, user };
    };

    const mentors = [];
    for (let i = 0; i < NUM_MENTORS; i++) {
      const mentorData = {
        fullName: `Mentor ${i + 1}`,
        email: `mentor${i + 1}@example.com`,
        idNumber: `2${String(i).padStart(8, '0')}`,
        phoneNumber: `052-11111${String(i).padStart(2, '0')}`,
        role: 'mentor',
        password: 'password123',
      };
      const { user } = await registerAndLogin(mentorData);
      await axios.put(`${API_URL}/hod/users/${user._id}/role`, { role: 'mentor' }, {
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      mentors.push(user);
    }
    console.log('Mentors created and logged in');

    const studentAuthData = {};
    const students = [];
    for (let i = 0; i < NUM_STUDENTS; i++) {
      const studentData = {
        fullName: `Student ${i + 1}`,
        email: `student${i + 1}@example.com`,
        idNumber: `3${String(i).padStart(8, '0')}`,
        phoneNumber: `054-22222${String(i).padStart(2, '0')}`,
        role: 'student',
        password: 'password123',
      };
      const { token, user } = await registerAndLogin(studentData);
      studentAuthData[user._id] = token;
      students.push(user);
    }
    console.log('Students created and logged in');

    // Create groups of 1 or 2 students
    const shuffledStudents = [...students].sort(() => 0.5 - (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff));
    const studentGroups = [];
    const usedIds = new Set();

    for (const student of shuffledStudents) {
        if (usedIds.has(student._id.toString())) continue;

        // Decide if student works alone or in a pair
        const worksInPair = (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff) > 0.5;
        let pairPartner = null;

        if (worksInPair) {
            pairPartner = shuffledStudents.find(s => !usedIds.has(s._id.toString()) && s._id.toString() !== student._id.toString());
        }

        if (pairPartner) {
            studentGroups.push([student, pairPartner]);
            usedIds.add(student._id.toString());
            usedIds.add(pairPartner._id.toString());
        } else {
            studentGroups.push([student]);
            usedIds.add(student._id.toString());
        }
    }
    console.log(`${studentGroups.length} student groups created.`);

    const createdProposals = [];
    for (const group of studentGroups) {
      const [author, coStudent] = group;
      const authorToken = studentAuthData[author._id];
      const suggestedMentor = mentors[crypto.randomBytes(4).readUInt32BE(0) % mentors.length];

      const proposalData = {
        projectName: `Project by ${author.fullName}${coStudent ? ` and ${coStudent.fullName}` : ''}`,
        background: 'This is a dummy project background.',
        objectives: 'These are the dummy project objectives.',
        marketReview: 'This is a dummy market review.',
        newOrImproved: 'This is what is new or improved.',
        suggestedMentor: suggestedMentor._id,
        address: `Dummy Address ${group.map(s => s.fullName).join(', ')}`,
        endOfStudies: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      };
      if (coStudent) {
        proposalData.coStudent = coStudent._id;
      }

      const response = await axios.post(`${API_URL}/proposals/draft`, proposalData, {
        headers: { Authorization: `Bearer ${authorToken}` },
      });
      createdProposals.push(response.data);
    }
    console.log('Draft proposals created');

    for (const proposal of createdProposals) {
      const authorToken = studentAuthData[proposal.author];
      await axios.put(`${API_URL}/proposals/${proposal._id}/submit`, {}, {
        headers: { Authorization: `Bearer ${authorToken}` },
      });
    }
    console.log('Proposals submitted');

    const pendingProposals = await Proposal.find({ status: 'Pending' });
    for (const proposal of pendingProposals) {
      const decision = (crypto.randomBytes(4).readUInt32BE(0) / 0xffffffff);
      if (decision < 0.33) {
        await axios.put(`${API_URL}/proposals/${proposal._id}/approve`, { mentorId: proposal.suggestedMentor }, {
          headers: { Authorization: `Bearer ${hodToken}` },
        });
      } else if (decision < 0.66) {
        await axios.put(`${API_URL}/proposals/${proposal._id}/reject`, { reason: 'This is a dummy rejection reason.' }, {
          headers: { Authorization: `Bearer ${hodToken}` },
        });
      }
      // else, leave pending
    }
    console.log('Proposals reviewed');

    console.log('Data seeded successfully');
  } catch (err) {
    console.error('Error seeding data:', err.response ? err.response.data : err.message);
    if (err.response) console.error(err.response.data);
  } finally {
    mongoose.connection.close();
  }
};

seedData();
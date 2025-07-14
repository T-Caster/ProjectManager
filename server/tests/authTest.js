const axios = require('axios');

const API = axios.create({
  baseURL: 'http://localhost:5000/api/auth',
  headers: { 'Content-Type': 'application/json' }
});

(async () => {
  try {
    // Register
    await API.post('/register', {
      fullName: 'Automated User',
      email: 'auto@example.com',
      idNumber: '123456789',
      password: 'test123'
    });
    console.log('✅ Registered');

    // Login
    const { data } = await API.post('/login', {
      idNumber: '123456789',
      password: 'test123'
    });
    const token = data.token;
    console.log('✅ Logged in, got token:', token);

    // Call protected route
    const protectedRes = await API.get('/protected', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Protected route response:', protectedRes.data);

    // Forgot password
    await API.post('/forgot-password', {
      idNumber: '123456789'
    });
    console.log('📧 Recovery code sent via email (check your inbox)');

    // Reset password
    // const code = 'ENTER_CODE_HERE';
    // await API.post('/reset-password', {
    //   idNumber: '123456789',
    //   recoveryCode: code,
    //   password: 'newpass123'
    // });
    // console.log('✅ Password reset');

    // Delete automated user
    await API.delete('/delete-user', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('🗑️  User deleted');

  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
})();

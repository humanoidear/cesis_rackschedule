const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const basicAuthHeader = () => {
  const username = process.env.NETIO_USERNAME || '';
  const password = process.env.NETIO_PASSWORD || '';
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
};

async function NETIO_On(ip, action = 1) {
  try {
    if (!ip) {
      console.warn(`${new Date().toISOString()} - NETIO_On skipped (missing IP).`);
      return "ERROR";
    }
    const netioRes = await fetch(`http://${ip}/netio.json`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Outputs: [{ ID: action, Action: 1 }] })
    });

    return netioRes.ok ? "OK" : "ERROR";
  } catch (err) {
    return "ERROR";
  }
}

async function NETIO_Off(ip, action = 1) {
  try {
    if (!ip) {
      console.warn(`${new Date().toISOString()} - NETIO_Off skipped (missing IP).`);
      return "ERROR";
    }
    const netioRes = await fetch(`http://${ip}/netio.json`, {
      method: 'POST',
      headers: {
        'Authorization': basicAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Outputs: [{ ID: action, Action: 0 }] })
    });

    return netioRes.ok ? "OK" : "ERROR";
  } catch (err) {
    return "ERROR";
  }
}

// Load netio IPs from streams.json
function getNetioIPs() {
  try {
    const streamsPath = path.join(__dirname, 'streams.json');
    const streamsData = fs.readFileSync(streamsPath, 'utf8');
    const streams = JSON.parse(streamsData);
    
    const netioIPs = [];
    for (const room in streams) {
      if (streams[room].netio) {
        netioIPs.push(streams[room].netio);
      }
    }
    return netioIPs;
  } catch (err) {
    console.error(`${new Date().toISOString()} - Error loading netio IPs:`, err.message);
    return [];
  }
}

// Turn on all racks
async function turnOnAllRacks() {
  const netioIPs = getNetioIPs();
  console.log(`${new Date().toISOString()} - Turning ON all racks (${netioIPs.length} racks)`);
  
  for (const ip of netioIPs) {
    const result0 = await NETIO_On(ip, 2);
    console.log(`${new Date().toISOString()} - NETIO_On ${ip} ID 0: ${result0}`);
    const result1 = await NETIO_On(ip, 1);
    console.log(`${new Date().toISOString()} - NETIO_On ${ip} ID 1: ${result1}`);
  }
}

// Turn off all racks
async function turnOffAllRacks() {
  const netioIPs = getNetioIPs();
  console.log(`${new Date().toISOString()} - Turning OFF all racks (${netioIPs.length} racks)`);
  
  for (const ip of netioIPs) {
    const result0 = await NETIO_Off(ip, 2);
    console.log(`${new Date().toISOString()} - NETIO_Off ${ip} ID 0: ${result0}`);
    const result1 = await NETIO_Off(ip, 1);
    console.log(`${new Date().toISOString()} - NETIO_Off ${ip} ID 1: ${result1}`);
  }
}

// Schedule cron jobs: 7am ON (Mon-Fri), 10pm OFF (Mon-Fri)
function startRackSchedule() {
  // Set timezone to CEST +0200
  const machineTimezone = 'Europe/Paris'; // Replace with actual machine timezone if needed

  // 7am (07:00) Monday-Friday - Turn ON all racks
  cron.schedule('0 5 * * 1-5', () => {
    turnOnAllRacks();
  }, { timeZone: machineTimezone });
  console.log(`${new Date().toISOString()} - Cron job scheduled: Turn ON racks at 7am (Mon-Fri)`);

  // 10pm (22:00) Monday-Friday - Turn OFF all racks
  cron.schedule('0 20 * * 1-5', () => {
    turnOffAllRacks();
  }, { timeZone: machineTimezone });
  console.log(`${new Date().toISOString()} - Cron job scheduled: Turn OFF racks at 10pm (Mon-Fri)`);
}

// Start the schedule on application startup
startRackSchedule();
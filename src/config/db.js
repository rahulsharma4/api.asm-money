const mongoose = require('mongoose');
const dns = require('dns');

// Fix querySrv ECONNREFUSED on Windows by setting reliable DNS servers (Google 8.8.8.8 & Cloudflare 1.1.1.1)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.log('DNS setServers notice:', e.message);
}

try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

const autoSeedAdmin = async () => {
  try {
    const User = require('../models/userModel');
    const adminEmail = (process.env.ADMIN_EMAIL || 'asmmoney52@gmail.com').toLowerCase().trim();
    const adminName = process.env.ADMIN_NAME || 'ASM MONEY';
    const adminPhone = process.env.ADMIN_PHONE || '9093610141';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: adminName,
        email: adminEmail,
        phone: adminPhone,
        password: adminPassword,
        role: 'admin',
        status: 'active',
      });
      await admin.save();
      console.log(`Auto-created initial Admin account: ${adminEmail}`);
    } else {
      console.log(`Admin account verified: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Auto seed admin error:', err.message);
  }
};

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  if (isConnecting) return;
  isConnecting = true;

  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/asm_money';
  
  // Try SRV URI, direct non-SRV URIs, and local MongoDB
  const uriList = [
    primaryUri,
    'mongodb+srv://rahulbhardwaz2k1_db_user:rbEnqhspoMKoNctx@cluster0.2cxxsak.mongodb.net/asm_money?retryWrites=true&w=majority&appName=Cluster0',
    'mongodb://rahulbhardwaz2k1_db_user:rbEnqhspoMKoNctx@ac-lhv86a6-shard-00-00.2cxxsak.mongodb.net:27017,ac-lhv86a6-shard-00-01.2cxxsak.mongodb.net:27017,ac-lhv86a6-shard-00-02.2cxxsak.mongodb.net:27017/asm_money?ssl=true&replicaSet=atlas-13o639-shard-0&authSource=admin&retryWrites=true&w=majority',
    'mongodb+srv://rahulbhardwaz2k1_db_user:esDy4tuVMVd73Tbk@cluster0.gies81v.mongodb.net/asm_money?retryWrites=true&w=majority&appName=Cluster0',
    'mongodb://127.0.0.1:27017/asm_money'
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const uri of uriList) {
    try {
      console.log(`Attempting MongoDB Connection...`);
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
      isConnecting = false;
      await autoSeedAdmin();
      return;
    } catch (error) {
      console.error(`MongoDB Connection Attempt Failed [${uri.split('@')[1] || uri}]: ${error.message}`);
    }
  }

  isConnecting = false;
  console.error('All MongoDB connection attempts failed. Retrying in 5 seconds...');
  setTimeout(() => {
    connectDB();
  }, 5000);
};

module.exports = connectDB;

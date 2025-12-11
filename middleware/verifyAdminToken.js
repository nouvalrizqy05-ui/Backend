// middleware/verifyAdminToken.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyAdminToken(req, res, next){
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if(!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1] || authHeader;
  if(!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if(err) return res.status(403).json({ message: 'Invalid token' });
    if(!decoded || decoded.role !== 'admin') return res.status(403).json({ message: 'Require admin' });
    req.user = decoded;
    next();
  });
}

module.exports = verifyAdminToken;

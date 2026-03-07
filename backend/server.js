// D:\SalesCRM\backend\server.js
require("dotenv").config();
const app = require("./config/app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Sales CRM API running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Run this to free it: Get-Process -Name node | Stop-Process -Force`);
    console.error(`   Then restart: npm run dev\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

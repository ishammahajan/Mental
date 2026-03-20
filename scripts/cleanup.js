const fs = require('fs');

const files = [
  'd:\\My codes\\Makers lab group assignment\\components\\StudentDashboard.tsx',
  'd:\\My codes\\Makers lab group assignment\\components\\CounselorDashboard.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Strip chat imports
  content = content.replace(/import \* as chat from '\.\.\/services\/chatService';\n?/g, '');

  // Strip or replace chat service calls safely
  // markThreadAsRead
  content = content.replace(/await chat\.markThreadAsRead\([^)]+\);?/g, '');
  
  // getUnreadP2PCount (both inside setUnreadP2P and directly)
  content = content.replace(/setUnreadP2P\(await chat\.getUnreadP2PCount\([^)]+\)\);?/g, 'setUnreadP2P(0);');
  content = content.replace(/chat\.getUnreadP2PCount\([^)]+\),?/g, '0,');
  
  // getP2PThread
  content = content.replace(/setP2PMessages\(await chat\.getP2PThread\([^)]+\)\);?/g, '');
  content = content.replace(/setChatHistory\(await chat\.getP2PThread\([^)]+\)\);?/g, '');
  
  // sendP2PMessage (the Emergency Alert object variant and the simple variant)
  // This regex matches `await chat.sendP2PMessage({ ... });`
  content = content.replace(/await chat\.sendP2PMessage\(\{[^}]+\}\);?/g, '');

  content = content.replace(/await chat\.sendP2PMessage\([^;]+;/g, '');

  fs.writeFileSync(f, content);
  console.log(`Cleaned ${f}`);
});

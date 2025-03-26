// Test function to identify syntax error
function testFunction() {
  const var1 = "test";
  const var2 = "test2";
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Test</h1>
  <p>${var1}</p>
  <p>${var2}</p>
</body>
</html>
`;
}

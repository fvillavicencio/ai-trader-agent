const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

// Create a new Ajv instance
const ajv = new Ajv({ 
  allErrors: true,
  strict: false  // Disable strict mode to allow additional properties
});

// Read the schema and data files
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'full-sample-data.json'), 'utf8'));

// Validate the data against the schema
const validate = ajv.compile(schema);
const valid = validate(data);

if (valid) {
  console.log('Validation successful! The data conforms to the schema.');
} else {
  console.log('Validation failed. Errors:');
  console.log(JSON.stringify(validate.errors, null, 2));
}

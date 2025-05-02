// Script to validate market_pulse_daily.sample.json against market_pulse_daily.schema.json
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const schemaPath = path.join(__dirname, '../market_pulse_json/market_pulse_daily.schema.json');
const samplePath = path.join(__dirname, '../market_pulse_json/market_pulse_daily.sample.json');

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const valid = validate(sample);

if (valid) {
  console.log('Sample JSON is valid according to the schema.');
} else {
  console.error('Sample JSON is INVALID. Errors:');
  console.error(validate.errors);
  process.exit(1);
}

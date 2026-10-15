import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const name of ["plugin", "mcp"]) {
  const response = await fetch(
    `https://agent-plugins.org/schemas/1.0.0/${name}.schema.json`,
  );
  if (!response.ok)
    throw new Error(`Official ${name} schema unavailable: ${response.status}`);
  const validate = ajv.compile(await response.json());
  if (!validate(JSON.parse(readFileSync(`plugin/${name}.json`, "utf8"))))
    throw new Error(JSON.stringify(validate.errors));
  console.log(
    `PASS: plugin/${name}.json validates against official Agent Plugins 1.0.0 schema`,
  );
}

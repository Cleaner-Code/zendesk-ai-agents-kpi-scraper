import ajv_package from "ajv";
const { Ajv } = ajv_package;
import fs from "fs";

const SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string" },
        username_env_variable_name: { type: "string" },
        password_env_variable_name: { type: "string" },
        spreadsheet_id: { type: "string" },
        sheet_name: { type: "string" },
        dates_begin_at_row: { type: "integer", minimum: 1 },
    },
    required: [
        "id",
        "username_env_variable_name",
        "password_env_variable_name",
        "spreadsheet_id",
        "sheet_name",
        "dates_begin_at_row",
    ],
    additionalProperties: false,
};

export function loadConfig(name) {
    try {
        const path = `./configurations/${name}.json`;
        if (fs.existsSync(path) === false) {
            throw new Error(
                `Configuration file '${path}' not found.`,
            );
        }
        const config = JSON.parse(fs.readFileSync(path, "utf-8"));
        validateConfig(config);
        return config;
    } catch (error) {
        throw new Error(
            `Failed to load configuration '${name}': ${error.message}`,
        );
    }
}

export function validateConfig(config) {
    const ajv = new Ajv();
    const valid = ajv.validate(SCHEMA, config);
    if (!valid) {
        console.error(
            `JSON looked like this: ${JSON.stringify(config, null, 2)}`,
        );
        throw new Error(
            `Invalid configuration: ${ajv.errorsText(ajv.errors)}`,
        );
    }
}

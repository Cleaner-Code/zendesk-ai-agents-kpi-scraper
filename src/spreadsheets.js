import { google } from "googleapis";
import fs from "fs";

const KEY_FILE_PATH = "credentials.json";

export async function createClient() {
    if (fs.existsSync(KEY_FILE_PATH) === false) {
        throw new Error(
            `Google API key file not found at path: ${KEY_FILE_PATH}`,
        );
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: client });
    return googleSheets;
}

export async function getSpreadsheet(config, googleSheets) {
    const response = await googleSheets.spreadsheets.values.get({
        spreadsheetId: config["spreadsheet_id"],
        range: `${config["sheet_name"]}!A1:ZZ`,
    });

    console.log("response", response);

    return response;
}

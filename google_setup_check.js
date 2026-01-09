import { google } from "googleapis";

// 1. CONFIGURATION
const SPREADSHEET_ID = "1Me4RqtMvlnovO-l8EGlMWU7SzR2eCd9_loJYJZaQkHI";
const KEY_FILE_PATH = "credentials.json"; // Your downloaded JSON key
const RANGE = "Usecases!A1"; // The tab name and cell

async function writeToSheet() {
    try {
        // 2. AUTHENTICATION
        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const client = await auth.getClient();

        // 3. CREATE SHEETS INSTANCE
        const googleSheets = google.sheets({ version: "v4", auth: client });

        // 4. WRITE DATA
        const request = {
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
            valueInputOption: "USER_ENTERED", // Parses data as if user typed it (numbers, dates, etc.)
            resource: {
                values: [
                    ["Hello World"], // Rows are arrays of columns
                ],
            },
        };

        const response = await googleSheets.spreadsheets.values.update(request);

        console.log(`Success! Updated cells: ${response.data.updatedCells}`);
    } catch (error) {
        console.error("Error writing to sheet:", error.message);
    }
}

writeToSheet();

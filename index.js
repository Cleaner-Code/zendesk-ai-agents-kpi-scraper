import { loadEnvFile } from "process";
import fs from "fs";

import { loadConfig } from "./src/config.js";
import { createClient, getSpreadsheet } from "./src/spreadsheets.js";
import {
    compileURLsForMissingCounts,
    findColumnsWithCounts,
    getRowBounds,
    validateValues,
} from "./src/analysis.js";

loadEnvFile(".env");

async function getCurrentTable(googleSheets, config, executionID) {
    const cacheFilePath =
        `./cache/spreadsheet_${config.id}_${executionID}.json`;
    if (fs.existsSync(cacheFilePath)) {
        console.log(
            `Loading spreadsheet data from cache file: ${cacheFilePath}`,
        );
        const cachedData = fs.readFileSync(cacheFilePath, "utf-8");
        return JSON.parse(cachedData);
    }

    const spreadsheet = await getSpreadsheet(config, googleSheets);
    fs.writeFileSync(
        cacheFilePath,
        JSON.stringify(spreadsheet, null, 2),
    );

    console.log(`Spreadsheet downloaded successfully.`);

    return spreadsheet;
}

function getCompiledURLs(
    config,
    spreadsheet,
    rowBounds,
    filteredColumns,
    executionID,
) {
    const cacheFilePath = `./cache/data_${config.id}_${executionID}.json`;
    if (fs.existsSync(cacheFilePath)) {
        console.log(
            `Loading URL data from cache file: ${cacheFilePath}`,
        );
        const cachedData = fs.readFileSync(cacheFilePath, "utf-8");
        return JSON.parse(cachedData);
    }

    const urls = compileURLsForMissingCounts(
        spreadsheet.data.values,
        rowBounds,
        filteredColumns,
    );
    fs.writeFileSync(
        cacheFilePath,
        JSON.stringify(urls, null, 2),
    );

    console.log(`Data compiled successfully.`);

    return urls;
}

async function main() {
    if (process.argv.length < 3) {
        console.error("Usage: node ./index.js <config name>");
        process.exit(1);
    }

    const configName = process.argv[2];
    if (configName) {
        console.log(`Loading configuration: ${configName}`);
    }

    let executionToContinue = null;
    if (process.argv.length > 3) {
        executionToContinue = process.argv[3];
    }

    const executionID = executionToContinue ||
        new Date().toISOString().replace(/[TZ:.-]/g, "");

    const config = loadConfig(configName);
    console.log(`Configuration '${config.id}' loaded successfully.`);

    const googleSheets = await createClient();
    const spreadsheet = await getCurrentTable(
        googleSheets,
        config,
        executionID,
    );

    validateValues(spreadsheet.data.values, config);
    const filteredColumns = findColumnsWithCounts(spreadsheet.data.values);
    console.log(
        `Found ${filteredColumns.length} columns with counts: `,
        filteredColumns,
    );
    const rowBounds = getRowBounds(spreadsheet.data.values, config);
    console.log(`Row bounds for date range: `, rowBounds);

    const urls = getCompiledURLs(
        config,
        spreadsheet,
        rowBounds,
        filteredColumns,
        executionID,
    );
    console.log(`Found ${urls.length} URLs to check`);
}

(async () => {
    try {
        await main();
    } catch (error) {
        console.error("Error:", error.message, error.stack);
        process.exit(1);
    }
})();

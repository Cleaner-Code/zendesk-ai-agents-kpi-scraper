import { loadEnvFile } from "process";
import fs from "fs";

import { loadConfig } from "./src/config.js";
import {
    createClient,
    getSpreadsheet,
    updateSpreadsheet,
} from "./src/spreadsheets.js";
import {
    compileURLsForMissingCounts,
    findColumnsWithCounts,
    getRowBounds,
    validateValues,
} from "./src/analysis.js";
import {
    closeBrowserSession,
    createBrowserSession,
    scrapeCountFromURL,
} from "./src/scraping.js";

loadEnvFile(".env");

const BATCH_SIZE = 8;

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

function saveData(config, executionID, data) {
    const cacheFilePath = `./cache/data_${config.id}_${executionID}.json`;
    fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2));
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
    saveData(config, executionID, urls);

    console.log(`Data compiled successfully.`);

    return urls;
}

function parseCounterText(text) {
    const match = text.match(/\d+/);
    if (match) {
        return parseInt(match[0]);
    }
    return 0;
}

async function scrapeBatch(batchSize, offset, page, urls, executionID, config) {
    for (let i = offset; i < Math.min(offset + batchSize, urls.length); i++) {
        const url = urls[i];

        if (url.count !== null) {
            console.log(
                `Skipping '${url.url}' because it already has a count: ${url.count}`,
            );
            continue;
        }

        const count = await scrapeCountFromURL(page, url.url, config);
        if (count === null) {
            console.log(`Failed to scrape count for '${url.url}'`);
            continue;
        }
        console.log(`Scraped count for '${url.url}': ${count}`);
        url.count = parseCounterText(count);
    }
    saveData(config, executionID, urls);
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

    const { browser, page } = await createBrowserSession(config);

    let totalTime = 0;
    const numberOfBatches = Math.ceil(urls.length / BATCH_SIZE);
    for (let i = 0; i < numberOfBatches; i++) {
        const startTime = Date.now();

        console.log(`Scraping batch ${i + 1} of ${numberOfBatches}...`);
        const offset = i * BATCH_SIZE;
        await scrapeBatch(BATCH_SIZE, offset, page, urls, executionID, config);

        const milliseconds = Date.now() - startTime;
        totalTime += milliseconds;
        console.log(
            `Scraping batch ${i + 1} of ${numberOfBatches} took ${
                milliseconds / 1000
            }s. Total time: ${totalTime / 1000}s.`,
        );
    }

    await updateSpreadsheet(config, googleSheets, urls);

    await closeBrowserSession(browser);
}

(async () => {
    try {
        await main();
    } catch (error) {
        console.error("Error:", error.message, error.stack);
        process.exit(1);
    }
})();

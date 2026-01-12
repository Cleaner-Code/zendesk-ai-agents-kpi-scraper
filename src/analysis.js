export function parseDate(dateString) {
    // parse with Regex, dates look like this: "Do., 02.01.2026", i.e. "<day of week>, <day>.<month>.<year>"
    const regex = /^(\w+)., (\d+)\.(\d+)\.(\d+)$/;
    const match = regex.exec(dateString);
    if (!match) {
        return null;
    }

    const [, , day, month, year] = match;
    return new Date(
        String(year).length === 2 ? `20${year}` : year,
        month - 1,
        day,
        0,
        0,
        0,
    );
}

export function getYesterdayDate() {
    // timezone independent end of yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    return yesterday;
}

export function validateValues(values, config) {
    const firstRow = config["dates_begin_at_row"];

    const value = values[firstRow - 1][0];
    const date = parseDate(value);
    if (date === null) {
        console.error(
            `Invalid date value at row ${firstRow}: '${value}'. Expected a valid date.`,
        );
        process.exit(1);
    }
}

export function isColumnWithCount(cellValue) {
    let url;
    try {
        url = new URL(cellValue);
    } catch (error) {
        return false;
    }

    return url.searchParams.has("startDate") && url.searchParams.has("endDate");
}

export function findColumnsWithCounts(values) {
    const firstRow = values[0];
    const filteredColumns = [];
    firstRow.forEach((cellValue, index) => {
        if (isColumnWithCount(cellValue)) {
            filteredColumns.push(index);
        }
    });

    return filteredColumns;
}

export function getRowBounds(values, config) {
    const yesterday = getYesterdayDate();

    const firstRow = config["dates_begin_at_row"];
    let lastRow;
    for (lastRow = firstRow - 1; lastRow < values.length; lastRow++) {
        const cellValue = values[lastRow][0];
        if (cellValue === undefined || cellValue === "") {
            break;
        }

        const date = parseDate(cellValue);
        if (date > yesterday) break;
    }

    return [firstRow, lastRow];
}

export function compileURLsForColumn(values, url, column, firstRow, lastRow) {
    const urls = [];

    for (let row = firstRow; row <= lastRow; row++) {
        const dateCellValue = values[row - 1][0];
        if ((dateCellValue || "").trim() === "") {
            console.log(`Empty date value at row ${row}. Skipping.`);
            continue;
        }
        const date = parseDate(dateCellValue);
        if (date === null) {
            console.error(
                `Invalid date value at row ${row}: '${dateCellValue}'. Expected a valid date. Skipping.`,
            );
            continue;
        }
        const formattedDate = date.toISOString().split("T")[0];

        const cellValue = values[row - 1][column];
        if ((cellValue || "").trim() !== "") {
            continue;
        }

        const cellURL = new URL(url);
        cellURL.searchParams.set("startDate", "");
        cellURL.searchParams.set("endDate", "");
        const href = cellURL.href
            .replace("startDate=", `startDate=${formattedDate}+00%3A00`)
            .replace("endDate=", `endDate=${formattedDate}+23%3A59`);

        urls.push({ url: href, row, column, count: null });
    }

    return urls;
}

export function compileURLsForMissingCounts(values, rowBounds, columns) {
    const firstRow = rowBounds[0];
    const lastRow = rowBounds[1];
    const urls = columns.map((column) => new URL(values[0][column]));

    return columns.map((column, index) =>
        compileURLsForColumn(values, urls[index], column, firstRow, lastRow)
    ).flat();
}

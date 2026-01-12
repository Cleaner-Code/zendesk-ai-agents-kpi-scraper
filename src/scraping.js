import { question } from "readline-sync";
import fs from "fs";

const supportURL = "https://juskys.zendesk.com/agent";
const gotoAIAgentsURL =
    "https://juskys.zendesk.com/admin/channels/ai-agents-automation/ai-agents?ref=product_tray";

const selector = '[data-tour-id="conversation__conversation-counter"]';

async function savePage(page, filename) {
    const pageHTML = await page.content();
    fs.writeFileSync(`html_pages/${filename}`, pageHTML);
}

async function screenshotPage(page, filename) {
    await page.screenshot({ path: `screenshots/${filename}.png` });
}

async function loadSession(config) {
    // Load cookies if they exist
    const filename = `cookies_${config.id}.json`;
    if (fs.existsSync(filename)) {
        const cookiesString = fs.readFileSync(filename, "utf-8");
        const cookies = JSON.parse(cookiesString);
        await page.context().addCookies(cookies);
        console.log("Loaded cookies from cookies.json");
    }
}

async function saveSession(config) {
    const filename = `cookies_${config.id}.json`;
    const cookies = await page.context().cookies();
    fs.writeFileSync(filename, JSON.stringify(cookies, null, 2));
    console.log("Saved cookies to cookies.json");
}

async function waitForRedirectsAndLoad(page) {
    await page.waitForTimeout(500);
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
}

async function isLoggedIn(page) {
    await page.goto(supportURL);
    await waitForRedirectsAndLoad(page);
    return await isLoginPage(page);
}

async function isLoginPage(page) {
    return await page.url().startsWith(supportURL);
}

async function login(config, page) {
    const email = process.env[config["username_env_variable_name"]];
    const password = process.env[config["password_env_variable_name"]];

    console.log(`Logging in with email: ${email}`);

    await screenshotPage(page, "login");

    await page.type('[name="email"]', email);
    await page.type('[name="password"]', password);
    await page.click('[type="submit"]');

    await waitForRedirectsAndLoad(page);
    await screenshotPage(page, "after_credentials");
    await savePage(page, "after_credentials.html");

    const twoFactorCode = question("2FA Code: ");
    await page.fill("input", twoFactorCode);
    await page.getByRole("button", { name: "Verify" }).click();

    await waitForRedirectsAndLoad(page);
    await screenshotPage(page, "after_2fa");

    await page.goto(gotoAIAgentsURL);
    await waitForRedirectsAndLoad(page);

    await screenshotPage(page, "after_login");
    await savePage(page, "after_login.html");
}

export async function createBrowserSession(config) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await loadSession(config, page);
    if (isLoggedIn(page)) {
        console.log("Already logged in via cookies.");
    } else {
        console.log("Not logged in, proceeding with login.");
        await login(config, page);
        await saveSession(config, page);
    }

    return { browser, page };
}

export async function scrapeCountFromURL(page, url) {
    await page.goto(url);
    await waitForRedirectsAndLoad(page);

    if (isLoginPage(page)) {
        console.log("We were logged out again. Cancelling.");
        return null;
    }

    await page.waitForSelector(selector);
    const counterEl = page.locator(selector, { timeout: 30000 });
    const count = await counterEl.textContent();
    return count;
}

export async function closeBrowserSession(browser) {
    await browser.close();
}
